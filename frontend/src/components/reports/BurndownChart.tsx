import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SprintBurndownResponse } from '../../types';

interface BurndownChartProps {
  data: SprintBurndownResponse;
}

function BurndownChart({ data }: BurndownChartProps) {
  const chartData = data.businessDays.map((day, index) => ({
    day: day,
    ideal: data.idealLine[index] ?? 0,
    actual: data.actualLine[index] !== undefined ? data.actualLine[index] : null,
  }));

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            fontSize={12}
            tickFormatter={(value: string) => {
              const parts = value.split('-');
              return `${parts[2]}/${parts[1]}`;
            }}
          />
          <YAxis fontSize={12} label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            labelFormatter={(label: string) => {
              const d = new Date(label + 'T00:00:00');
              return d.toLocaleDateString('pt-BR');
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#90caf9"
            strokeDasharray="5 5"
            strokeWidth={2}
            name="Ideal"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#1976d2"
            strokeWidth={2}
            name="Real"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BurndownChart;
