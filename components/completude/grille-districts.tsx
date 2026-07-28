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
import { FORMULAIRES } from '@/lib/kobo/formulaires';
import { isDeploye } from '@/lib/kobo/formulaires';

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
          <TableHead>District</TableHead>
          {FORMULAIRES.map((f) => (
            <TableHead key={f.id} className="text-center">{f.id}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {districts.map((d) => (
          <TableRow key={d.code}>
            <TableCell>
              <Link href={`/districts/${d.code}`} className="text-sm font-medium text-primary hover:underline">
                {d.libelle} ({d.codeId})
              </Link>
            </TableCell>
            {FORMULAIRES.map((f) => {
              const deploye = isDeploye(f.id);
              const ag = state.agregatsDistrict.find(
                (a) => a.cle === d.code && a.formulaireId === f.id,
              );
              // F07 : pas d'agrégat classique — on affiche le nb de fiches / cohérence
              if (f.id === 'F07') {
                const c = state.f07Coherence.find((x) => x.districtCode === d.code);
                if (!deploye) return <TableCell key={f.id} className="text-center"><BadgeNonDeploye /></TableCell>;
                return (
                  <TableCell key={f.id} className="text-center">
                    <span className={c && c.ecart > 0 ? 'text-statut-partiel font-medium' : ''}>
                      {c?.nbF07 ?? 0}
                      {c && c.ecart > 0 && <sup className="ml-0.5 text-xs">−{c.ecart}</sup>}
                    </span>
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
