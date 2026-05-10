import { useState, useEffect, useCallback } from 'react';
import type { BoardReportResponse, SprintBurndownResponse, ProjectBurndownResponse } from '../types';
import * as api from '../services/api';

interface UseSprintReportReturn {
  report: BoardReportResponse | null;
  burndown: SprintBurndownResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSprintReport(boardId: number): UseSprintReportReturn {
  const [report, setReport] = useState<BoardReportResponse | null>(null);
  const [burndown, setBurndown] = useState<SprintBurndownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportData, burndownData] = await Promise.all([
        api.getBoardReport(boardId),
        api.getSprintBurndown(boardId),
      ]);
      setReport(reportData);
      setBurndown(burndownData);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar relatório';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { report, burndown, loading, error, refresh };
}

interface UseProjectBurndownReturn {
  burndown: ProjectBurndownResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjectBurndown(projectId: number): UseProjectBurndownReturn {
  const [burndown, setBurndown] = useState<ProjectBurndownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjectBurndown(projectId);
      setBurndown(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar burndown do projeto';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { burndown, loading, error, refresh };
}
