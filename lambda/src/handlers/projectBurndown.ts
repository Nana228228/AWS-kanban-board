import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';
import { ProjectResponse, BurndownDataResponse, ProjectBurndownResponse, SprintSummary } from '../types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export function calculateProjectBurndown(
  project: ProjectResponse,
  burndownDataList: BurndownDataResponse[]
): ProjectBurndownResponse {
  let totalStoryPoints = 0;
  const sprints: SprintSummary[] = [];

  for (const burndownData of burndownDataList) {
    const sprintTotal = burndownData.totalStoryPoints;
    const sprintRemaining = burndownData.remainingStoryPoints;
    const sprintCompleted = sprintTotal - sprintRemaining;

    totalStoryPoints += sprintTotal;

    sprints.push({
      sprintId: burndownData.boardId,
      sprintTitle: burndownData.title,
      completedStoryPoints: sprintCompleted,
      remainingStoryPoints: sprintRemaining,
    });
  }

  return {
    totalStoryPoints,
    sprints,
  };
}

export async function handleProjectBurndown(event: any): Promise<APIGatewayProxyResult> {
  const pathParts = (event.rawPath || event.path).split('/');
  const projectId = pathParts[pathParts.length - 1];

  try {
    // Get project with boards
    const projectResponse = await axios.get<ProjectResponse>(`${BACKEND_URL}/projects/${projectId}`);
    const project = projectResponse.data;
    const boards = project.boards || [];

    // Get burndown data for each board
    const burndownDataList: BurndownDataResponse[] = [];
    for (const board of boards) {
      const burndownResponse = await axios.get<BurndownDataResponse>(
        `${BACKEND_URL}/boards/${board.id}/burndown-data`
      );
      burndownDataList.push(burndownResponse.data);
    }

    const result = calculateProjectBurndown(project, burndownDataList);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Not Found', message: `Projeto com id ${projectId} não encontrado` }),
        };
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || !error.response) {
        return {
          statusCode: 502,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Bad Gateway', message: 'Não foi possível acessar o serviço backend' }),
        };
      }
    }

    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Bad Gateway', message: 'Não foi possível acessar o serviço backend' }),
    };
  }
}
