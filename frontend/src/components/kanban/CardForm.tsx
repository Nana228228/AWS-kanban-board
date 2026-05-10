import { useState } from 'react';
import type { Card } from '../../types';

interface CardFormProps {
  card?: Card;
  onSubmit: (data: { title: string; description?: string; storyPoints?: number }) => Promise<void>;
  onCancel: () => void;
}

function CardForm({ card, onSubmit, onCancel }: CardFormProps) {
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [storyPoints, setStoryPoints] = useState(card?.storyPoints?.toString() || '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('O título do cartão é obrigatório.');
      return;
    }
    if (trimmedTitle.length > 200) {
      setError('O título do cartão deve ter no máximo 200 caracteres.');
      return;
    }
    if (description.length > 2000) {
      setError('A descrição deve ter no máximo 2000 caracteres.');
      return;
    }

    const sp = storyPoints.trim() ? Number(storyPoints) : undefined;
    if (sp !== undefined && (isNaN(sp) || sp < 0)) {
      setError('Story Points deve ser um número não negativo.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim() || undefined,
        storyPoints: sp,
      });
    } catch {
      setError('Erro ao salvar cartão.');
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
          width: '450px',
          maxWidth: '90vw',
        }}
      >
        <h3 style={{ margin: '0 0 16px' }}>
          {card ? 'Editar Cartão' : 'Novo Cartão'}
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
              maxLength={200}
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
            <small style={{ color: '#666' }}>{title.length}/200</small>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <small style={{ color: '#666' }}>{description.length}/2000</small>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Story Points (opcional)
            </label>
            <input
              type="number"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              min={0}
              style={{
                width: '100px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
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

export default CardForm;
