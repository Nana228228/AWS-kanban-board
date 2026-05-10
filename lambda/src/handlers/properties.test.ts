import * as fc from 'fast-check';
import { calculateBoardStatistics } from './boardReport';
import { getBusinessDays, calculateIdealLine, calculateSprintBurndown } from './sprintBurndown';
import { calculateProjectBurndown } from './projectBurndown';
import { BoardResponse, ColumnResponse, CardResponse, BurndownDataResponse, ProjectResponse } from '../types';

/**
 * Property-Based Tests for Lambda Report Functions
 * Feature: kanban-board
 */

// ===== Generators =====

const cardArb = (columnId: number): fc.Arbitrary<CardResponse> =>
  fc.record({
    id: fc.nat({ max: 10000 }),
    columnId: fc.constant(columnId),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    storyPoints: fc.nat({ max: 50 }),
    position: fc.nat({ max: 100 }),
    completedAt: fc.option(fc.constant('2024-01-20T10:00:00'), { nil: undefined }),
    createdAt: fc.constant('2024-01-01T00:00:00'),
    updatedAt: fc.constant('2024-01-01T00:00:00'),
  });

const columnWithCardsArb = (columnId: number): fc.Arbitrary<ColumnResponse> =>
  fc.record({
    id: fc.constant(columnId),
    boardId: fc.constant(1),
    title: fc.string({ minLength: 1, maxLength: 30 }),
    position: fc.constant(columnId),
    isDoneColumn: fc.boolean(),
    createdAt: fc.constant('2024-01-01T00:00:00'),
    updatedAt: fc.constant('2024-01-01T00:00:00'),
    cards: fc.array(cardArb(columnId), { minLength: 0, maxLength: 10 }),
  });

const boardWithColumnsArb: fc.Arbitrary<BoardResponse> = fc
  .integer({ min: 1, max: 5 })
  .chain((numColumns) => {
    const columnArbs = Array.from({ length: numColumns }, (_, i) => columnWithCardsArb(i + 1));
    return fc.tuple(...(columnArbs as [fc.Arbitrary<ColumnResponse>, ...fc.Arbitrary<ColumnResponse>[]])).map((columns) => ({
      id: 1,
      projectId: 1,
      title: 'Test Board',
      startDate: '2024-01-15',
      endDate: '2024-01-26',
      durationDays: 12,
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
      columns,
    }));
  });

// ===== Property 8: Corretude do cálculo de estatísticas do Quadro =====

