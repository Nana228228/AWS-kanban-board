import { getBusinessDays, calculateIdealLine, calculateActualLine, calculateSprintBurndown } from './sprintBurndown';
import { BurndownDataResponse } from '../types';

describe('getBusinessDays', () => {
  it('should return only weekdays (Mon-Fri)', () => {
    // 2024-01-15 is Monday, 2024-01-19 is Friday
    const days = getBusinessDays('2024-01-15', '2024-01-19');
    expect(days).toEqual(['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19']);
  });

  it('should skip weekends', () => {
    // 2024-01-15 (Mon) to 2024-01-22 (Mon) - includes a weekend
    const days = getBusinessDays('2024-01-15', '2024-01-22');
    expect(days).toEqual([
      '2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19',
      '2024-01-22',
    ]);
    expect(days).not.toContain('2024-01-20'); // Saturday
    expect(days).not.toContain('2024-01-21'); // Sunday
  });

  it('should return empty array if start is after end', () => {
    const days = getBusinessDays('2024-01-20', '2024-01-15');
    expect(days).toEqual([]);
  });

  it('should handle a single day (weekday)', () => {
    const days = getBusinessDays('2024-01-15', '2024-01-15');
    expect(days).toEqual(['2024-01-15']);
  });

  it('should handle a single day (weekend)', () => {
    const days = getBusinessDays('2024-01-20', '2024-01-20');
    expect(days).toEqual([]);
  });
});

describe('calculateIdealLine', () => {
  it('should create linear decrement from total to 0', () => {
    const line = calculateIdealLine(100, 5);
    expect(line).toEqual([100, 80, 60, 40, 20, 0]);
  });

  it('should handle 0 business days', () => {
    const line = calculateIdealLine(100, 0);
    expect(line).toEqual([]);
  });

  it('should handle 1 business day', () => {
    const line = calculateIdealLine(10, 1);
    expect(line).toEqual([10, 0]);
  });

  it('should handle 0 story points', () => {
    const line = calculateIdealLine(0, 5);
    expect(line).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('calculateActualLine', () => {
  it('should calculate remaining SP based on completedPerDay', () => {
    const businessDays = ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19'];
    const completedPerDay = {
      '2024-01-15': 5,
      '2024-01-16': 10,
      '2024-01-17': 0,
      '2024-01-18': 15,
      '2024-01-19': 5,
    };

    const line = calculateActualLine(100, businessDays, completedPerDay);
    expect(line).toEqual([100, 95, 85, 85, 70, 65]);
  });

  it('should handle missing days in completedPerDay', () => {
    const businessDays = ['2024-01-15', '2024-01-16', '2024-01-17'];
    const completedPerDay = {
      '2024-01-15': 10,
    };

    const line = calculateActualLine(50, businessDays, completedPerDay);
    expect(line).toEqual([50, 40, 40, 40]);
  });

  it('should handle empty completedPerDay', () => {
    const businessDays = ['2024-01-15', '2024-01-16'];
    const completedPerDay = {};

    const line = calculateActualLine(30, businessDays, completedPerDay);
    expect(line).toEqual([30, 30, 30]);
  });
});

describe('calculateSprintBurndown', () => {
  it('should calculate complete sprint burndown', () => {
    const data: BurndownDataResponse = {
      boardId: 1,
      title: 'Sprint 1',
      startDate: '2024-01-15',
      endDate: '2024-01-19',
      totalStoryPoints: 50,
      remainingStoryPoints: 20,
      cards: [],
      completedPerDay: {
        '2024-01-15': 10,
        '2024-01-16': 5,
        '2024-01-17': 10,
        '2024-01-18': 5,
        '2024-01-19': 0,
      },
    };

    const result = calculateSprintBurndown(data);

    expect(result.totalStoryPoints).toBe(50);
    expect(result.businessDays).toHaveLength(5);
    expect(result.idealLine).toHaveLength(6); // businessDays + 1 (start point)
    expect(result.actualLine).toHaveLength(6); // businessDays + 1 (start point)
    expect(result.idealLine[0]).toBe(50);
    expect(result.idealLine[5]).toBe(0);
    expect(result.actualLine[0]).toBe(50);
  });
});
