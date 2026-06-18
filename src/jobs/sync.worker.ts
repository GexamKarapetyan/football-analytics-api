import { prisma } from '../prisma/client.js';
import { apiFootballClient } from '../infrastructure/api-football.client.js';
import { redisClient } from '../infrastructure/redis.client.js';
import { logger } from '../utils/logger.js';

export class SyncWorker {
  async runSync(leagueId: number, season: number) {
    logger.info({ leagueId, season }, 'Starting synchronization process');

    // 1. Fetch all fixtures
    const allFixtures = await apiFootballClient.getFixtures(leagueId, season);

    // 2. Filter for finished matches (FT)
    const finishedFixtures = allFixtures.filter(f => f.fixture.status.short === 'FT');
    logger.info(`Found ${finishedFixtures.length} finished fixtures`);

    // 3. Find already processed fixtures
    const processed = await prisma.processedFixture.findMany({
      where: { leagueId, season },
      select: { fixtureId: true }
    });
    const processedSet = new Set(processed.map(p => p.fixtureId));

    // 4. Filter for new fixtures
    const newFixtures = finishedFixtures.filter(f => !processedSet.has(f.fixture.id));
    logger.info(`Found ${newFixtures.length} new fixtures to process`);

    if (newFixtures.length === 0) {
      logger.info('No new fixtures to process. Sync completed.');
      return { status: 'success', message: 'No new fixtures to process', newProcessed: 0 };
    }

    // Process statistics
    let processedCount = 0;

    // Fetch current DB stats first for performance
    // Aggregate locally to avoid race conditions

    const teamStatsMap = new Map<number, any>();
    const currentStats = await prisma.teamSeasonStats.findMany({
      where: { leagueId, season }
    });

    for (const stat of currentStats) {
      teamStatsMap.set(stat.teamId, { ...stat });
    }

    const promises = newFixtures.map(async (fixture) => {
      try {
        const stats = await apiFootballClient.getFixtureStatistics(fixture.fixture.id);

        if (!stats || stats.length === 0) {
          logger.warn({ fixtureId: fixture.fixture.id }, 'No statistics found for fixture');
          return null;
        }

        // Each fixture returns stats for both teams
        return {
          fixtureId: fixture.fixture.id,
          stats
        };
      } catch (error) {
        logger.error({ fixtureId: fixture.fixture.id, error }, 'Failed to fetch statistics for fixture');
        return null;
      }
    });

    // Wait for all stats to be fetched (bottleneck handles concurrency)
    const results = await Promise.all(promises);

    for (const result of results) {
      if (!result) continue;

      const { fixtureId, stats } = result;

      for (const teamStat of stats) {
        const teamId = teamStat.team.id;
        const teamName = teamStat.team.name;

        let yellowCards = 0;
        let corners = 0;

        for (const statItem of teamStat.statistics) {
          if (statItem.type === 'Yellow Cards') {
            yellowCards = parseInt(statItem.value) || 0;
          }
          if (statItem.type === 'Corner Kicks') {
            corners = parseInt(statItem.value) || 0;
          }
        }

        const current = teamStatsMap.get(teamId) || {
          teamId,
          teamName,
          leagueId,
          season,
          matchesPlayed: 0,
          totalYellowCards: 0,
          totalCorners: 0
        };

        current.matchesPlayed += 1;
        current.totalYellowCards += yellowCards;
        current.totalCorners += corners;
        current.averageYellowCards = current.matchesPlayed > 0
          ? Number((current.totalYellowCards / current.matchesPlayed).toFixed(2))
          : 0;

        teamStatsMap.set(teamId, current);
      }

      processedCount++;

      await prisma.processedFixture.create({
        data: {
          fixtureId,
          leagueId,
          season
        }
      });
    }

    for (const [_, stats] of teamStatsMap.entries()) {
      await prisma.teamSeasonStats.upsert({
        where: { 
          teamId_season: {
            teamId: stats.teamId,
            season: stats.season
          }
        },
        update: {
          matchesPlayed: stats.matchesPlayed,
          totalYellowCards: stats.totalYellowCards,
          averageYellowCards: stats.averageYellowCards,
          totalCorners: stats.totalCorners
        },
        create: {
          teamId: stats.teamId,
          teamName: stats.teamName,
          leagueId: stats.leagueId,
          season: stats.season,
          matchesPlayed: stats.matchesPlayed,
          totalYellowCards: stats.totalYellowCards,
          averageYellowCards: stats.averageYellowCards,
          totalCorners: stats.totalCorners
        }
      });
    }

    const cacheKey = `stats:${leagueId}:${season}`;
    await redisClient.delete(cacheKey);

    logger.info(`Sync completed. Processed ${processedCount} new fixtures.`);

    return {
      status: 'success',
      message: 'Sync completed',
      newProcessed: processedCount
    };
  }
}

export const syncWorker = new SyncWorker();
