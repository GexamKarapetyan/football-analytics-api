import { prisma } from '../../prisma/client.js';
import { redisClient } from '../../infrastructure/redis.client.js';
import { logger } from '../../utils/logger.js';

export class StatisticsService {
  async getStatistics(leagueId: number, season: number) {
    const cacheKey = `stats:${leagueId}:${season}`;
    
    // 1. Try to get from Redis Cache
    try {
      const cached = await redisClient.get<any>(cacheKey);
      if (cached) {
        logger.info({ cacheKey }, 'Cache hit for statistics');
        return cached;
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to read from Redis cache');
    }

    logger.info({ cacheKey }, 'Cache miss for statistics, fetching from DB');
    
    // 2. Fetch from DB
    let stats = await prisma.teamSeasonStats.findMany({
      where: { leagueId, season }
    });

    if (stats.length === 0) {
      logger.info({ leagueId, season }, 'No data found in DB, triggering sync from API...');
      const { syncWorker } = await import('../../jobs/sync.worker.js');
      await syncWorker.runSync(leagueId, season);
      
      // Fetch again after sync
      stats = await prisma.teamSeasonStats.findMany({
        where: { leagueId, season }
      });
      
      if (stats.length === 0) {
        return { averageYellowCards: [], totalCorners: [] };
      }
    }

    // Sort accordingly
    const yellowCardsOutput = [...stats]
      .sort((a, b) => b.averageYellowCards - a.averageYellowCards)
      .map(team => ({
        team: team.teamName,
        matchesPlayed: team.matchesPlayed,
        averageYellowCards: team.averageYellowCards
      }));

    const cornersOutput = [...stats]
      .sort((a, b) => b.totalCorners - a.totalCorners)
      .map(team => ({
        team: team.teamName,
        matchesPlayed: team.matchesPlayed,
        corners: team.totalCorners
      }));

    const finalOutput = {
      averageYellowCards: yellowCardsOutput,
      totalCorners: cornersOutput
    };

    // 3. Save to Cache (24h TTL)
    try {
      await redisClient.set(cacheKey, finalOutput, 86400);
      logger.info({ cacheKey }, 'Saved statistics to cache');
    } catch (error) {
      logger.warn({ error }, 'Failed to write to Redis cache');
    }

    return finalOutput;
  }
}

export const statisticsService = new StatisticsService();
