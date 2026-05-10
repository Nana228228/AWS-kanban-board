import { useState } from 'react';
import type { KanbanColumn } from '../../types';

interface ColumnFormProps {
  column?: KanbanColumn;
  onSubmit: (data: { title: string; isDoneColumn: boolean }) => Promise<void>;
  onCancel: () => void;
}

function ColumnForm({ column, onSubmit, onCancel }: ColumnFormProps) {
  const [title, setTitle] = useState(column?.title || '');
  const [isDoneColumn, setIsDoneColumn] = useState(column?.isDoneColumn || false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = title.trim();
    if (!trimmed) {
      setError('O título da coluna é obrigatório.');
      return;
    }
    if (trimmed.length > 100) {
      setError('O título da coluna deve ter no máximo 100 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ title: trimmed, isDoneColumn });
    } catch {
      setError('Erro ao salvar coluna.');
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
        backgroundColor: 'rgba(0,0,0,0.4)',
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
          maxWidth: '90vw',
        }}
      >
        <h3 style={{ margin: '0 0 16px' }}>
          {column ? 'Editar Coluna' : 'Nova Coluna'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            <small style={{ color: '#666' }}>{title.length}/100</small>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isDoneColumn}
                onChange={(e) => setIsDoneColumn(e.target.checked)}
              />
              Marcar como coluna de conclusão (Done)
            </label>
          </div>

          {error && <p style={{ color: 'red', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

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
                opacity: submitting ? 0.7 : 1,
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

export default ColumnForm;
