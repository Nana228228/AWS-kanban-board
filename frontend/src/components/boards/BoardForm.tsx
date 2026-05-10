import { useState, useEffect } from 'react';
import type { Board } from '../../types';

interface BoardFormProps {
  board?: Board | null;
  onSubmit: (data: { title: string; startDate: string; durationDays: number }) => Promise<void>;
  onCancel: () => void;
}

function BoardForm({ board, onSubmit, onCancel }: BoardFormProps) {
  const [title, setTitle] = useState(board?.title || '');
  const [startDate, setStartDate] = useState(board?.startDate || '');
  const [durationDays, setDurationDays] = useState<number>(board?.durationDays || 14);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTitle(board?.title || '');
    setStartDate(board?.startDate || '');
    setDurationDays(board?.durationDays || 14);
  }, [board]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('O título do quadro é obrigatório.');
      return;
    }
    if (trimmedTitle.length > 100) {
      setError('O título do quadro deve ter no máximo 100 caracteres.');
      return;
    }
    if (!startDate) {
      setError('A data de início é obrigatória.');
      return;
    }
    if (!durationDays || durationDays <= 0) {
      setError('A duração deve ser maior que zero.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ title: trimmedTitle, startDate, durationDays });
    } catch {
      setError('Erro ao salvar quadro. Verifique se as datas não se sobrepõem com outro quadro.');
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
          width: '450px',
          maxWidth: '90%',
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {board ? 'Editar Quadro' : 'Novo Quadro'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="board-title"
              style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
            >
              Título
            </label>
            <input
              id="board-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="board-start-date"
              style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
            >
              Data de Início
            </label>
            <input
              id="board-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="board-duration"
              style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
            >
              Duração (dias)
            </label>
            <input
              id="board-duration"
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 0)}
              min={1}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
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

export default BoardForm;
