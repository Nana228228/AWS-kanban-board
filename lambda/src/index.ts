import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleBoardReport } from './handlers/boardReport';
import { handleSprintBurndown } from './handlers/sprintBurndown';
import { handleProjectBurndown } from './handlers/projectBurndown';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const path = event.path;

  if (path.match(/^\/report\/board\/\d+$/)) {
    return handleBoardReport(event);
  } else if (path.match(/^\/report\/burndown\/sprint\/\d+$/)) {
    return handleSprintBurndown(event);
  } else if (path.match(/^\/report\/burndown\/project\/\d+$/)) {
    return handleProjectBurndown(event);
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not Found', message: 'Rota não encontrada' }),
  };
};
