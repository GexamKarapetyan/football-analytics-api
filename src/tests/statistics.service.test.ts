import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/env.js', () => ({
  env: { NODE_ENV: 'test', API_FOOTBALL_KEY: 'test', DATABASE_URL: 'postgres://localhost/test' }
}));

import { StatisticsService } from '../modules/statistics/statistics.service.js';
import { redisClient } from '../infrastructure/redis.client.js';
import { prisma } from '../prisma/client.js';

vi.mock('../infrastructure/redis.client.js', () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
  }
}));

vi.mock('../prisma/client.js', () => ({
  prisma: {
    teamSeasonStats: {
      findMany: vi.fn()
    }
  }
}));

describe('StatisticsService', () => {
  let service: StatisticsService;

  beforeEach(() => {
    service = new StatisticsService();
    vi.clearAllMocks();
  });

  it('should return cached data if available', async () => {
    const cachedData = {
      averageYellowCards: [{ team: 'Barcelona', matchesPlayed: 10, averageYellowCards: 2.5 }],
      totalCorners: [{ team: 'Real Madrid', matchesPlayed: 10, corners: 50 }]
    };
    
    vi.mocked(redisClient.get).mockResolvedValue(cachedData);

    const result = await service.getStatistics(140, 2024);
    
    expect(redisClient.get).toHaveBeenCalledWith('stats:140:2024');
    expect(result).toEqual(cachedData);
    expect(prisma.teamSeasonStats.findMany).not.toHaveBeenCalled();
  });

  it('should fetch from DB if cache misses and correctly sort the results', async () => {
    vi.mocked(redisClient.get).mockResolvedValue(null);
    
    const mockDbData = [
      {
        id: 1, teamId: 1, teamName: 'Barcelona', leagueId: 140, season: 2024,
        matchesPlayed: 10, totalYellowCards: 25, averageYellowCards: 2.5, totalCorners: 40, updatedAt: new Date()
      },
      {
        id: 2, teamId: 2, teamName: 'Real Madrid', leagueId: 140, season: 2024,
        matchesPlayed: 10, totalYellowCards: 20, averageYellowCards: 2.0, totalCorners: 50, updatedAt: new Date()
      }
    ];
    
    vi.mocked(prisma.teamSeasonStats.findMany).mockResolvedValue(mockDbData);

    const result = await service.getStatistics(140, 2024);
    
    expect(redisClient.get).toHaveBeenCalledWith('stats:140:2024');
    expect(prisma.teamSeasonStats.findMany).toHaveBeenCalledWith({ where: { leagueId: 140, season: 2024 } });
    
    // Check Sorting
    expect(result.averageYellowCards[0].team).toBe('Barcelona');
    expect(result.totalCorners[0].team).toBe('Real Madrid');

    // Check caching
    expect(redisClient.set).toHaveBeenCalledWith('stats:140:2024', result, 86400);
  });
});
