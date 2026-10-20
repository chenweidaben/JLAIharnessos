/**
 * 健澜科技 jlmedaios - FHIR 资源交换监控看板 API（M507）
 * 对接 BFF /api/v1/fhir/* ：
 *   /fhir/patient       Patient 资源
 *   /fhir/observation   Observation 资源
 *   /fhir/consistency   一致性监控
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface PatientResource {
  id: string;
  resourceType: string;
  fhirId: string;
  name: string;
  gender: 'male' | 'female';
  birthDate: string;
  demo?: boolean;
}

export interface ObservationResource {
  id: string;
  resourceType: string;
  fhirId: string;
  code: string;
  value: string;
  status: 'final' | 'registered';
  demo?: boolean;
}

export interface ConsistencyRow {
  id: string;
  resourceType: string;
  count: number;
  successRate: number; // %
  demo?: boolean;
}

const DEMO_PATIENT: PatientResource[] = [
  { id: 'p-1', resourceType: 'Patient', fhirId: 'Patient/100001', name: '张**', gender: 'male', birthDate: '1958-03-12', demo: true },
  { id: 'p-2', resourceType: 'Patient', fhirId: 'Patient/100002', name: '李**', gender: 'female', birthDate: '1965-07-25', demo: true },
  { id: 'p-3', resourceType: 'Patient', fhirId: 'Patient/100003', name: '王**', gender: 'male', birthDate: '1972-11-08', demo: true },
];

const DEMO_OBSERVATION: ObservationResource[] = [
  { id: 'o-1', resourceType: 'Observation', fhirId: 'Observation/200001', code: '白细胞计数', value: '6.5 10^9/L', status: 'final', demo: true },
  { id: 'o-2', resourceType: 'Observation', fhirId: 'Observation/200002', code: '血红蛋白', value: '138 g/L', status: 'final', demo: true },
  { id: 'o-3', resourceType: 'Observation', fhirId: 'Observation/200003', code: '收缩压', value: '132 mmHg', status: 'registered', demo: true },
];

const DEMO_CONSISTENCY: ConsistencyRow[] = [
  { id: 'c-1', resourceType: 'Patient', count: 1280, successRate: 99.5, demo: true },
  { id: 'c-2', resourceType: 'Observation', count: 8640, successRate: 98.7, demo: true },
  { id: 'c-3', resourceType: 'Condition', count: 1450, successRate: 99.1, demo: true },
  { id: 'c-4', resourceType: 'MedicationRequest', count: 3200, successRate: 93.5, demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchPatient = () => safeGet<PatientResource>('/fhir/patient', DEMO_PATIENT);
export const fetchObservation = () => safeGet<ObservationResource>('/fhir/observation', DEMO_OBSERVATION);
export const fetchConsistency = () => safeGet<ConsistencyRow>('/fhir/consistency', DEMO_CONSISTENCY);
