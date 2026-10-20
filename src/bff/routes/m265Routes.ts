/**
 * 健澜科技 jlmedaios - M265 FHIR 网关深化
 *
 * FHIR 标准资源类型大写路径（Patient/Observation/Condition/MedicationRequest/Encounter/DiagnosticReport）
 * 返回带 resourceType 字段的 FHIR 格式 JSON，与小写路径并存以兼容 FHIR 规范。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

// FHIR Patient 资源 5 条
async function handleFhirPatient(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patients = [
    { resourceType: 'Patient', id: 'P-001', name: [ { family: '张', given: [ '三' ] } ], gender: 'male', birthDate: '1975-03-15' },
    { resourceType: 'Patient', id: 'P-002', name: [ { family: '李', given: [ '四' ] } ], gender: 'female', birthDate: '1980-07-22' },
    { resourceType: 'Patient', id: 'P-003', name: [ { family: '王', given: [ '五' ] } ], gender: 'male', birthDate: '1968-11-05' },
    { resourceType: 'Patient', id: 'P-004', name: [ { family: '赵', given: [ '六' ] } ], gender: 'female', birthDate: '1990-01-30' },
    { resourceType: 'Patient', id: 'P-005', name: [ { family: '陈', given: [ '七' ] } ], gender: 'male', birthDate: '1955-09-12' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: patients.length, entry: patients.map(p => ({ resource: p })) }));
}

// FHIR Observation 资源 5 条
async function handleFhirObservation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const observations = [
    { resourceType: 'Observation', id: 'O-001', status: 'final', code: { coding: [ { code: '8867-4', display: '心率' } ] }, valueQuantity: { value: 72, unit: '次/分' }, subject: { reference: 'Patient/P-001' }, effectiveDateTime: '2026-10-20T08:00:00+08:00' },
    { resourceType: 'Observation', id: 'O-002', status: 'final', code: { coding: [ { code: '8480-6', display: '收缩压' } ] }, valueQuantity: { value: 128, unit: 'mmHg' }, subject: { reference: 'Patient/P-002' }, effectiveDateTime: '2026-10-20T08:05:00+08:00' },
    { resourceType: 'Observation', id: 'O-003', status: 'final', code: { coding: [ { code: '8895-3', display: '舒张压' } ] }, valueQuantity: { value: 82, unit: 'mmHg' }, subject: { reference: 'Patient/P-002' }, effectiveDateTime: '2026-10-20T08:05:00+08:00' },
    { resourceType: 'Observation', id: 'O-004', status: 'final', code: { coding: [ { code: '8310-5', display: '体温' } ] }, valueQuantity: { value: 36.8, unit: '℃' }, subject: { reference: 'Patient/P-003' }, effectiveDateTime: '2026-10-20T09:00:00+08:00' },
    { resourceType: 'Observation', id: 'O-005', status: 'final', code: { coding: [ { code: '29463-7', display: '体重' } ] }, valueQuantity: { value: 65, unit: 'kg' }, subject: { reference: 'Patient/P-004' }, effectiveDateTime: '2026-10-20T09:30:00+08:00' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: observations.length, entry: observations.map(o => ({ resource: o })) }));
}

// FHIR Condition 资源 5 条
async function handleFhirCondition(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const conditions = [
    { resourceType: 'Condition', id: 'C-001', clinicalStatus: 'active', code: { coding: [ { code: 'E11.9', display: '2型糖尿病' } ] }, subject: { reference: 'Patient/P-001' }, onsetDateTime: '2023-06-01' },
    { resourceType: 'Condition', id: 'C-002', clinicalStatus: 'active', code: { coding: [ { code: 'I10', display: '原发性高血压' } ] }, subject: { reference: 'Patient/P-002' }, onsetDateTime: '2022-03-15' },
    { resourceType: 'Condition', id: 'C-003', clinicalStatus: 'resolved', code: { coding: [ { code: 'J20.9', display: '急性支气管炎' } ] }, subject: { reference: 'Patient/P-003' }, onsetDateTime: '2025-12-10', abatementDateTime: '2026-01-05' },
    { resourceType: 'Condition', id: 'C-004', clinicalStatus: 'active', code: { coding: [ { code: 'K76.0', display: '脂肪肝' } ] }, subject: { reference: 'Patient/P-004' }, onsetDateTime: '2024-08-20' },
    { resourceType: 'Condition', id: 'C-005', clinicalStatus: 'active', code: { coding: [ { code: 'M51.2', display: '腰椎间盘突出' } ] }, subject: { reference: 'Patient/P-005' }, onsetDateTime: '2024-05-10' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: conditions.length, entry: conditions.map(x => ({ resource: x })) }));
}

// FHIR MedicationRequest 资源 5 条
async function handleFhirMedicationRequest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const requests = [
    { resourceType: 'MedicationRequest', id: 'MR-001', status: 'active', intent: 'order', medicationCodeableConcept: { coding: [ { code: 'aspirin', display: '阿司匹林肠溶片' } ] }, subject: { reference: 'Patient/P-001' }, authoredOn: '2026-10-20T08:30:00+08:00', dosageInstruction: [ { text: '100mg 每日一次' } ] },
    { resourceType: 'MedicationRequest', id: 'MR-002', status: 'active', intent: 'order', medicationCodeableConcept: { coding: [ { code: 'metformin', display: '二甲双胍片' } ] }, subject: { reference: 'Patient/P-001' }, authoredOn: '2026-10-20T08:30:00+08:00', dosageInstruction: [ { text: '0.5g 每日三次' } ] },
    { resourceType: 'MedicationRequest', id: 'MR-003', status: 'completed', intent: 'order', medicationCodeableConcept: { coding: [ { code: 'amlodipine', display: '氨氯地平片' } ] }, subject: { reference: 'Patient/P-002' }, authoredOn: '2026-09-01T09:00:00+08:00', dosageInstruction: [ { text: '5mg 每日一次' } ] },
    { resourceType: 'MedicationRequest', id: 'MR-004', status: 'active', intent: 'order', medicationCodeableConcept: { coding: [ { code: 'atorvastatin', display: '阿托伐他汀钙片' } ] }, subject: { reference: 'Patient/P-003' }, authoredOn: '2026-10-19T10:00:00+08:00', dosageInstruction: [ { text: '20mg 每晚一次' } ] },
    { resourceType: 'MedicationRequest', id: 'MR-005', status: 'draft', intent: 'order', medicationCodeableConcept: { coding: [ { code: 'ibuprofen', display: '布洛芬缓释胶囊' } ] }, subject: { reference: 'Patient/P-005' }, authoredOn: '2026-10-20T11:00:00+08:00', dosageInstruction: [ { text: '0.3g 必要时' } ] },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: requests.length, entry: requests.map(r => ({ resource: r })) }));
}

// FHIR Encounter 资源 5 条
async function handleFhirEncounter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const encounters = [
    { resourceType: 'Encounter', id: 'E-001', status: 'finished', class: { code: 'AMB', display: '门诊' }, type: [ { coding: [ { code: 'FOLLOWUP', display: '复诊' } ] } ], subject: { reference: 'Patient/P-001' }, period: { start: '2026-10-20T08:00:00+08:00', end: '2026-10-20T08:30:00+08:00' } },
    { resourceType: 'Encounter', id: 'E-002', status: 'finished', class: { code: 'IMP', display: '住院' }, type: [ { coding: [ { code: 'ADMIT', display: '入院' } ] } ], subject: { reference: 'Patient/P-002' }, period: { start: '2026-10-10T14:00:00+08:00', end: '2026-10-18T10:00:00+08:00' } },
    { resourceType: 'Encounter', id: 'E-003', status: 'in-progress', class: { code: 'EMER', display: '急诊' }, type: [ { coding: [ { code: 'EMER', display: '急诊就诊' } ] } ], subject: { reference: 'Patient/P-003' }, period: { start: '2026-10-20T09:00:00+08:00' } },
    { resourceType: 'Encounter', id: 'E-004', status: 'finished', class: { code: 'AMB', display: '门诊' }, type: [ { coding: [ { code: 'CHECKUP', display: '体检' } ] } ], subject: { reference: 'Patient/P-004' }, period: { start: '2026-10-15T08:00:00+08:00', end: '2026-10-15T11:00:00+08:00' } },
    { resourceType: 'Encounter', id: 'E-005', status: 'finished', class: { code: 'AMB', display: '门诊' }, type: [ { coding: [ { code: 'WALKIN', display: '初诊' } ] } ], subject: { reference: 'Patient/P-005' }, period: { start: '2026-10-12T15:00:00+08:00', end: '2026-10-12T15:45:00+08:00' } },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: encounters.length, entry: encounters.map(e => ({ resource: e })) }));
}

// FHIR DiagnosticReport 资源 5 条
async function handleFhirDiagnosticReport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const reports = [
    { resourceType: 'DiagnosticReport', id: 'DR-001', status: 'final', code: { coding: [ { code: 'LAB', display: '血常规' } ] }, subject: { reference: 'Patient/P-001' }, issued: '2026-10-20T10:00:00+08:00', conclusion: 'WBC 6.5×10⁹/L，Hb 135g/L，PLT 220×10⁹/L，均在正常范围' },
    { resourceType: 'DiagnosticReport', id: 'DR-002', status: 'final', code: { coding: [ { code: 'IMG', display: '胸部 CT' } ] }, subject: { reference: 'Patient/P-002' }, issued: '2026-10-19T15:00:00+08:00', conclusion: '双肺未见明显异常，心影不大' },
    { resourceType: 'DiagnosticReport', id: 'DR-003', status: 'preliminary', code: { coding: [ { code: 'LAB', display: '肝功能' } ] }, subject: { reference: 'Patient/P-003' }, issued: '2026-10-20T11:00:00+08:00', conclusion: 'ALT 45 U/L 轻度升高，建议复查' },
    { resourceType: 'DiagnosticReport', id: 'DR-004', status: 'final', code: { coding: [ { code: 'LAB', display: '空腹血糖' } ] }, subject: { reference: 'Patient/P-001' }, issued: '2026-10-20T08:30:00+08:00', conclusion: '7.2 mmol/L ↑，建议内分泌科就诊' },
    { resourceType: 'DiagnosticReport', id: 'DR-005', status: 'final', code: { coding: [ { code: 'IMG', display: '腹部 B 超' } ] }, subject: { reference: 'Patient/P-004' }, issued: '2026-10-15T10:00:00+08:00', conclusion: '脂肪肝（轻度），胆囊未见异常' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: reports.length, entry: reports.map(r => ({ resource: r })) }));
}

export const m265Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/Patient', handle: handleFhirPatient, auth: true },
  { method: 'GET', path: '/api/v1/fhir/Observation', handle: handleFhirObservation, auth: true },
  { method: 'GET', path: '/api/v1/fhir/Condition', handle: handleFhirCondition, auth: true },
  { method: 'GET', path: '/api/v1/fhir/MedicationRequest', handle: handleFhirMedicationRequest, auth: true },
  { method: 'GET', path: '/api/v1/fhir/Encounter', handle: handleFhirEncounter, auth: true },
  { method: 'GET', path: '/api/v1/fhir/DiagnosticReport', handle: handleFhirDiagnosticReport, auth: true },
];
