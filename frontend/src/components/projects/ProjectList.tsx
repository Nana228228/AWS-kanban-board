import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import ProjectForm from './ProjectForm';
import type { Project } from '../../types';

function ProjectList() {
  const { projects, loading, error, createProject, updateProject, deleteProject } =
    useProjects();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleCreate = async (name: string) => {
    await createProject(name);
    setShowForm(false);
  };

  const handleUpdate = async (name: string) => {
    if (editingProject) {
      await updateProject(editingProject.id, name);
      setEditingProject(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
      await deleteProject(id);
    }
  };

  if (loading) {
    return <p>Carregando projetos...</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Projetos</h2>
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
          + Novo Projeto
        </button>
      </div>

      {error && (
        <p style={{ color: 'red', marginBottom: '12px' }}>{error}</p>
      )}

      {projects.length === 0 ? (
        <p style={{ color: '#666' }}>Nenhum projeto encontrado. Crie um novo projeto para começar.</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/projects/${project.id}/boards`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/projects/${project.id}/boards`);
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{project.name}</h3>
                <small style={{ color: '#666' }}>
                  Criado em: {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                </small>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProject(project);
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
                    handleDelete(project.id);
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
        <ProjectForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editingProject && (
        <ProjectForm
          project={editingProject}
          onSubmit={handleUpdate}
          onCancel={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}

export default ProjectList;
