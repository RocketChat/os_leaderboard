import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Contributor } from '../types';

interface StatsChartsProps {
  contributor: Contributor;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-xs">
        <span className="font-bold text-slate-200">{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

const StatsCharts: React.FC<StatsChartsProps> = ({ contributor }) => {
  // Normalize data for the chart to look balanced, or show raw values
  // For a leaderboard, raw values usually make more sense, but a Radar chart 
  // looks best when axes are somewhat normalized. Here we just map raw.
  
  const data = [
    { subject: 'Merged PRs', A: contributor.mergedPRs, fullMark: 100 },
    { subject: 'Open PRs', A: contributor.openPRs, fullMark: 100 },
    { subject: 'Issues', A: contributor.issues, fullMark: 100 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
          <Radar
            name={contributor.username}
            dataKey="A"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="#8b5cf6"
            fillOpacity={0.3}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsCharts;