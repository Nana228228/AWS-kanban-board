import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBoards } from '../../hooks/useBoards';
import BoardForm from './BoardForm';
import type { Board } from '../../types';

function BoardList() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { boards, loading, error, createBoard, updateBoard, deleteBoard } =
    useBoards(projectId);
  const [showForm, setShowForm] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);

  const handleCreate = async (data: { title: string; startDate: string; durationDays: number }) => {
    await createBoard(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: { title: string; startDate: string; durationDays: number }) => {
    if (editingBoard) {
      await updateBoard(editingBoard.id, data);
      setEditingBoard(null);
    }
  };

  const handleDelete = async (boardId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este quadro?')) {
      await deleteBoard(boardId);
    }
  };

  if (loading) {
    return <p>Carregando quadros...</p>;
  }

  return (
    <div>
      <Link to="/" style={{ textDecoration: 'none', color: '#1976d2', marginBottom: '12px', display: 'inline-block' }}>
        ← Voltar aos Projetos
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Quadros (Sprints)</h2>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#1976d2',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          + Novo Quadro
        </button>
      </div>

      {error && (
        <p style={{ color: 'red', marginBottom: '12px' }}>{error}</p>
      )}

      {boards.length === 0 ? (
        <p style={{ color: '#666' }}>Nenhum quadro encontrado. Crie um novo quadro para começar.</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {boards.map((board) => (
            <div
              key={board.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/boards/${board.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/boards/${board.id}`);
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{board.title}</h3>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  <span>Início: {board.startDate}</span>
                  <span style={{ margin: '0 12px' }}>|</span>
                  <span>Fim: {board.endDate}</span>
                  <span style={{ margin: '0 12px' }}>|</span>
                  <span>Duração: {board.durationDays} dias</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingBoard(board);
                  }}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(board.id);
                  }}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e53935',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    color: '#e53935',
                    cursor: 'pointer',
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BoardForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editingBoard && (
        <BoardForm
          board={editingBoard}
          onSubmit={handleUpdate}
          onCancel={() => setEditingBoard(null)}
        />
      )}
    </div>
  );
}

export default BoardList;
