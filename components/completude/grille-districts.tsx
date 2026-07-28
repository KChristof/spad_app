import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatutBadge, BadgeNonDeploye } from './statut-badge';
import type { DashboardState } from '@/lib/data/dashboard';
import type { District } from '@/lib/referentiel/types';
import { FORMULAIRES, isDeploye } from '@/lib/kobo/formulaires';

export function GrilleDistricts({
  districts,
  state,
}: {
  districts: District[];
  state: DashboardState;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[200px]">District</TableHead>
          {FORMULAIRES.map((f) => (
            <TableHead key={f.id} className="text-center whitespace-nowrap" title={f.libelle}>
              {f.libelleCourt}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {districts.map((d) => (
          <TableRow key={d.code}>
            <TableCell>
              <Link href={`/districts/${d.code}`} className="text-sm font-medium text-primary hover:underline">
                {d.libelle} <span className="text-muted-foreground text-xs font-normal">({d.codeId})</span>
              </Link>
            </TableCell>
            {FORMULAIRES.map((f) => {
              const deploye = isDeploye(f.id);
              const ag = state.agregatsDistrict.find(
                (a) => a.cle === d.code && a.formulaireId === f.id,
              );
              // F07 : cible plancher, jamais d'excès — on affiche « X / Y minimum »
              if (f.id === 'F07') {
                const c = state.f07ParDistrict.find((x) => x.districtCode === d.code);
                if (!deploye) return <TableCell key={f.id} className="text-center"><BadgeNonDeploye /></TableCell>;
                if (!c) return <TableCell key={f.id} className="text-center">—</TableCell>;
                const label = c.cibleMinimum === 0
                  ? '—'
                  : `${c.nbRecu} / ${c.cibleMinimum} min.`;
                return (
                  <TableCell key={f.id} className="text-center">
                    <StatutBadge statut={c.statut} compact />
                    <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">{label}</div>
                  </TableCell>
                );
              }
              return (
                <TableCell key={f.id} className="text-center">
                  {!deploye ? (
                    <BadgeNonDeploye />
                  ) : ag ? (
                    <StatutBadge statut={ag.statut} taux={ag.taux} compact />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
