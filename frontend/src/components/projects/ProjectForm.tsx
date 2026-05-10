import { useState, useEffect } from 'react';
import type { Project } from '../../types';

interface ProjectFormProps {
  project?: Project | null;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}

function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(project?.name || '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(project?.name || '');
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('O nome do projeto é obrigatório.');
      return;
    }
    if (trimmed.length > 100) {
      setError('O nome do projeto deve ter no máximo 100 caracteres.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch {
      setError('Erro ao salvar projeto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '400px',
          maxWidth: '90%',
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {project ? 'Editar Projeto' : 'Novo Projeto'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="project-name"
              style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
            >
              Nome
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
              maxLength={100}
              autoFocus
            />
          </div>
          {error && (
            <p style={{ color: 'red', margin: '0 0 12px' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#1976d2',
                color: '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;
