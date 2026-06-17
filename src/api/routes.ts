import { Router } from 'express';
import { statisticsController } from '../modules/statistics/statistics.controller.js';

export const router = Router();

// To keep the routing structure clean as requested:
// For specific league and season: /api/v1/statistics/la-liga/2024
// Note: Hardcoding la-liga/2024 here for simplicity, or make it dynamic
router.get('/statistics/la-liga/2024', statisticsController.getStatistics);
router.get('/statistics/la-liga/2024/export', statisticsController.exportExcel);

// Fallback for dynamic league and season
router.get('/statistics/:leagueId/:season', statisticsController.getStatistics);
router.get('/statistics/:leagueId/:season/export', statisticsController.exportExcel);
