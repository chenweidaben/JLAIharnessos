/**
 * 健澜科技 jlmedaios - M249 FHIR 网关 + 事件总线扩展
 *
 * FHIR Patient/Observation/Condition/MedicationRequest + 事件总线统计/审计
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、FHIR 网关 ==================== */

/** GET /api/v1/fhir/patient - FHIR Patient 资源 5 条 */
async function handleFhirPatient(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patients = [
    { resourceType: 'Patient', id: 'P-001', name: '张***', gender: 'male', birthDate: '1958-03-15', address: '浙江省杭州市西湖区***' },
    { resourceType: 'Patient', id: 'P-002', name: '李***', gender: 'female', birthDate: '1965-07-22', address: '浙江省杭州市拱墅区***' },
    { resourceType: 'Patient', id: 'P-003', name: '王***', gender: 'male', birthDate: '1972-11-08', address: '浙江省杭州市滨江区***' },
    { resourceType: 'Patient', id: 'P-004', name: '赵***', gender: 'female', birthDate: '1980-01-30', address: '浙江省杭州市余杭区***' },
    { resourceType: 'Patient', id: 'P-005', name: '陈***', gender: 'male', birthDate: '1990-05-12', address: '浙江省杭州市上城区***' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: patients.length, entry: patients }));
}

/** GET /api/v1/fhir/observation - FHIR Observation 资源 5 条 */
async function handleFhirObservation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const observations = [
    { resourceType: 'Observation', id: 'O-001', patientId: 'P-001', code: { loinc: '8867-4', display: '心率' }, value: 72, unit: '次/分', effectiveDateTime: '2026-10-20T08:30:00+08:00' },
    { resourceType: 'Observation', id: 'O-002', patientId: 'P-001', code: { loinc: '8480-6', display: '收缩压' }, value: 135, unit: 'mmHg', effectiveDateTime: '2026-10-20T08:30:00+08:00' },
    { resourceType: 'Observation', id: 'O-003', patientId: 'P-002', code: { loinc: '8462-4', display: '舒张压' }, value: 82, unit: 'mmHg', effectiveDateTime: '2026-10-20T09:00:00+08:00' },
    { resourceType: 'Observation', id: 'O-004', patientId: 'P-003', code: { loinc: '2345-7', display: '血糖（空腹）' }, value: 6.1, unit: 'mmol/L', effectiveDateTime: '2026-10-20T07:00:00+08:00' },
    { resourceType: 'Observation', id: 'O-005', patientId: 'P-004', code: { loinc: '20150-9', display: 'BMI' }, value: 24.5, unit: 'kg/m²', effectiveDateTime: '2026-10-20T10:00:00+08:00' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: observations.length, entry: observations }));
}

/** GET /api/v1/fhir/condition - FHIR Condition 资源 5 条 */
async function handleFhirCondition(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const conditions = [
    { resourceType: 'Condition', id: 'C-001', patientId: 'P-001', code: { icd10: 'I25.101', display: '冠状动脉粥样硬化性心脏病' }, severity: 'moderate', clinicalStatus: 'active', onsetDateTime: '2024-06-01' },
    { resourceType: 'Condition', id: 'C-002', patientId: 'P-001', code: { icd10: 'I10.x05', display: '高血压 2 级' }, severity: 'mild', clinicalStatus: 'active', onsetDateTime: '2020-03-15' },
    { resourceType: 'Condition', id: 'C-003', patientId: 'P-002', code: { icd10: 'E11.901', display: '2 型糖尿病' }, severity: 'moderate', clinicalStatus: 'active', onsetDateTime: '2019-08-20' },
    { resourceType: 'Condition', id: 'C-004', patientId: 'P-003', code: { icd10: 'J18.900', display: '肺炎' }, severity: 'severe', clinicalStatus: 'resolved', onsetDateTime: '2026-09-10' },
    { resourceType: 'Condition', id: 'C-005', patientId: 'P-004', code: { icd10: 'M54.500', display: '腰痛' }, severity: 'mild', clinicalStatus: 'active', onsetDateTime: '2026-01-10' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: conditions.length, entry: conditions }));
}

/** GET /api/v1/fhir/medicationrequest - FHIR MedicationRequest 资源 5 条 */
async function handleFhirMedicationRequest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const meds = [
    { resourceType: 'MedicationRequest', id: 'MR-001', patientId: 'P-001', medication: '阿司匹林肠溶片', status: 'active', dosageInstruction: '100mg po qd' },
    { resourceType: 'MedicationRequest', id: 'MR-002', patientId: 'P-001', medication: '阿托伐他汀钙片', status: 'active', dosageInstruction: '20mg po qn' },
    { resourceType: 'MedicationRequest', id: 'MR-003', patientId: 'P-002', medication: '二甲双胍片', status: 'active', dosageInstruction: '0.5g po bid' },
    { resourceType: 'MedicationRequest', id: 'MR-004', patientId: 'P-003', medication: '头孢呋辛酯片', status: 'completed', dosageInstruction: '0.25g po bid x 7 天' },
    { resourceType: 'MedicationRequest', id: 'MR-005', patientId: 'P-004', medication: '布洛芬缓释胶囊', status: 'cancelled', dosageInstruction: '0.3g po bid（已停，改理疗）' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: meds.length, entry: meds }));
}

/* ==================== 二、事件总线 ==================== */

/** GET /api/v1/events/bus - 事件总线统计 */
async function handleEventsBus(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const stats = {
    totalEvents: '1,286,540 条（今日）',
    eventTypes: 28,
    avgConsumerLatency: '120 ms',
    failureRate: '0.03%',
    topics: ['patient.created', 'emr.updated', 'medication.prescribed', 'lab.result.ready', 'imaging.report.done'],
  };

  return json(ok(stats));
}

/** GET /api/v1/events/audit - 事件审计日志 5 条 */
async function handleEventsAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const logs = [
    { id: 'EVT-001', eventId: 'evt-20261020-001', type: 'patient.created', producer: 'HIS', consumer: 'CDS + 护理系统', time: '2026-10-20 08:30:01', status: 'success' },
    { id: 'EVT-002', eventId: 'evt-20261020-002', type: 'emr.updated', producer: 'EMR', consumer: '质控系统', time: '2026-10-20 09:15:33', status: 'success' },
    { id: 'EVT-003', eventId: 'evt-20261020-003', type: 'medication.prescribed', producer: 'CPOE', consumer: 'CDS 相互作用检查', time: '2026-10-20 09:30:12', status: 'success' },
    { id: 'EVT-004', eventId: 'evt-20261020-004', type: 'lab.result.ready', producer: 'LIS', consumer: 'EMR + CDS', time: '2026-10-20 10:00:45', status: 'success' },
    { id: 'EVT-005', eventId: 'evt-20261020-005', type: 'imaging.report.done', producer: 'PACS', consumer: 'EMR', time: '2026-10-20 10:20:08', status: 'failed（消费者超时，已重试）' },
  ];

  return json(ok({ logs, totalCount: logs.length }));
}

export const m249Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/patient', handle: handleFhirPatient, auth: true },
  { method: 'GET', path: '/api/v1/fhir/observation', handle: handleFhirObservation, auth: true },
  { method: 'GET', path: '/api/v1/fhir/condition', handle: handleFhirCondition, auth: true },
  { method: 'GET', path: '/api/v1/fhir/medicationrequest', handle: handleFhirMedicationRequest, auth: true },
  { method: 'GET', path: '/api/v1/events/bus', handle: handleEventsBus, auth: true },
  { method: 'GET', path: '/api/v1/events/audit', handle: handleEventsAudit, auth: true },
];
