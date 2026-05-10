// ===== Backend API Response Types =====

export interface CardResponse {
  id: number;
  columnId: number;
  title: string;
  description?: string;
  storyPoints: number;
  position: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnResponse {
  id: number;
  boardId: number;
  title: string;
  position: number;
  isDoneColumn: boolean;
  createdAt: string;
  updatedAt: string;
  cards?: CardResponse[];
}

export interface BoardResponse {
  id: number;
  projectId: number;
  title: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  createdAt: string;
  updatedAt: string;
  columns?: ColumnResponse[];
}

export interface ProjectResponse {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  boards?: BoardResponse[];
}

export interface BurndownDataResponse {
  boardId: number;
  title: string;
  startDate: string;
  endDate: string;
  totalStoryPoints: number;
  remainingStoryPoints: number;
  cards: CardResponse[];
  completedPerDay: Record<string, number>;
}

// ===== Lambda Response Types =====

export interface ColumnStatistics {
  columnId: number;
  columnTitle: string;
  cardCount: number;
  percentage: number;
  storyPointsSum: number;
}

export interface BoardReportResponse {
  totalCards: number;
  columns: ColumnStatistics[];
}

export interface SprintBurndownResponse {
  totalStoryPoints: number;
  businessDays: string[];
  idealLine: number[];
  actualLine: number[];
}

export interface SprintSummary {
  sprintId: number;
  sprintTitle: string;
  completedStoryPoints: number;
  remainingStoryPoints: number;
}

export interface ProjectBurndownResponse {
  totalStoryPoints: number;
  sprints: SprintSummary[];
}

// ===== Error Response =====

export interface ErrorResponse {
  error: string;
  message: string;
}
