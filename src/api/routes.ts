import { Router } from 'express';
import { statisticsController } from '../modules/statistics/statistics.controller.js';

export const router = Router();

// Specific league and season routes
router.get('/statistics/la-liga/2024', statisticsController.getStatistics);
router.get('/statistics/la-liga/2024/export', statisticsController.exportExcel);

// Dynamic league and season routes
router.get('/statistics/:leagueId/:season', statisticsController.getStatistics);
router.get('/statistics/:leagueId/:season/export', statisticsController.exportExcel);
