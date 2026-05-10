import { calculateBoardStatistics } from './boardReport';
import { BoardResponse } from '../types';

describe('calculateBoardStatistics', () => {
  it('should calculate correct statistics for a board with cards', () => {
    const board: BoardResponse = {
      id: 1,
      projectId: 1,
      title: 'Sprint 1',
      startDate: '2024-01-15',
      endDate: '2024-01-26',
      durationDays: 12,
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
      columns: [
        {
          id: 1,
          boardId: 1,
          title: 'To Do',
          position: 0,
          isDoneColumn: false,
          createdAt: '2024-01-01T00:00:00',
          updatedAt: '2024-01-01T00:00:00',
          cards: [
            { id: 1, columnId: 1, title: 'Task 1', storyPoints: 3, position: 0, createdAt: '', updatedAt: '' },
            { id: 2, columnId: 1, title: 'Task 2', storyPoints: 5, position: 1, createdAt: '', updatedAt: '' },
          ],
        },
        {
          id: 2,
          boardId: 1,
          title: 'Done',
          position: 1,
          isDoneColumn: true,
          createdAt: '2024-01-01T00:00:00',
          updatedAt: '2024-01-01T00:00:00',
          cards: [
            { id: 3, columnId: 2, title: 'Task 3', storyPoints: 2, position: 0, createdAt: '', updatedAt: '' },
          ],
        },
      ],
    };

    const result = calculateBoardStatistics(board);

    expect(result.totalCards).toBe(3);
    expect(result.columns).toHaveLength(2);

    expect(result.columns[0].columnId).toBe(1);
    expect(result.columns[0].columnTitle).toBe('To Do');
    expect(result.columns[0].cardCount).toBe(2);
    expect(result.columns[0].percentage).toBeCloseTo(66.67, 1);
    expect(result.columns[0].storyPointsSum).toBe(8);

    expect(result.columns[1].columnId).toBe(2);
    expect(result.columns[1].columnTitle).toBe('Done');
    expect(result.columns[1].cardCount).toBe(1);
    expect(result.columns[1].percentage).toBeCloseTo(33.33, 1);
    expect(result.columns[1].storyPointsSum).toBe(2);
  });

  it('should handle a board with no cards', () => {
    const board: BoardResponse = {
      id: 1,
      projectId: 1,
      title: 'Empty Sprint',
      startDate: '2024-01-15',
      endDate: '2024-01-26',
      durationDays: 12,
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
      columns: [
        {
          id: 1,
          boardId: 1,
          title: 'To Do',
          position: 0,
          isDoneColumn: false,
          createdAt: '2024-01-01T00:00:00',
          updatedAt: '2024-01-01T00:00:00',
          cards: [],
        },
      ],
    };

    const result = calculateBoardStatistics(board);

    expect(result.totalCards).toBe(0);
    expect(result.columns[0].cardCount).toBe(0);
    expect(result.columns[0].percentage).toBe(0);
    expect(result.columns[0].storyPointsSum).toBe(0);
  });

  it('should handle a board with no columns', () => {
    const board: BoardResponse = {
      id: 1,
      projectId: 1,
      title: 'No Columns',
      startDate: '2024-01-15',
      endDate: '2024-01-26',
      durationDays: 12,
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
      columns: [],
    };

    const result = calculateBoardStatistics(board);

    expect(result.totalCards).toBe(0);
    expect(result.columns).toHaveLength(0);
  });
});
