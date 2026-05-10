import axios from 'axios';
import type {
  Project,
  Board,
  KanbanColumn,
  Card,
  BoardReportResponse,
  SprintBurndownResponse,
  ProjectBurndownResponse,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || 'Erro desconhecido';
      console.error(`API Error [${error.response.status}]: ${message}`);
    } else if (error.request) {
      console.error('Erro de conexão. Verifique se o servidor está acessível.');
    } else {
      console.error('Erro ao configurar requisição:', error.message);
    }
    return Promise.reject(error);
  }
);

// ==================== Projects ====================

export async function getProjects(): Promise<Project[]> {
  const response = await api.get<Project[]>('/projects');
  return response.data;
}

export async function getProject(id: number): Promise<Project> {
  const response = await api.get<Project>(`/projects/${id}`);
  return response.data;
}

export async function createProject(data: { name: string }): Promise<Project> {
  const response = await api.post<Project>('/projects', data);
  return response.data;
}

export async function updateProject(id: number, data: { name: string }): Promise<Project> {
  const response = await api.put<Project>(`/projects/${id}`, data);
  return response.data;
}

export async function deleteProject(id: number): Promise<void> {
  await api.delete(`/projects/${id}`);
}

// ==================== Boards ====================

export async function getBoards(projectId: number): Promise<Board[]> {
  const response = await api.get<Board[]>(`/projects/${projectId}/boards`);
  return response.data;
}

export async function getBoard(id: number): Promise<Board> {
  const response = await api.get<Board>(`/boards/${id}`);
  return response.data;
}

export async function createBoard(
  projectId: number,
  data: { title: string; startDate: string; durationDays: number }
): Promise<Board> {
  const response = await api.post<Board>(`/projects/${projectId}/boards`, data);
  return response.data;
}

export async function updateBoard(
  id: number,
  data: { title: string; startDate: string; durationDays: number }
): Promise<Board> {
  const response = await api.put<Board>(`/boards/${id}`, data);
  return response.data;
}

export async function deleteBoard(id: number): Promise<void> {
  await api.delete(`/boards/${id}`);
}

// ==================== Columns ====================

export async function createColumn(
  boardId: number,
  data: { title: string }
): Promise<KanbanColumn> {
  const response = await api.post<KanbanColumn>(`/boards/${boardId}/columns`, data);
  return response.data;
}

export async function updateColumn(
  id: number,
  data: { title: string }
): Promise<KanbanColumn> {
  const response = await api.put<KanbanColumn>(`/columns/${id}`, data);
  return response.data;
}

export async function reorderColumns(
  boardId: number,
  data: { orderedIds: number[] }
): Promise<KanbanColumn[]> {
  const response = await api.put<KanbanColumn[]>(
    `/boards/${boardId}/columns/reorder`,
    data
  );
  return response.data;
}

export async function deleteColumn(id: number): Promise<void> {
  await api.delete(`/columns/${id}`);
}

export async function markAsDoneColumn(
  id: number,
  data: { isDoneColumn: boolean }
): Promise<KanbanColumn> {
  const response = await api.patch<KanbanColumn>(`/columns/${id}/done`, data);
  return response.data;
}

// ==================== Cards ====================

export async function createCard(
  columnId: number,
  data: { title: string; description?: string; storyPoints?: number }
): Promise<Card> {
  const response = await api.post<Card>(`/columns/${columnId}/cards`, data);
  return response.data;
}

export async function updateCard(
  id: number,
  data: { title?: string; description?: string; storyPoints?: number }
): Promise<Card> {
  const response = await api.put<Card>(`/cards/${id}`, data);
  return response.data;
}

export async function moveCard(
  id: number,
  data: { targetColumnId: number; position?: number }
): Promise<Card> {
  const response = await api.patch<Card>(`/cards/${id}/move`, data);
  return response.data;
}

export async function reorderCards(
  columnId: number,
  data: { orderedIds: number[] }
): Promise<Card[]> {
  const response = await api.put<Card[]>(
    `/columns/${columnId}/cards/reorder`,
    data
  );
  return response.data;
}

export async function deleteCard(id: number): Promise<void> {
  await api.delete(`/cards/${id}`);
}

// ==================== Reports ====================

export async function getBoardReport(boardId: number): Promise<BoardReportResponse> {
  const response = await api.get<BoardReportResponse>(`/report/board/${boardId}`);
  return response.data;
}

export async function getSprintBurndown(boardId: number): Promise<SprintBurndownResponse> {
  const response = await api.get<SprintBurndownResponse>(
    `/report/burndown/sprint/${boardId}`
  );
  return response.data;
}

export async function getProjectBurndown(projectId: number): Promise<ProjectBurndownResponse> {
  const response = await api.get<ProjectBurndownResponse>(
    `/report/burndown/project/${projectId}`
  );
  return response.data;
}

export default api;
