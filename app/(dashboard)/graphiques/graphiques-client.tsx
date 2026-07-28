'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormulaireId } from '@/lib/referentiel/types';
import type { StatutCompletude } from '@/lib/completude/types';

interface Point {
  formulaireId: FormulaireId;
  formulaireLibelle: string;
  formulaireLibelleCourt: string;
  districtCode: string;
  districtLibelle: string;
  districtCodeId: string;
  taux: number | null;
  nbRecu: number;
  nbAttendu: number;
  statut: StatutCompletude;
}

const COULEURS_STATUT: Record<StatutCompletude, string> = {
  zero: '#dc2626',
  partiel: '#f59e0b',
  plein: '#16a34a',
  exces: '#7c3aed',
  nonConcerne: '#9ca3af',
  neutre: '#9ca3af',
};

const LIB_STATUT: Record<StatutCompletude, string> = {
  zero: '0 %',
  partiel: 'En cours',
  plein: 'Cible atteinte',
  exces: 'À vérifier',
  nonConcerne: 'Non concerné',
  neutre: 'Non applicable',
};

export function GraphiquesClient({
  donnees,
  formulairesDisponibles,
  districtsDisponibles,
}: {
  donnees: Point[];
  formulairesDisponibles: { id: FormulaireId; libelle: string }[];
  districtsDisponibles: { code: string; libelle: string; codeId: string }[];
}) {
  const [fidsSel, setFidsSel] = useState<Set<FormulaireId>>(
    new Set(formulairesDisponibles.map((f) => f.id)),
  );
  const [distSel, setDistSel] = useState<Set<string>>(
    new Set(districtsDisponibles.map((d) => d.code)),
  );

  const donneesFiltrees = useMemo(
    () => donnees.filter((p) => fidsSel.has(p.formulaireId) && distSel.has(p.districtCode)),
    [donnees, fidsSel, distSel],
  );

  // Barres : taux (%) par district × formulaire — dataKey = f.id (unique)
  const dataBarres = useMemo(() => {
    const parDistrict = new Map<string, Record<string, string | number>>();
    for (const p of donneesFiltrees) {
      const key = p.districtLibelle;
      if (!parDistrict.has(key)) parDistrict.set(key, { district: key });
      const row = parDistrict.get(key)!;
      row[p.formulaireId] = p.taux !== null ? Math.round(p.taux * 100) : 0;
    }
    return Array.from(parDistrict.values());
  }, [donneesFiltrees]);

  // Donut : répartition des statuts (toutes lignes filtrées confondues)
  const dataDonut = useMemo(() => {
    const compte = new Map<StatutCompletude, number>();
    for (const p of donneesFiltrees) {
      compte.set(p.statut, (compte.get(p.statut) ?? 0) + 1);
    }
    return Array.from(compte.entries()).map(([statut, count]) => ({
      statut,
      count,
      libelle: LIB_STATUT[statut],
    }));
  }, [donneesFiltrees]);

  const toggle = <T,>(set: Set<T>, v: T, apply: (s: Set<T>) => void) => {
    const s = new Set(set);
    if (s.has(v)) s.delete(v);
    else s.add(v);
    apply(s);
  };

  const couleursFormulaires: Record<string, string> = {};
  const palette = ['#0f766e', '#0369a1', '#7c3aed', '#dc2626', '#f59e0b', '#059669'];
  formulairesDisponibles.forEach((f, i) => {
    couleursFormulaires[f.id] = palette[i % palette.length];
  });

  return (
    <>
      {/* Filtres */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filtres</CardTitle>
          <CardDescription className="text-xs">
            Cliquer pour activer/désactiver — les graphiques se mettent à jour immédiatement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1.5">
              Formulaires ({fidsSel.size}/{formulairesDisponibles.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {formulairesDisponibles.map((f) => {
                const actif = fidsSel.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggle(fidsSel, f.id, setFidsSel)}
                    className={
                      actif
                        ? 'rounded-md border border-primary/40 bg-primary/10 text-primary px-2 py-1 text-xs'
                        : 'rounded-md border bg-muted/40 text-muted-foreground px-2 py-1 text-xs hover:bg-muted'
                    }
                  >
                    {f.libelle}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1.5">
              Districts ({distSel.size}/{districtsDisponibles.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDistSel(new Set(districtsDisponibles.map((d) => d.code)))}
                className="rounded-md border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={() => setDistSel(new Set())}
                className="rounded-md border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
              >
                Aucun
              </button>
              {districtsDisponibles.map((d) => {
                const actif = distSel.has(d.code);
                return (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => toggle(distSel, d.code, setDistSel)}
                    className={
                      actif
                        ? 'rounded-md border border-primary/40 bg-primary/10 text-primary px-2 py-1 text-xs'
                        : 'rounded-md border bg-muted/40 text-muted-foreground px-2 py-1 text-xs hover:bg-muted'
                    }
                  >
                    {d.libelle}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Taux de complétude (%) — district × formulaire</CardTitle>
            <CardDescription>Comparaison visuelle des taux agrégés par district.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataBarres} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip formatter={(v) => (v == null ? '—' : `${v} %`)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {formulairesDisponibles
                    .filter((f) => fidsSel.has(f.id))
                    .map((f) => (
                      <Bar
                        key={f.id}
                        dataKey={f.id}
                        name={f.libelle}
                        fill={couleursFormulaires[f.id]}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des statuts</CardTitle>
            <CardDescription>Combien de couples (établissement × formulaire) dans chaque statut.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataDonut}
                    dataKey="count"
                    nameKey="libelle"
                    innerRadius={60}
                    outerRadius={100}
                    label={(entry: { libelle?: string; count?: number }) =>
                      `${entry.libelle ?? ''} : ${entry.count ?? 0}`
                    }
                  >
                    {dataDonut.map((d) => (
                      <Cell key={d.statut} fill={COULEURS_STATUT[d.statut]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
