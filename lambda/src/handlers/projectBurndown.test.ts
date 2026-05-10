import { calculateProjectBurndown } from './projectBurndown';
import { ProjectResponse, BurndownDataResponse } from '../types';

describe('calculateProjectBurndown', () => {
  it('should aggregate burndown data across multiple sprints', () => {
    const project: ProjectResponse = {
      id: 1,
      name: 'My Project',
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
      boards: [
        { id: 1, projectId: 1, title: 'Sprint 1', startDate: '2024-01-15', endDate: '2024-01-26', durationDays: 12, createdAt: '', updatedAt: '' },
        { id: 2, projectId: 1, title: 'Sprint 2', startDate: '2024-01-29', endDate: '2024-02-09', durationDays: 12, createdAt: '', updatedAt: '' },
      ],
    };

    const burndownDataList: BurndownDataResponse[] = [
      {
        boardId: 1,
        title: 'Sprint 1',
        startDate: '2024-01-15',
        endDate: '2024-01-26',
        totalStoryPoints: 50,
        remainingStoryPoints: 10,
        cards: [],
        completedPerDay: {},
      },
      {
        boardId: 2,
        title: 'Sprint 2',
        startDate: '2024-01-29',
        endDate: '2024-02-09',
        totalStoryPoints: 60,
        remainingStoryPoints: 30,
        cards: [],
        completedPerDay: {},
      },
    ];

    const result = calculateProjectBurndown(project, burndownDataList);

    expect(result.totalStoryPoints).toBe(110);
    expect(result.sprints).toHaveLength(2);

    expect(result.sprints[0].sprintId).toBe(1);
    expect(result.sprints[0].sprintTitle).toBe('Sprint 1');
    expect(result.sprints[0].completedStoryPoints).toBe(40);
    expect(result.sprints[0].remainingStoryPoints).toBe(10);

    expect(result.sprints[1].sprintId).toBe(2);
    expect(result.sprints[1].sprintTitle).toBe('Sprint 2');
    expect(result.sprints[1].completedStoryPoints).toBe(30);
    expect(result.sprints[1].remainingStoryPoints).toBe(30);
  });

  it('should handle project with no sprints', () => {
    const project: ProjectResponse = {
      id: 1,
      name: 'Empty Project',
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
      boards: [],
    };

    const result = calculateProjectBurndown(project, []);

    expect(result.totalStoryPoints).toBe(0);
    expect(result.sprints).toHaveLength(0);
  });

  it('should handle sprint with all cards completed', () => {
    const project: ProjectResponse = {
      id: 1,
      name: 'Project',
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
      boards: [
        { id: 1, projectId: 1, title: 'Sprint 1', startDate: '2024-01-15', endDate: '2024-01-26', durationDays: 12, createdAt: '', updatedAt: '' },
      ],
    };

    const burndownDataList: BurndownDataResponse[] = [
      {
        boardId: 1,
        title: 'Sprint 1',
        startDate: '2024-01-15',
        endDate: '2024-01-26',
        totalStoryPoints: 30,
        remainingStoryPoints: 0,
        cards: [],
        completedPerDay: {},
      },
    ];

    const result = calculateProjectBurndown(project, burndownDataList);

    expect(result.totalStoryPoints).toBe(30);
    expect(result.sprints[0].completedStoryPoints).toBe(30);
    expect(result.sprints[0].remainingStoryPoints).toBe(0);
  });
});
