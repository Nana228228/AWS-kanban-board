import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';
import { BoardResponse, BoardReportResponse, ColumnStatistics } from '../types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export function calculateBoardStatistics(board: BoardResponse): BoardReportResponse {
  const columns = board.columns || [];

  const totalCards = columns.reduce((sum, col) => sum + (col.cards?.length || 0), 0);

  const columnStats: ColumnStatistics[] = columns.map((col) => {
    const cards = col.cards || [];
    const cardCount = cards.length;
    const percentage = totalCards > 0 ? Math.round((cardCount / totalCards) * 10000) / 100 : 0;
    const storyPointsSum = cards.reduce((sum, card) => sum + (card.storyPoints || 0), 0);

    return {
      columnId: col.id,
      columnTitle: col.title,
      cardCount,
      percentage,
      storyPointsSum,
    };
  });

  return {
    totalCards,
    columns: columnStats,
  };
}

export async function handleBoardReport(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const pathParts = event.path.split('/');
  const boardId = pathParts[pathParts.length - 1];

  try {
    const response = await axios.get<BoardResponse>(`${BACKEND_URL}/boards/${boardId}`);
    const board = response.data;
    const report = calculateBoardStatistics(board);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
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
