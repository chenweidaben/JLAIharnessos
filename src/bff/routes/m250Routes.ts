/**
 * 健澜科技 jlmedaios - M250 FHIR 扩展 + 角色工作流
 *
 * FHIR Encounter/Procedure/DiagnosticReport + 医生/护士/药师工作流
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、FHIR 扩展资源 ==================== */

/** GET /api/v1/fhir/encounter - FHIR Encounter 资源 5 条 */
async function handleFhirEncounter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const encounters = [
    { resourceType: 'Encounter', id: 'E-001', patientId: 'P-001', class: 'outpatient', type: '心内科门诊', period: { start: '2026-10-20T08:30:00+08:00', end: '2026-10-20T09:00:00+08:00' }, status: 'finished' },
    { resourceType: 'Encounter', id: 'E-002', patientId: 'P-002', class: 'inpatient', type: '内分泌科住院', period: { start: '2026-10-15T10:00:00+08:00', end: null }, status: 'in-progress' },
    { resourceType: 'Encounter', id: 'E-003', patientId: 'P-003', class: 'emergency', type: '急诊内科', period: { start: '2026-10-18T14:20:00+08:00', end: '2026-10-19T08:00:00+08:00' }, status: 'finished' },
    { resourceType: 'Encounter', id: 'E-004', patientId: 'P-004', class: 'outpatient', type: '骨科门诊', period: { start: '2026-10-20T10:00:00+08:00', end: '2026-10-20T10:30:00+08:00' }, status: 'finished' },
    { resourceType: 'Encounter', id: 'E-005', patientId: 'P-005', class: 'outpatient', type: '全科门诊', period: { start: '2026-10-20T11:00:00+08:00', end: null }, status: 'in-progress' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: encounters.length, entry: encounters }));
}

/** GET /api/v1/fhir/procedure - FHIR Procedure 资源 5 条 */
async function handleFhirProcedure(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const procedures = [
    { resourceType: 'Procedure', id: 'PR-001', patientId: 'P-001', code: { icd9: '88.55', display: '冠脉造影（CAG）' }, status: 'completed', performed: '2026-10-18T14:00:00+08:00', recorder: '李医生（心内科）' },
    { resourceType: 'Procedure', id: 'PR-002', patientId: 'P-001', code: { icd9: '36.06', display: '冠脉支架植入（PCI）' }, status: 'completed', performed: '2026-10-18T15:30:00+08:00', recorder: '李医生（心内科）' },
    { resourceType: 'Procedure', id: 'PR-003', patientId: 'P-003', code: { icd9: '93.90', display: '胸腔穿刺引流' }, status: 'completed', performed: '2026-10-18T16:00:00+08:00', recorder: '王医生（急诊）' },
    { resourceType: 'Procedure', id: 'PR-004', patientId: 'P-002', code: { icd9: '89.28', display: '动态血糖监测（CGM）植入' }, status: 'completed', performed: '2026-10-16T11:00:00+08:00', recorder: '赵医生（内分泌）' },
    { resourceType: 'Procedure', id: 'PR-005', patientId: 'P-004', code: { icd9: '83.01', display: '腰椎 MRI 引导下封闭注射' }, status: 'in-progress', performed: '2026-10-20T10:15:00+08:00', recorder: '陈医生（骨科）' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: procedures.length, entry: procedures }));
}

/** GET /api/v1/fhir/diagnosticreport - FHIR DiagnosticReport 资源 5 条 */
async function handleFhirDiagnosticReport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { resourceType: 'DiagnosticReport', id: 'DR-001', patientId: 'P-001', code: { loinc: '30746-1', display: '胸部 CT（平扫）' }, status: 'final', issued: '2026-10-20T09:30:00+08:00', result: '双肺未见明显异常，心影不大' },
    { resourceType: 'DiagnosticReport', id: 'DR-002', patientId: 'P-001', code: { loinc: '24321-2', display: '血常规（五分类）' }, status: 'final', issued: '2026-10-20T08:50:00+08:00', result: 'WBC 6.5×10⁹/L，Hb 135g/L，PLT 220×10⁹/L，均正常' },
    { resourceType: 'DiagnosticReport', id: 'DR-003', patientId: 'P-002', code: { loinc: '2345-7', display: '空腹血糖' }, status: 'final', issued: '2026-10-20T07:30:00+08:00', result: '7.2 mmol/L（↑，糖尿病控制不佳）' },
    { resourceType: 'DiagnosticReport', id: 'DR-004', patientId: 'P-003', code: { loinc: '89579-7', display: '血气分析' }, status: 'final', issued: '2026-10-18T15:00:00+08:00', result: 'pH 7.42，PaO₂ 85mmHg，PaCO₂ 38mmHg' },
    { resourceType: 'DiagnosticReport', id: 'DR-005', patientId: 'P-004', code: { loinc: '36643-5', display: '腰椎 MRI' }, status: 'preliminary', issued: '2026-10-20T10:25:00+08:00', result: 'L4/5 椎间盘轻度膨出（待最终报告）' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: reports.length, entry: reports }));
}

/* ==================== 二、角色工作流 ==================== */

/** GET /api/v1/workflow/doctor - 医生工作流 */
async function handleWorkflowDoctor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const workflow = {
    role: 'doctor',
    pendingPatients: 12,
    inProgressPatients: 3,
    completedPatients: 28,
    todayStats: {
      totalVisits: 43,
      avgVisitTime: '8.5 分钟',
      prescriptionsIssued: 35,
      referrals: 5,
    },
  };

  return json(ok(workflow));
}

/** GET /api/v1/workflow/nurse - 护士工作流 */
async function handleWorkflowNurse(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const workflow = {
    role: 'nurse',
    pendingTasks: 18,
    inProgressTasks: 6,
    completedTasks: 64,
    todayStats: {
      totalTasks: 88,
      medicationAdmin: 42,
      vitalSigns: 25,
      dressingChanges: 8,
      other: 13,
    },
  };

  return json(ok(workflow));
}

/** GET /api/v1/workflow/pharmacist - 药师工作流 */
async function handleWorkflowPharmacist(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const workflow = {
    role: 'pharmacist',
    pendingPrescriptions: 9,
    reviewedPrescriptions: 52,
    returnedPrescriptions: 2,
    todayStats: {
      totalPrescriptions: 63,
      interactionAlerts: 4,
      doseAlerts: 3,
      contraindicationAlerts: 1,
    },
  };

  return json(ok(workflow));
}

export const m250Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/encounter', handle: handleFhirEncounter, auth: true },
  { method: 'GET', path: '/api/v1/fhir/procedure', handle: handleFhirProcedure, auth: true },
  { method: 'GET', path: '/api/v1/fhir/diagnosticreport', handle: handleFhirDiagnosticReport, auth: true },
  { method: 'GET', path: '/api/v1/workflow/doctor', handle: handleWorkflowDoctor, auth: true },
  { method: 'GET', path: '/api/v1/workflow/nurse', handle: handleWorkflowNurse, auth: true },
  { method: 'GET', path: '/api/v1/workflow/pharmacist', handle: handleWorkflowPharmacist, auth: true },
];
