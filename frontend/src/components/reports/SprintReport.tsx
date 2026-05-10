import { useParams, Link } from 'react-router-dom';
import { useSprintReport } from '../../hooks/useReports';
import BurndownChart from './BurndownChart';

function SprintReport() {
  const { id } = useParams<{ id: string }>();
  const boardId = Number(id);
  const { report, burndown, loading, error } = useSprintReport(boardId);

  if (loading) {
    return <p>Carregando relatório...</p>;
  }

  if (error) {
    return (
      <div>
        <Link to={`/boards/${boardId}`} style={{ textDecoration: 'none', color: '#1976d2' }}>
          ← Voltar ao Quadro
        </Link>
        <p style={{ color: 'red', marginTop: '12px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <Link to={`/boards/${boardId}`} style={{ textDecoration: 'none', color: '#1976d2', marginBottom: '12px', display: 'inline-block' }}>
        ← Voltar ao Quadro
      </Link>

      <h2 style={{ marginBottom: '20px' }}>Relatório da Sprint</h2>

      {burndown && (
        <div style={{ marginBottom: '32px' }}>
          <h3>Burndown Chart</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Total de Story Points: {burndown.totalStoryPoints}
          </p>
          <BurndownChart data={burndown} />
        </div>
      )}

      {report && (
        <div>
          <h3>Estatísticas do Quadro</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
            Total de cartões: {report.totalCards}
          </p>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Coluna</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Cartões</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>%</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Story Points</th>
              </tr>
            </thead>
            <tbody>
              {report.columns.map((col) => (
                <tr key={col.columnId}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{col.columnTitle}</td>
                  <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{col.cardCount}</td>
                  <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{col.percentage.toFixed(1)}%</td>
                  <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{col.storyPointsSum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SprintReport;
