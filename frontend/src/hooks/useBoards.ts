import { useState, useEffect, useCallback } from 'react';
import type { Board } from '../types';
import * as api from '../services/api';

interface UseBoardsReturn {
  boards: Board[];
  loading: boolean;
  error: string | null;
  fetchBoards: () => Promise<void>;
  createBoard: (data: { title: string; startDate: string; durationDays: number }) => Promise<void>;
  updateBoard: (id: number, data: { title: string; startDate: string; durationDays: number }) => Promise<void>;
  deleteBoard: (id: number) => Promise<void>;
}

export function useBoards(projectId: number): UseBoardsReturn {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBoards(projectId);
      setBoards(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar quadros';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createBoard = useCallback(
    async (data: { title: string; startDate: string; durationDays: number }) => {
      setError(null);
      try {
        await api.createBoard(projectId, data);
        await fetchBoards();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao criar quadro';
        setError(message);
        throw err;
      }
    },
    [projectId, fetchBoards]
  );

  const updateBoard = useCallback(
    async (id: number, data: { title: string; startDate: string; durationDays: number }) => {
      setError(null);
      try {
        await api.updateBoard(id, data);
        await fetchBoards();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao atualizar quadro';
        setError(message);
        throw err;
      }
    },
    [fetchBoards]
  );

  const deleteBoard = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await api.deleteBoard(id);
        await fetchBoards();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao excluir quadro';
        setError(message);
        throw err;
      }
    },
    [fetchBoards]
  );

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  return {
    boards,
    loading,
    error,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
  };
}
