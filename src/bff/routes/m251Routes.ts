/**
 * 健澜科技 jlmedaios - M251 FHIR 深化 + 病历版本
 *
 * FHIR DocumentReference/AllergyIntolerance/Immunization + 病历版本 diff/compare/restore
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、FHIR 深化资源 ==================== */

/** GET /api/v1/fhir/documentref - FHIR DocumentReference 资源 5 条 */
async function handleFhirDocumentRef(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const docs = [
    { resourceType: 'DocumentReference', id: 'DR-001', patientId: 'P-001', type: 'EMR 入院记录', created: '2026-10-18T10:00:00+08:00', status: 'current', description: '张*** 入院记录（冠心病）' },
    { resourceType: 'DocumentReference', id: 'DR-002', patientId: 'P-001', type: '手术记录', created: '2026-10-18T16:00:00+08:00', status: 'current', description: 'CAG + PCI 手术记录' },
    { resourceType: 'DocumentReference', id: 'DR-003', patientId: 'P-002', type: '影像报告', created: '2026-10-20T09:30:00+08:00', status: 'current', description: '胸部 CT（平扫）报告' },
    { resourceType: 'DocumentReference', id: 'DR-004', patientId: 'P-003', type: '检验报告', created: '2026-10-18T15:00:00+08:00', status: 'current', description: '血气分析报告' },
    { resourceType: 'DocumentReference', id: 'DR-005', patientId: 'P-004', type: 'EMR 既往版本', created: '2026-01-15T10:00:00+08:00', status: 'superseded', description: '腰痛首诊记录（已被修订版替代）' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: docs.length, entry: docs }));
}

/** GET /api/v1/fhir/allergyintolerance - FHIR AllergyIntolerance 资源 5 条 */
async function handleFhirAllergyIntolerance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const allergies = [
    { resourceType: 'AllergyIntolerance', id: 'AI-001', patientId: 'P-001', code: { rxnorm: 'RXNORM:161', display: '青霉素（青霉素 G）' }, criticality: 'high', clinicalStatus: 'active' },
    { resourceType: 'AllergyIntolerance', id: 'AI-002', patientId: 'P-001', code: { rxnorm: 'RXNORM:31416', display: '磺胺类药物' }, criticality: 'high', clinicalStatus: 'active' },
    { resourceType: 'AllergyIntolerance', id: 'AI-003', patientId: 'P-002', code: { rxnorm: 'RXNORM:31416', display: '海鲜（虾蟹）' }, criticality: 'low', clinicalStatus: 'active' },
    { resourceType: 'AllergyIntolerance', id: 'AI-004', patientId: 'P-003', code: { rxnorm: 'RXNORM:161', display: '头孢类药物' }, criticality: 'high', clinicalStatus: 'active' },
    { resourceType: 'AllergyIntolerance', id: 'AI-005', patientId: 'P-004', code: { rxnorm: 'RXNORM:31416', display: '花粉（春季）' }, criticality: 'low', clinicalStatus: 'resolved' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: allergies.length, entry: allergies }));
}

/** GET /api/v1/fhir/immunization - FHIR Immunization 资源 5 条 */
async function handleFhirImmunization(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const immunizations = [
    { resourceType: 'Immunization', id: 'IMM-001', patientId: 'P-001', vaccineCode: { cvx: 'CVX-213', display: '新冠灭活疫苗（加强针）' }, status: 'completed', occurrenceDateTime: '2024-03-15T10:00:00+08:00' },
    { resourceType: 'Immunization', id: 'IMM-002', patientId: 'P-001', vaccineCode: { cvx: 'CVX-140', display: '流感疫苗（2025-2026 季）' }, status: 'completed', occurrenceDateTime: '2025-10-20T10:00:00+08:00' },
    { resourceType: 'Immunization', id: 'IMM-003', patientId: 'P-002', vaccineCode: { cvx: 'CVX-083', display: '带状疱疹疫苗（重组）' }, status: 'completed', occurrenceDateTime: '2025-06-10T10:00:00+08:00' },
    { resourceType: 'Immunization', id: 'IMM-004', patientId: 'P-003', vaccineCode: { cvx: 'CVX-213', display: '新冠灭活疫苗（第 2 剂）' }, status: 'completed', occurrenceDateTime: '2024-02-20T10:00:00+08:00' },
    { resourceType: 'Immunization', id: 'IMM-005', patientId: 'P-004', vaccineCode: { cvx: 'CVX-140', display: '流感疫苗（2025-2026 季）' }, status: 'entered-in-error', occurrenceDateTime: '2025-10-22T10:00:00+08:00' },
  ];

  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: immunizations.length, entry: immunizations }));
}

