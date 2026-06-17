import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class ApiFootballClient {
  private axiosInstance: AxiosInstance;
  private limiter: Bottleneck;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: env.API_FOOTBALL_BASE_URL,
      headers: {
        'x-apisports-key': env.API_FOOTBALL_KEY,
      },
      timeout: 15000,
    });

    // Max 5-10 concurrent requests, minTime between requests to respect rate limits
    this.limiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 200, // 5 requests per second
    });

    // Setup retries on failure (3 times, exponential backoff)
    this.limiter.on('failed', async (error, jobInfo) => {
      const id = jobInfo.options.id;
      logger.warn({ id, retryCount: jobInfo.retryCount, error: error.message }, 'API request failed');
      
      if (jobInfo.retryCount < 3) {
        return Math.pow(2, jobInfo.retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      }
    });
  }

  private async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    return this.limiter.schedule(async () => {
      logger.debug({ url, params }, 'Fetching data from API-Football');
      const response = await this.axiosInstance.get(url, { params });
      
      if (response.data?.errors && Object.keys(response.data.errors).length > 0) {
        throw new Error(`API Error: ${JSON.stringify(response.data.errors)}`);
      }
      
      return response.data.response;
    });
  }

  async getFixtures(leagueId: number, season: number) {
    return this.get<any[]>('/fixtures', { league: leagueId, season });
  }

  async getFixtureStatistics(fixtureId: number) {
    return this.get<any[]>('/fixtures/statistics', { fixture: fixtureId });
  }
}

export const apiFootballClient = new ApiFootballClient();
