/**
 * 健澜科技 jlmedaios - FHIR R4 Patient API（M541，P0）
 *
 * 对接真实 BFF：GET /api/v1/fhir/Patient/:id（注意大写 Patient），未知 id → 404 OperationOutcome。
 * 种子 P10001 张建国 / P10002 王秀兰 / P10003 李伟。
 * BFF 不可用或 404 时返回本地三种子镜像并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface FhirIdentifier {
  system?: string;
  value?: string;
}

export interface FhirHumanName {
  use?: string;
  family?: string;
  given?: string[];
}

export interface FhirAddress {
  line?: string[];
  city?: string;
}

export type FhirGender = 'male' | 'female' | 'other' | 'unknown';

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta?: { versionId?: string; lastUpdated?: string };
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  gender?: FhirGender;
  birthDate?: string;
  address?: FhirAddress[];
}

export const FHIR_GENDER_LABEL: Record<FhirGender, string> = {
  male: '男',
  female: '女',
  other: '其他',
  unknown: '未知',
};

export function patientDisplayName(p: FhirPatient | null | undefined): string {
  if (!p?.name?.length) return p?.id ?? '—';
  const n = p.name[0];
  return `${n.family ?? ''}${(n.given ?? []).join('')}`;
}

export function addressText(a: FhirAddress | undefined): string {
  if (!a) return '—';
  return `${(a.line ?? []).join('')}${a.city ?? ''}`;
}

/** DEMO 兜底三种子镜像（与后端 m541Routes.ts 种子一致） */
export const FHIR_PATIENT_PREVIEW: FhirPatient[] = [
  {
    resourceType: 'Patient',
    id: 'P10001',
    identifier: [{ system: 'http://hospital.example.cn/mrn', value: 'MRN-2026-001' }],
    name: [{ use: 'official', family: '张', given: ['建国'] }],
    gender: 'male',
    birthDate: '1958-03-15',
    address: [{ line: ['杭州市西湖区'], city: '杭州' }],
  },
  {
    resourceType: 'Patient',
    id: 'P10002',
    identifier: [{ system: 'http://hospital.example.cn/mrn', value: 'MRN-2026-002' }],
    name: [{ use: 'official', family: '王', given: ['秀兰'] }],
    gender: 'female',
    birthDate: '1965-07-22',
    address: [{ line: ['杭州市拱墅区'], city: '杭州' }],
  },
  {
    resourceType: 'Patient',
    id: 'P10003',
    identifier: [{ system: 'http://hospital.example.cn/mrn', value: 'MRN-2026-003' }],
    name: [{ use: 'official', family: '李', given: ['伟'] }],
    gender: 'male',
    birthDate: '1990-11-08',
    address: [{ line: ['杭州市滨江区'], city: '杭州' }],
  },
];

export interface FhirPatientResult {
  patient: FhirPatient;
  demo: boolean;
}

export async function fetchFhirPatient(id: string): Promise<FhirPatientResult> {
  try {
    const p = await get<FhirPatient>(`/fhir/Patient/${id}`);
    return { patient: p, demo: false };
  } catch {
    const mirror = FHIR_PATIENT_PREVIEW.find((x) => x.id === id) ?? FHIR_PATIENT_PREVIEW[0];
    return { patient: mirror, demo: true };
  }
}
