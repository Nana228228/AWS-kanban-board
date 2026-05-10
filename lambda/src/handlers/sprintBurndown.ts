import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';
import { BurndownDataResponse, SprintBurndownResponse } from '../types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

/**
 * Calculates business days (Monday-Friday) between startDate and endDate (inclusive).
 */
export function getBusinessDays(startDate: string, endDate: string): string[] {
  const businessDays: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }

  return businessDays;
}

/**
 * Calculates the ideal burndown line: linear decrement from total SP to 0
 * over the number of business days.
 */
export function calculateIdealLine(totalStoryPoints: number, businessDaysCount: number): number[] {
  if (businessDaysCount === 0) {
    return [];
  }

  const idealLine: number[] = [];
  const decrementPerDay = totalStoryPoints / businessDaysCount;

  for (let i = 0; i <= businessDaysCount; i++) {
    const value = totalStoryPoints - (decrementPerDay * i);
    idealLine.push(Math.round(value * 100) / 100);
  }

  return idealLine;
}

/**
 * Calculates the actual burndown line: remaining SP per business day
 * based on completedPerDay data from the backend.
 */
export function calculateActualLine(
  totalStoryPoints: number,
  businessDays: string[],
  completedPerDay: Record<string, number>
): number[] {
  const actualLine: number[] = [totalStoryPoints]; // Start with total SP
  let cumulativeCompleted = 0;

  for (const day of businessDays) {
    cumulativeCompleted += (completedPerDay[day] || 0);
    actualLine.push(totalStoryPoints - cumulativeCompleted);
  }

  return actualLine;
}

export function calculateSprintBurndown(data: BurndownDataResponse): SprintBurndownResponse {
  const businessDays = getBusinessDays(data.startDate, data.endDate);
  const totalStoryPoints = data.totalStoryPoints;
  const idealLine = calculateIdealLine(totalStoryPoints, businessDays.length);
  const actualLine = calculateActualLine(totalStoryPoints, businessDays, data.completedPerDay);

  return {
    totalStoryPoints,
    businessDays,
    idealLine,
    actualLine,
  };
}

export async function handleSprintBurndown(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const pathParts = event.path.split('/');
  const boardId = pathParts[pathParts.length - 1];

  try {
    const response = await axios.get<BurndownDataResponse>(`${BACKEND_URL}/boards/${boardId}/burndown-data`);
    const burndownData = response.data;
    const result = calculateSprintBurndown(burndownData);

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
          body: JSON.stringify({ error: 'Not Found', message: `Quadro com id ${boardId} não encontrado` }),
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
