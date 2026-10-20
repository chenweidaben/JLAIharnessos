/**
 * 健澜科技 jlmedaios - M283 缺失接口补充
 *
 * FHIR Medication/Coverage + Workflow Admin + Events Metrics + EMR Template + CDS Guideline
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/fhir/Medication - FHIR Medication 资源 5 条 */
async function handleFhirMedication(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const meds = [
    { resourceType: 'Medication', id: 'M-001', code: { coding: [ { code: 'aspirin', display: '阿司匹林肠溶片' } ] }, form: { text: '肠溶片' }, ingredient: [ { itemCodeableConcept: { text: '阿司匹林 100mg' } } ] },
    { resourceType: 'Medication', id: 'M-002', code: { coding: [ { code: 'metformin', display: '二甲双胍片' } ] }, form: { text: '片剂' }, ingredient: [ { itemCodeableConcept: { text: '盐酸二甲双胍 0.5g' } } ] },
    { resourceType: 'Medication', id: 'M-003', code: { coding: [ { code: 'atorvastatin', display: '阿托伐他汀钙片' } ] }, form: { text: '片剂' }, ingredient: [ { itemCodeableConcept: { text: '阿托伐他汀钙 20mg' } } ] },
    { resourceType: 'Medication', id: 'M-004', code: { coding: [ { code: 'ceftriaxone', display: '头孢曲松钠' } ] }, form: { text: '注射剂' }, ingredient: [ { itemCodeableConcept: { text: '头孢曲松钠 1.0g' } } ] },
    { resourceType: 'Medication', id: 'M-005', code: { coding: [ { code: 'omeprazole', display: '奥美拉唑肠溶胶囊' } ] }, form: { text: '胶囊' }, ingredient: [ { itemCodeableConcept: { text: '奥美拉唑 20mg' } } ] },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: meds.length, entry: meds.map(m => ({ resource: m })) }));
}

/** GET /api/v1/fhir/Coverage - FHIR Coverage 资源 5 条 */
async function handleFhirCoverage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const coverages = [
    { resourceType: 'Coverage', id: 'CV-001', status: 'active', type: { coding: [ { code: 'EMP', display: '职工医保' } ] }, beneficiary: { reference: 'Patient/P-001' }, period: { start: '2026-01-01' }, payor: { display: '杭州市医保局' } },
    { resourceType: 'Coverage', id: 'CV-002', status: 'active', type: { coding: [ { code: 'RES', display: '居民医保' } ] }, beneficiary: { reference: 'Patient/P-002' }, period: { start: '2026-01-01' }, payor: { display: '杭州市医保局' } },
    { resourceType: 'Coverage', id: 'CV-003', status: 'active', type: { coding: [ { code: 'RET', display: '离休医保' } ] }, beneficiary: { reference: 'Patient/P-003' }, period: { start: '2026-01-01' }, payor: { display: '浙江省医保局' } },
    { resourceType: 'Coverage', id: 'CV-004', status: 'active', type: { coding: [ { code: 'COM', display: '商业保险' } ] }, beneficiary: { reference: 'Patient/P-004' }, period: { start: '2026-06-01' }, payor: { display: '中国平安保险' } },
    { resourceType: 'Coverage', id: 'CV-005', status: 'active', type: { coding: [ { code: 'EMP', display: '职工医保' } ] }, beneficiary: { reference: 'Patient/P-005' }, period: { start: '2026-01-01' }, payor: { display: '杭州市医保局' } },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: coverages.length, entry: coverages.map(c => ({ resource: c })) }));
}

/** GET /api/v1/workflow/admin - 行政工作流 */
async function handleWorkflowAdmin(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({
    pendingApprovals: 12,
    inProgress: 5,
    completedToday: 28,
    categories: [
      { name: '设备采购审批', pending: 4, avgDays: 3 },
      { name: '人员招聘审批', pending: 3, avgDays: 5 },
      { name: '预算调整审批', pending: 2, avgDays: 7 },
      { name: '合同审批', pending: 3, avgDays: 4 },
    ],
  }));
}

