import ExcelJS from 'exceljs';
import { statisticsService } from '../statistics/statistics.service.js';

export class ExportService {
  async generateExcelBuffer(leagueId: number, season: number): Promise<Buffer> {
    const stats = await statisticsService.getStatistics(leagueId, season);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'La Liga Stats System';
    
    // Sheet 1: Yellow Cards
    const yellowCardsSheet = workbook.addWorksheet('Yellow Cards');
    yellowCardsSheet.columns = [
      { header: 'Rank', key: 'rank', width: 10 },
      { header: 'Team', key: 'team', width: 30 },
      { header: 'Matches Played', key: 'matchesPlayed', width: 15 },
      { header: 'Avg Yellow Cards', key: 'averageYellowCards', width: 20 },
    ];
    
    stats.averageYellowCards.forEach((stat: any, index: number) => {
      yellowCardsSheet.addRow({
        rank: index + 1,
        team: stat.team,
        matchesPlayed: stat.matchesPlayed,
        averageYellowCards: stat.averageYellowCards,
      });
    });

    // Sheet 2: Corners
    const cornersSheet = workbook.addWorksheet('Corners');
    cornersSheet.columns = [
      { header: 'Rank', key: 'rank', width: 10 },
      { header: 'Team', key: 'team', width: 30 },
      { header: 'Matches Played', key: 'matchesPlayed', width: 15 },
      { header: 'Total Corners', key: 'corners', width: 15 },
    ];

    stats.totalCorners.forEach((stat: any, index: number) => {
      cornersSheet.addRow({
        rank: index + 1,
        team: stat.team,
        matchesPlayed: stat.matchesPlayed,
        corners: stat.corners,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}

export const exportService = new ExportService();
