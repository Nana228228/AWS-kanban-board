import { Routes, Route, Navigate } from 'react-router-dom';
import ProjectList from './components/projects/ProjectList';
import BoardList from './components/boards/BoardList';
import KanbanBoard from './components/kanban/KanbanBoard';
import SprintReport from './components/reports/SprintReport';
import ProjectBurndown from './components/reports/ProjectBurndown';

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Kanban Board</h1>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/projects/:id/boards" element={<BoardList />} />
        <Route path="/boards/:id" element={<KanbanBoard />} />
        <Route path="/boards/:id/burndown" element={<SprintReport />} />
        <Route path="/projects/:id/burndown" element={<ProjectBurndown />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
