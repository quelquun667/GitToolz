
'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Languages } from 'lucide-react';

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'C++': '#f34b7d',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Other: '#89e051',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-background/80 backdrop-blur-sm border rounded-md shadow-lg">
        <p className="font-bold">{`${payload[0].name}: ${payload[0].value.toLocaleString()} bytes`}</p>
      </div>
    );
  }
  return null;
};

type LanguageDistributionChartProps = {
  languages: Record<string, number>;
};

export default function LanguageDistributionChart({ languages }: LanguageDistributionChartProps) {
  const data = React.useMemo(() => {
    if (!languages || Object.keys(languages).length === 0) return [];
    return Object.entries(languages).map(([name, value]) => ({
      name,
      value,
      color: LANGUAGE_COLORS[name] || LANGUAGE_COLORS['Other'],
    }));
  }, [languages]);

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" /> Language Distribution
        </CardTitle>
        <CardDescription>Breakdown of programming languages used in the repository.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={2}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Languages className="w-8 h-8" />
            <p className="mt-2 text-sm">No language data available</p>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
          {data.slice(0, 5).map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </div>
          ))}
          {data.length > 5 && <div className="text-xs text-muted-foreground">+ {data.length - 5} more</div>}
        </div>
      </CardContent>
    </Card>
  );
}
