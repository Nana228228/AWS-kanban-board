import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../types';
import * as api from '../services/api';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  updateProject: (id: number, name: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar projetos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string) => {
    setError(null);
    try {
      await api.createProject({ name });
      await fetchProjects();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao criar projeto';
      setError(message);
      throw err;
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: number, name: string) => {
    setError(null);
    try {
      await api.updateProject(id, { name });
      await fetchProjects();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao atualizar projeto';
      setError(message);
      throw err;
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id: number) => {
    setError(null);
    try {
      await api.deleteProject(id);
      await fetchProjects();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao excluir projeto';
      setError(message);
      throw err;
    }
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
