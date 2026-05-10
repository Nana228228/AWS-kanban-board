import { useParams, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useProjectBurndown } from '../../hooks/useReports';

function ProjectBurndown() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { burndown, loading, error } = useProjectBurndown(projectId);

  if (loading) {
    return <p>Carregando burndown do projeto...</p>;
  }

  if (error) {
    return (
      <div>
        <Link to={`/projects/${projectId}/boards`} style={{ textDecoration: 'none', color: '#1976d2' }}>
          ← Voltar aos Quadros
        </Link>
        <p style={{ color: 'red', marginTop: '12px' }}>{error}</p>
      </div>
    );
  }

  if (!burndown) {
    return <p>Nenhum dado disponível.</p>;
  }

  const chartData = burndown.sprints.map((sprint) => ({
    name: sprint.sprintTitle,
    concluidos: sprint.completedStoryPoints,
    restantes: sprint.remainingStoryPoints,
  }));

  return (
    <div>
      <Link to={`/projects/${projectId}/boards`} style={{ textDecoration: 'none', color: '#1976d2', marginBottom: '12px', display: 'inline-block' }}>
        ← Voltar aos Quadros
      </Link>

      <h2 style={{ marginBottom: '8px' }}>Burndown do Projeto</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
        Total de Story Points: {burndown.totalStoryPoints}
      </p>

      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="concluidos" stackId="a" fill="#4caf50" name="Concluídos" />
            <Bar dataKey="restantes" stackId="a" fill="#ff9800" name="Restantes" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
          marginTop: '24px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Sprint</th>
            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>SP Concluídos</th>
            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>SP Restantes</th>
          </tr>
        </thead>
        <tbody>
          {burndown.sprints.map((sprint) => (
            <tr key={sprint.sprintId}>
              <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{sprint.sprintTitle}</td>
              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{sprint.completedStoryPoints}</td>
              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{sprint.remainingStoryPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProjectBurndown;