/** GET /api/v1/events/metrics - 事件指标 */
async function handleEventsMetrics(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({
    totalEvents: 1280000,
    todayEvents: 15600,
    eventTypes: 28,
    errorRate: '0.03%',
    avgLatencyMs: 2.5,
    topTypes: [
      { type: 'ORDER_CREATED', count: 4500, percent: '28.8%' },
      { type: 'PATIENT_ADMITTED', count: 3200, percent: '20.5%' },
      { type: 'LAB_RESULT', count: 2800, percent: '17.9%' },
      { type: 'MEDICATION_GIVEN', count: 2500, percent: '16.0%' },
      { type: 'DIAGNOSIS_CODED', count: 2600, percent: '16.7%' },
    ],
  }));
}

/** GET /api/v1/emr/template - 病历模板 5 条 */
async function handleEmrTemplate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const templates = [
    { id: 'ET-001', name: '入院记录模板（通用）', dept: '全科室', version: 'v3.2', updatedAt: '2026-06-01', usageCount: 12500 },
    { id: 'ET-002', name: '心内科出院小结模板', dept: '心内科', version: 'v2.8', updatedAt: '2026-08-15', usageCount: 3200 },
    { id: 'ET-003', name: '手术记录模板（普外科）', dept: '普外科', version: 'v2.5', updatedAt: '2026-05-20', usageCount: 1800 },
    { id: 'ET-004', name: '首次病程记录模板', dept: '全科室', version: 'v3.0', updatedAt: '2026-07-10', usageCount: 9800 },
    { id: 'ET-005', name: '急诊抢救记录模板', dept: '急诊医学科', version: 'v2.0', updatedAt: '2026-09-01', usageCount: 650 },
  ];
  return json(ok({ templates, totalCount: templates.length }));
}

/** GET /api/v1/cds/guideline - 临床指南 5 条 */
async function handleCdsGuideline(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const guidelines = [
    { id: 'CG-001', name: '中国 2 型糖尿病防治指南（2024 版）', source: '中华医学会糖尿病学分会', year: 2024, relevance: '高', keyPoints: 'HbA1c 目标 <7.0%；二甲双胍一线用药' },
    { id: 'CG-002', name: '中国高血压防治指南（2023 版）', source: '中国高血压联盟', year: 2023, relevance: '高', keyPoints: '血压目标 <140/90 mmHg；CCB/ACEI/ARB 一线用药' },
    { id: 'CG-003', name: '中国成人血脂异常防治指南（2023 版）', source: '中华医学会心血管病学分会', year: 2023, relevance: '高', keyPoints: 'LDL-C 目标按危险分层；他汀类一线用药' },
    { id: 'CG-004', name: '社区获得性肺炎诊疗指南（2024 版）', source: '中华医学会呼吸病学分会', year: 2024, relevance: '中', keyPoints: '经验性抗感染治疗；住院患者优先选择 β-内酰胺类' },
    { id: 'CG-005', name: '急性 ST 段抬高型心肌梗死指南（2023 版）', source: '中华医学会心血管病学分会', year: 2023, relevance: '高', keyPoints: '发病 12 小时内再灌注治疗；双联抗血小板治疗' },
  ];
  return json(ok({ guidelines, totalCount: guidelines.length }));
}

export const m283Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/Medication', handle: handleFhirMedication, auth: true },
  { method: 'GET', path: '/api/v1/fhir/Coverage', handle: handleFhirCoverage, auth: true },
  { method: 'GET', path: '/api/v1/workflow/admin', handle: handleWorkflowAdmin, auth: true },
  { method: 'GET', path: '/api/v1/events/metrics', handle: handleEventsMetrics, auth: true },
  { method: 'GET', path: '/api/v1/emr/template', handle: handleEmrTemplate, auth: true },
  { method: 'GET', path: '/api/v1/cds/guideline', handle: handleCdsGuideline, auth: true },
];
