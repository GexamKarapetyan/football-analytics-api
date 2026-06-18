import { Router } from 'express';
import { statisticsController } from '../modules/statistics/statistics.controller.js';

export const router = Router();


// Dynamic league and season routes
// Example usage: /statistics/la-liga/2024 or /statistics/140/2024
// (You can pass either the string name or the numeric API-Football league ID)
router.get('/statistics/:leagueId/:season', statisticsController.getStatistics);
router.get('/statistics/:leagueId/:season/export', statisticsController.exportExcel);
