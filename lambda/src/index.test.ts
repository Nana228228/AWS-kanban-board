import { handler } from './index';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the handlers
jest.mock('./handlers/boardReport', () => ({
  handleBoardReport: jest.fn().mockResolvedValue({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalCards: 5, columns: [] }),
  }),
}));

jest.mock('./handlers/sprintBurndown', () => ({
  handleSprintBurndown: jest.fn().mockResolvedValue({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalStoryPoints: 50, businessDays: [], idealLine: [], actualLine: [] }),
  }),
}));

jest.mock('./handlers/projectBurndown', () => ({
  handleProjectBurndown: jest.fn().mockResolvedValue({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalStoryPoints: 100, sprints: [] }),
  }),
}));

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

describe('Lambda handler routing', () => {
  it('should route /report/board/{id} to board report handler', async () => {
    const event = createEvent('/report/board/123');
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('totalCards');
  });

  it('should route /report/burndown/sprint/{id} to sprint burndown handler', async () => {
    const event = createEvent('/report/burndown/sprint/456');
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('totalStoryPoints');
    expect(body).toHaveProperty('businessDays');
  });

  it('should route /report/burndown/project/{id} to project burndown handler', async () => {
    const event = createEvent('/report/burndown/project/789');
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('totalStoryPoints');
    expect(body).toHaveProperty('sprints');
  });

  it('should return 404 for unknown routes', async () => {
    const event = createEvent('/unknown/route');
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Not Found');
    expect(body.message).toBe('Rota não encontrada');
  });

  it('should return 404 for partial matches', async () => {
    const event = createEvent('/report/board/');
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });

  it('should return 404 for non-numeric IDs', async () => {
    const event = createEvent('/report/board/abc');
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });
});
