export interface Project {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  boards?: Board[];
}

export interface Board {
  id: number;
  projectId: number;
  title: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  createdAt: string;
  updatedAt: string;
  columns?: KanbanColumn[];
}

export interface KanbanColumn {
  id: number;
  boardId: number;
  title: string;
  position: number;
  isDoneColumn: boolean;
  createdAt: string;
  updatedAt: string;
  cards?: Card[];
}

export interface Card {
  id: number;
  columnId: number;
  title: string;
  description?: string;
  storyPoints: number;
  position: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SprintBurndownResponse {
  totalStoryPoints: number;
  businessDays: string[];
  idealLine: number[];
  actualLine: number[];
}

export interface ProjectBurndownResponse {
  totalStoryPoints: number;
  sprints: {
    sprintId: number;
    sprintTitle: string;
    completedStoryPoints: number;
    remainingStoryPoints: number;
  }[];
}

export interface BoardReportResponse {
  totalCards: number;
  columns: {
    columnId: number;
    columnTitle: string;
    cardCount: number;
    percentage: number;
    storyPointsSum: number;
  }[];
}