describe('Property 8: Corretude do cálculo de estatísticas do Quadro', () => {
  /**
   * **Validates: Requirements 7.2**
   * Feature: kanban-board, Property 8: Corretude do cálculo de estatísticas do Quadro
   */
  it('sum of cardCount equals totalCards', () => {
    fc.assert(
      fc.property(boardWithColumnsArb, (board) => {
        const result = calculateBoardStatistics(board);
        const sumCardCount = result.columns.reduce((sum, col) => sum + col.cardCount, 0);
        expect(sumCardCount).toBe(result.totalCards);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.2**
   * Feature: kanban-board, Property 8: Corretude do cálculo de estatísticas do Quadro
   */
  it('sum of percentages is approximately 100% when there are cards', () => {
    fc.assert(
      fc.property(boardWithColumnsArb, (board) => {
        const result = calculateBoardStatistics(board);
        if (result.totalCards > 0) {
          const sumPercentages = result.columns.reduce((sum, col) => sum + col.percentage, 0);
          // Tolerance for rounding: each column can be off by 0.01, so total tolerance = numColumns * 0.01
          expect(sumPercentages).toBeCloseTo(100, 0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.2**
   * Feature: kanban-board, Property 8: Corretude do cálculo de estatísticas do Quadro
   */
  it('storyPointsSum is correct per column', () => {
    fc.assert(
      fc.property(boardWithColumnsArb, (board) => {
        const result = calculateBoardStatistics(board);
        const columns = board.columns || [];

        for (let i = 0; i < columns.length; i++) {
          const expectedSP = (columns[i].cards || []).reduce(
            (sum, card) => sum + (card.storyPoints || 0),
            0
          );
          expect(result.columns[i].storyPointsSum).toBe(expectedSP);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ===== Property 9: Burndown de Sprint usa dias úteis para linha ideal =====

/**
 * Generator for sprint date ranges (1-30 day duration).
 * Produces start/end dates as YYYY-MM-DD strings.
 */
const sprintDatesArb: fc.Arbitrary<{ startDate: string; endDate: string; totalSP: number }> =
  fc.record({
    // Use a year/month/day approach to generate valid dates
    year: fc.constant(2024),
    month: fc.integer({ min: 1, max: 11 }),
    day: fc.integer({ min: 1, max: 20 }),
    duration: fc.integer({ min: 1, max: 30 }),
    totalSP: fc.integer({ min: 0, max: 200 }),
  }).map(({ year, month, day, duration, totalSP }) => {
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration - 1);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalSP,
    };
  });

describe('Property 9: Burndown de Sprint usa dias úteis para linha ideal', () => {
  /**
   * **Validates: Requirements 7.3**
   * Feature: kanban-board, Property 9: Burndown de Sprint usa dias úteis para linha ideal
   */
  it('only business days (Mon-Fri) are in the list', () => {
    fc.assert(
      fc.property(sprintDatesArb, ({ startDate, endDate }) => {
        const businessDays = getBusinessDays(startDate, endDate);

        for (const dayStr of businessDays) {
          const date = new Date(dayStr + 'T00:00:00');
          const dayOfWeek = date.getDay();
          // 0 = Sunday, 6 = Saturday
          expect(dayOfWeek).not.toBe(0);
          expect(dayOfWeek).not.toBe(6);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   * Feature: kanban-board, Property 9: Burndown de Sprint usa dias úteis para linha ideal
   */
  it('ideal line starts at total SP and ends at 0', () => {
    fc.assert(
      fc.property(sprintDatesArb, ({ startDate, endDate, totalSP }) => {
        const businessDays = getBusinessDays(startDate, endDate);
        if (businessDays.length === 0) return; // Skip if no business days

        const idealLine = calculateIdealLine(totalSP, businessDays.length);

        // Starts at total SP
        expect(idealLine[0]).toBeCloseTo(totalSP, 5);
        // Ends at 0
        expect(idealLine[idealLine.length - 1]).toBeCloseTo(0, 5);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   * Feature: kanban-board, Property 9: Burndown de Sprint usa dias úteis para linha ideal
   */
  it('ideal line has businessDays.length + 1 entries', () => {
    fc.assert(
      fc.property(sprintDatesArb, ({ startDate, endDate, totalSP }) => {
        const businessDays = getBusinessDays(startDate, endDate);
        if (businessDays.length === 0) return;

        const idealLine = calculateIdealLine(totalSP, businessDays.length);
        expect(idealLine.length).toBe(businessDays.length + 1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   * Feature: kanban-board, Property 9: Burndown de Sprint usa dias úteis para linha ideal
   */
  it('ideal line decrements linearly', () => {
    fc.assert(
      fc.property(sprintDatesArb, ({ startDate, endDate, totalSP }) => {
        const businessDays = getBusinessDays(startDate, endDate);
        if (businessDays.length === 0 || totalSP === 0) return;

        const idealLine = calculateIdealLine(totalSP, businessDays.length);
        const expectedDecrement = totalSP / businessDays.length;

        // Each step should decrement by the same amount
        for (let i = 1; i < idealLine.length; i++) {
          const actualDecrement = idealLine[i - 1] - idealLine[i];
          expect(actualDecrement).toBeCloseTo(expectedDecrement, 5);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ===== Property 10: Agregação correta do Burndown de Projeto =====

/**
 * Generator for project burndown data: 1-5 sprints with random totalSP and remainingSP.
 */
const projectBurndownArb: fc.Arbitrary<{
  project: ProjectResponse;
  burndownDataList: BurndownDataResponse[];
}> = fc
  .integer({ min: 1, max: 5 })
  .chain((numSprints) => {
    const sprintArbs = Array.from({ length: numSprints }, (_, i) =>
      fc.record({
        totalSP: fc.integer({ min: 0, max: 100 }),
        remainingSP: fc.integer({ min: 0, max: 100 }),
      }).map(({ totalSP, remainingSP }) => ({
        // Ensure remainingSP <= totalSP
        totalSP,
        remainingSP: Math.min(remainingSP, totalSP),
        sprintId: i + 1,
      }))
    );

    return fc.tuple(...(sprintArbs as [fc.Arbitrary<{ totalSP: number; remainingSP: number; sprintId: number }>, ...fc.Arbitrary<{ totalSP: number; remainingSP: number; sprintId: number }>[]])).map((sprints) => {
      const project: ProjectResponse = {
        id: 1,
        name: 'Test Project',
        createdAt: '2024-01-01T00:00:00',
        updatedAt: '2024-01-01T00:00:00',
        boards: sprints.map((s) => ({
          id: s.sprintId,
          projectId: 1,
          title: `Sprint ${s.sprintId}`,
          startDate: '2024-01-01',
          endDate: '2024-01-14',
          durationDays: 14,
          createdAt: '2024-01-01T00:00:00',
          updatedAt: '2024-01-01T00:00:00',
        })),
      };

      const burndownDataList: BurndownDataResponse[] = sprints.map((s) => ({
        boardId: s.sprintId,
        title: `Sprint ${s.sprintId}`,
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        totalStoryPoints: s.totalSP,
        remainingStoryPoints: s.remainingSP,
        cards: [],
        completedPerDay: {},
      }));

      return { project, burndownDataList };
    });
  });

describe('Property 10: Agregação correta do Burndown de Projeto', () => {
  /**
   * **Validates: Requirements 7.4**
   * Feature: kanban-board, Property 10: Agregação correta do Burndown de Projeto
   */
  it('totalStoryPoints equals sum of all sprints totalSP', () => {
    fc.assert(
      fc.property(projectBurndownArb, ({ project, burndownDataList }) => {
        const result = calculateProjectBurndown(project, burndownDataList);

        const expectedTotal = burndownDataList.reduce(
          (sum, bd) => sum + bd.totalStoryPoints,
          0
        );
        expect(result.totalStoryPoints).toBe(expectedTotal);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.4**
   * Feature: kanban-board, Property 10: Agregação correta do Burndown de Projeto
   */
  it('for each sprint completedSP + remainingSP equals sprint total', () => {
    fc.assert(
      fc.property(projectBurndownArb, ({ project, burndownDataList }) => {
        const result = calculateProjectBurndown(project, burndownDataList);

        for (let i = 0; i < result.sprints.length; i++) {
          const sprint = result.sprints[i];
          const expectedTotal = burndownDataList[i].totalStoryPoints;
          expect(sprint.completedStoryPoints + sprint.remainingStoryPoints).toBe(expectedTotal);
        }
      }),
      { numRuns: 100 }
    );
  });
});
