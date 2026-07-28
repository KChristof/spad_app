import 'server-only';
import referentielData from '@/data/referentiel.json';
import type {
  District,
  Enqueteur,
  Etablissement,
  Referentiel,
  Region,
  Superviseur,
} from './types';

const REFERENTIEL = referentielData as unknown as Referentiel;

export function getReferentiel(): Referentiel {
  return REFERENTIEL;
}

export function getRegions(): Region[] {
  return REFERENTIEL.regions;
}

export function getDistricts(): District[] {
  return REFERENTIEL.districts;
}

export function getEnqueteurs(): Enqueteur[] {
  return REFERENTIEL.enqueteurs;
}

export function getSuperviseurs(): Superviseur[] {
  return REFERENTIEL.superviseurs;
}

export function getEtablissements(): Etablissement[] {
  return REFERENTIEL.etablissements;
}

export function getEtablissementByCode(code: string): Etablissement | undefined {
  return REFERENTIEL.etablissements.find((e) => e.code === code);
}

export function getDistrictByCode(code: string): District | undefined {
  return REFERENTIEL.districts.find((d) => d.code === code);
}

export function getRegionByCode(code: string): Region | undefined {
  return REFERENTIEL.regions.find((r) => r.code === code);
}

export function getEnqueteurByCode(code: string): Enqueteur | undefined {
  return REFERENTIEL.enqueteurs.find((e) => e.code === code);
}

export function getSuperviseurByCode(code: string): Superviseur | undefined {
  return REFERENTIEL.superviseurs.find((s) => s.code === code);
}

export function getEnqueteursDuDistrict(districtCode: string): Enqueteur[] {
  return REFERENTIEL.enqueteurs.filter((e) => e.districtCode === districtCode);
}

export function getSuperviseurDuDistrict(districtCode: string): Superviseur | undefined {
  return REFERENTIEL.superviseurs.find((s) => s.districtCode === districtCode);
}

export function getEtablissementsDuDistrict(districtCode: string): Etablissement[] {
  return REFERENTIEL.etablissements.filter((e) => e.districtCode === districtCode);
}

export function getEtablissementsDuEnqueteur(enqueteurCode: string): Etablissement[] {
  return REFERENTIEL.etablissements.filter((e) => e.enqueteurCode === enqueteurCode);
}

export function getDistrictsDeLaRegion(regionCode: string): District[] {
  return REFERENTIEL.districts.filter((d) => d.regionCode === regionCode);
}