/* ==================== 二、病历版本管理 ==================== */

/** GET /api/v1/emr/version-diff - 病历版本 diff */
async function handleEmrVersionDiff(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const diff = {
    medicalRecordNo: 'EMR-20261018-001',
    versionA: 'v1.0（2026-10-18 10:00 李医生）',
    versionB: 'v1.1（2026-10-18 14:00 李医生）',
    totalDiffLines: 8,
    addedLines: 3,
    removedLines: 2,
    modifiedLines: 3,
    changeSummary: [
      { line: 12, type: 'added', content: '新增主诉：胸闷加重 2 天' },
      { line: 28, type: 'modified', content: '既往史：高血压 2 级 → 高血压 2 级（很高危）' },
      { line: 45, type: 'removed', content: '删除：否认糖尿病史（已更正为 2 型糖尿病）' },
    ],
  };

  return json(ok(diff));
}

/** GET /api/v1/emr/version-compare - 病历版本对比 5 条 */
async function handleEmrVersionCompare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const comparisons = [
    { id: 'VC-001', medicalRecordNo: 'EMR-20261018-001', currentVersion: 'v1.1', historyVersion: 'v1.0', compareBy: '王主任（质控）', compareTime: '2026-10-18 15:00' },
    { id: 'VC-002', medicalRecordNo: 'EMR-20261015-002', currentVersion: 'v2.0', historyVersion: 'v1.2', compareBy: '赵医生（内分泌）', compareTime: '2026-10-16 09:30' },
    { id: 'VC-003', medicalRecordNo: 'EMR-20261018-003', currentVersion: 'v1.0', historyVersion: 'v0.9（草稿）', compareBy: '李医生（急诊）', compareTime: '2026-10-18 17:00' },
    { id: 'VC-004', medicalRecordNo: 'EMR-20261020-004', currentVersion: 'v1.0', historyVersion: 'v0.8（草稿）', compareBy: '陈医生（骨科）', compareTime: '2026-10-20 10:30' },
    { id: 'VC-005', medicalRecordNo: 'EMR-20261015-005', currentVersion: 'v3.2', historyVersion: 'v3.0', compareBy: '王主任（质控）', compareTime: '2026-10-17 11:00' },
  ];

  return json(ok({ comparisons, totalCount: comparisons.length }));
}

/** GET /api/v1/emr/version-restore - 病历版本恢复记录 3 条 */
async function handleEmrVersionRestore(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const restores = [
    { id: 'VR-001', medicalRecordNo: 'EMR-20261015-002', restoreVersion: 'v1.2（2026-10-15 14:00）', operator: '赵医生（内分泌）', operateTime: '2026-10-16 09:35', approvalStatus: '已审批（王主任）' },
    { id: 'VR-002', medicalRecordNo: 'EMR-20261018-003', restoreVersion: 'v0.9（2026-10-18 16:00）', operator: '李医生（急诊）', operateTime: '2026-10-18 17:05', approvalStatus: '待审批' },
    { id: 'VR-003', medicalRecordNo: 'EMR-20261015-005', restoreVersion: 'v3.0（2026-10-16 10:00）', operator: '王主任（质控）', operateTime: '2026-10-17 11:05', approvalStatus: '已审批（医务处）' },
  ];

  return json(ok({ restores, totalCount: restores.length }));
}

export const m251Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/documentref', handle: handleFhirDocumentRef, auth: true },
  { method: 'GET', path: '/api/v1/fhir/allergyintolerance', handle: handleFhirAllergyIntolerance, auth: true },
  { method: 'GET', path: '/api/v1/fhir/immunization', handle: handleFhirImmunization, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-diff', handle: handleEmrVersionDiff, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-compare', handle: handleEmrVersionCompare, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-restore', handle: handleEmrVersionRestore, auth: true },
];
