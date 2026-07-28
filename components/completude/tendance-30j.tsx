'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useMemo } from 'react';

interface SeriePoint {
  date: string;
  taux: number | null;
}

interface Props {
  series: { id: string; libelle: string; couleur: string; points: SeriePoint[] }[];
  minJoursPourAfficher?: number;
}

export function Tendance30j({ series, minJoursPourAfficher = 2 }: Props) {
  const data = useMemo(() => {
    const allDates = new Set<string>();
    series.forEach((s) => s.points.forEach((p) => allDates.add(p.date.slice(0, 10))));
    const sorted = Array.from(allDates).sort();
    return sorted.map((d) => {
      const row: Record<string, string | number | null> = { date: d };
      for (const s of series) {
        const p = s.points.find((x) => x.date.slice(0, 10) === d);
        row[s.id] = p && p.taux !== null ? Math.round(p.taux * 100) : null;
      }
      return row;
    });
  }, [series]);

  if (data.length < minJoursPourAfficher) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Historique en cours de constitution.
        <br />
        <span className="text-xs">Un snapshot par jour — la courbe apparaîtra dès que 2 jours seront disponibles.</span>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(v) => (v == null ? '—' : `${v} %`)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={s.couleur}
              strokeWidth={2}
              dot={false}
              name={s.libelle}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
