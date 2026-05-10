import axios from 'axios';
import { handler } from '../index';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Integration tests for the Lambda function.
 * Mocks HTTP calls to the backend and verifies end-to-end handler behavior.
 */
describe('Lambda Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BACKEND_URL = 'http://localhost:8080';
  });

  // ===== Board Report calculation with known data =====

  describe('Board Report - /report/board/{id}', () => {
    it('should calculate board statistics correctly with known data', async () => {
      const mockBoardData = {
        id: 1,
        projectId: 1,
        title: 'Sprint 1',
        startDate: '2024-01-15',
        endDate: '2024-01-28',
        durationDays: 14,
        createdAt: '2024-01-01T00:00:00',
        updatedAt: '2024-01-01T00:00:00',
        columns: [
          {
            id: 1,
            boardId: 1,
            title: 'A Fazer',
            position: 0,
            isDoneColumn: false,
            createdAt: '2024-01-01T00:00:00',
            updatedAt: '2024-01-01T00:00:00',
            cards: [
              { id: 1, columnId: 1, title: 'Card 1', storyPoints: 3, position: 0, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00' },
              { id: 2, columnId: 1, title: 'Card 2', storyPoints: 5, position: 1, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00' },
            ],
          },
          {
            id: 2,
            boardId: 1,
            title: 'Em Progresso',
            position: 1,
            isDoneColumn: false,
            createdAt: '2024-01-01T00:00:00',
            updatedAt: '2024-01-01T00:00:00',
            cards: [
              { id: 3, columnId: 2, title: 'Card 3', storyPoints: 8, position: 0, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00' },
            ],
          },
          {
            id: 3,
            boardId: 1,
            title: 'Concluído',
            position: 2,
            isDoneColumn: true,
            createdAt: '2024-01-01T00:00:00',
            updatedAt: '2024-01-01T00:00:00',
            cards: [
              { id: 4, columnId: 3, title: 'Card 4', storyPoints: 2, position: 0, completedAt: '2024-01-20T10:00:00', createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00' },
              { id: 5, columnId: 3, title: 'Card 5', storyPoints: 5, position: 1, completedAt: '2024-01-22T14:00:00', createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00' },
            ],
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockBoardData, status: 200, statusText: 'OK', headers: {}, config: {} as any });

      const event = createEvent('/report/board/1');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Total cards: 2 + 1 + 2 = 5
      expect(body.totalCards).toBe(5);
      expect(body.columns).toHaveLength(3);

      // Column "A Fazer": 2 cards, 40%, SP sum = 3 + 5 = 8
      expect(body.columns[0].columnTitle).toBe('A Fazer');
      expect(body.columns[0].cardCount).toBe(2);
      expect(body.columns[0].percentage).toBe(40);
      expect(body.columns[0].storyPointsSum).toBe(8);

      // Column "Em Progresso": 1 card, 20%, SP sum = 8
      expect(body.columns[1].columnTitle).toBe('Em Progresso');
      expect(body.columns[1].cardCount).toBe(1);
      expect(body.columns[1].percentage).toBe(20);
      expect(body.columns[1].storyPointsSum).toBe(8);

      // Column "Concluído": 2 cards, 40%, SP sum = 2 + 5 = 7
      expect(body.columns[2].columnTitle).toBe('Concluído');
      expect(body.columns[2].cardCount).toBe(2);
      expect(body.columns[2].percentage).toBe(40);
      expect(body.columns[2].storyPointsSum).toBe(7);
    });

    it('should handle empty board with no columns', async () => {
      const mockBoardData = {
        id: 2,
        projectId: 1,
        title: 'Sprint Vazia',
        startDate: '2024-02-01',
        endDate: '2024-02-14',
        durationDays: 14,
        createdAt: '2024-01-01T00:00:00',
        updatedAt: '2024-01-01T00:00:00',
        columns: [],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockBoardData, status: 200, statusText: 'OK', headers: {}, config: {} as any });

      const event = createEvent('/report/board/2');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.totalCards).toBe(0);
      expect(body.columns).toHaveLength(0);
    });
  });

  // ===== Burndown calculation with known data =====

  describe('Sprint Burndown - /report/burndown/sprint/{id}', () => {
    it('should calculate burndown with known data over business days', async () => {
      // Sprint: Mon Jan 15 to Fri Jan 26, 2024 (10 business days)
      const mockBurndownData = {
        boardId: 1,
        title: 'Sprint 1',
        startDate: '2024-01-15',
        endDate: '2024-01-26',
        totalStoryPoints: 20,
        remainingStoryPoints: 12,
        cards: [],
        completedPerDay: {
          '2024-01-16': 3,  // Tue: 3 SP completed
          '2024-01-18': 5,  // Thu: 5 SP completed
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockBurndownData, status: 200, statusText: 'OK', headers: {}, config: {} as any });

      const event = createEvent('/report/burndown/sprint/1');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      expect(body.totalStoryPoints).toBe(20);

      // Business days: Jan 15 (Mon) to Jan 26 (Fri) = 10 business days
      // Excludes Jan 20 (Sat), Jan 21 (Sun)
      expect(body.businessDays).toHaveLength(10);
      expect(body.businessDays[0]).toBe('2024-01-15');
      expect(body.businessDays[body.businessDays.length - 1]).toBe('2024-01-26');

      // Verify no weekends in business days
      for (const day of body.businessDays) {
        const date = new Date(day + 'T00:00:00');
        const dayOfWeek = date.getDay();
        expect(dayOfWeek).not.toBe(0); // Not Sunday
        expect(dayOfWeek).not.toBe(6); // Not Saturday
      }

      // Ideal line: starts at 20, ends at 0, 11 points (start + 10 days)
      expect(body.idealLine).toHaveLength(11);
      expect(body.idealLine[0]).toBe(20);
      expect(body.idealLine[body.idealLine.length - 1]).toBe(0);

      // Actual line: starts at 20, decreases based on completedPerDay
      expect(body.actualLine).toHaveLength(11);
      expect(body.actualLine[0]).toBe(20); // Start
      expect(body.actualLine[1]).toBe(20); // Jan 15 (Mon) - no completions
      expect(body.actualLine[2]).toBe(17); // Jan 16 (Tue) - 3 SP completed → 20-3=17
    });

    it('should handle sprint with no completions', async () => {
      const mockBurndownData = {
        boardId: 3,
        title: 'Sprint Nova',
        startDate: '2024-02-05',
        endDate: '2024-02-09',
        totalStoryPoints: 10,
        remainingStoryPoints: 10,
        cards: [],
        completedPerDay: {},
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockBurndownData, status: 200, statusText: 'OK', headers: {}, config: {} as any });

      const event = createEvent('/report/burndown/sprint/3');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      expect(body.totalStoryPoints).toBe(10);
      // Feb 5-9, 2024 is Mon-Fri = 5 business days
      expect(body.businessDays).toHaveLength(5);
      // Actual line should remain at 10 (no completions)
      expect(body.actualLine[0]).toBe(10);
      expect(body.actualLine[body.actualLine.length - 1]).toBe(10);
    });
  });

  // ===== Project Burndown with known data =====

  describe('Project Burndown - /report/burndown/project/{id}', () => {
    it('should calculate project burndown aggregating multiple sprints', async () => {
      const mockProject = {
        id: 1,
        name: 'Projeto Multi-Sprint',
        createdAt: '2024-01-01T00:00:00',
        updatedAt: '2024-01-01T00:00:00',
        boards: [
          { id: 1, projectId: 1, title: 'Sprint 1', startDate: '2024-01-01', endDate: '2024-01-14', durationDays: 14, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00' },
          { id: 2, projectId: 1, title: 'Sprint 2', startDate: '2024-01-15', endDate: '2024-01-28', durationDays: 14, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00' },
        ],
      };

      const mockBurndown1 = {
        boardId: 1,
        title: 'Sprint 1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        totalStoryPoints: 30,
        remainingStoryPoints: 5,
        cards: [],
        completedPerDay: {},
      };

      const mockBurndown2 = {
        boardId: 2,
        title: 'Sprint 2',
        startDate: '2024-01-15',
        endDate: '2024-01-28',
        totalStoryPoints: 20,
        remainingStoryPoints: 12,
        cards: [],
        completedPerDay: {},
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProject, status: 200, statusText: 'OK', headers: {}, config: {} as any })
        .mockResolvedValueOnce({ data: mockBurndown1, status: 200, statusText: 'OK', headers: {}, config: {} as any })
        .mockResolvedValueOnce({ data: mockBurndown2, status: 200, statusText: 'OK', headers: {}, config: {} as any });

      const event = createEvent('/report/burndown/project/1');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Total SP = 30 + 20 = 50
      expect(body.totalStoryPoints).toBe(50);
      expect(body.sprints).toHaveLength(2);

      // Sprint 1: total 30, remaining 5, completed 25
      expect(body.sprints[0].sprintId).toBe(1);
      expect(body.sprints[0].sprintTitle).toBe('Sprint 1');
      expect(body.sprints[0].completedStoryPoints).toBe(25);
      expect(body.sprints[0].remainingStoryPoints).toBe(5);

      // Sprint 2: total 20, remaining 12, completed 8
      expect(body.sprints[1].sprintId).toBe(2);
      expect(body.sprints[1].sprintTitle).toBe('Sprint 2');
      expect(body.sprints[1].completedStoryPoints).toBe(8);
      expect(body.sprints[1].remainingStoryPoints).toBe(12);
    });
  });

  // ===== Error handling =====

  describe('Error Handling', () => {
    it('should return 502 when backend is unreachable', async () => {
      const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:8080');
      (connectionError as any).code = 'ECONNREFUSED';
      (connectionError as any).isAxiosError = true;
      mockedAxios.get.mockRejectedValueOnce(connectionError);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const event = createEvent('/report/board/1');
      const result = await handler(event);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Bad Gateway');
      expect(body.message).toContain('Não foi possível acessar o serviço backend');
    });

    it('should return 502 when backend times out', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      (timeoutError as any).isAxiosError = true;
      mockedAxios.get.mockRejectedValueOnce(timeoutError);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const event = createEvent('/report/burndown/sprint/1');
      const result = await handler(event);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Bad Gateway');
    });

    it('should return 404 for non-existing board resource', async () => {
      const notFoundError = new Error('Request failed with status code 404');
      (notFoundError as any).response = { status: 404, data: { error: 'Not Found', message: 'Quadro com id 999 não encontrado' } };
      (notFoundError as any).isAxiosError = true;
      mockedAxios.get.mockRejectedValueOnce(notFoundError);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const event = createEvent('/report/board/999');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Not Found');
    });

    it('should return 404 for non-existing project resource', async () => {
      const notFoundError = new Error('Request failed with status code 404');
      (notFoundError as any).response = { status: 404, data: { error: 'Not Found', message: 'Projeto com id 999 não encontrado' } };
      (notFoundError as any).isAxiosError = true;
      mockedAxios.get.mockRejectedValueOnce(notFoundError);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const event = createEvent('/report/burndown/project/999');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Not Found');
    });

    it('should return 404 for unknown routes', async () => {
      const event = createEvent('/report/unknown/1');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Not Found');
    });
  });
});

// ===== Helper =====

function createEvent(path: string): APIGatewayProxyEvent {
  return {
    path,
    httpMethod: 'GET',
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    body: null,
    isBase64Encoded: false,
  };
}
