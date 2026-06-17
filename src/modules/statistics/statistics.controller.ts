import { Request, Response } from 'express';
import { statisticsService } from './statistics.service.js';
import { exportService } from '../export/export.service.js';
import { logger } from '../../utils/logger.js';

export class StatisticsController {
  async getStatistics(req: Request, res: Response) {
    try {
      const leagueId = parseInt(req.params.leagueId || '140');
      const season = parseInt(req.params.season || '2024');
      
      // If the user requested an excel file format
      if (req.query.format === 'excel') {
        const buffer = await exportService.generateExcelBuffer(leagueId, season);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="la-liga-stats-${season}.xlsx"`);
        return res.send(buffer);
      }

      // If a browser is accessing this directly, redirect to the beautiful frontend dashboard
      if (req.accepts(['json', 'html']) === 'html') {
        return res.redirect(`/?leagueId=${leagueId}&season=${season}`);
      }

      const stats = await statisticsService.getStatistics(leagueId, season);
      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Error fetching statistics');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async exportExcel(req: Request, res: Response) {
    try {
      const leagueId = parseInt(req.params.leagueId || '140');
      const season = parseInt(req.params.season || '2024');
      
      const buffer = await exportService.generateExcelBuffer(leagueId, season);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="la-liga-stats-${season}.xlsx"`);
      
      res.send(buffer);
    } catch (error) {
      logger.error({ error }, 'Error generating Excel export');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export const statisticsController = new StatisticsController();
