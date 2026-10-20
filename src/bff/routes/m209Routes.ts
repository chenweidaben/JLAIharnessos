/**
 * 健澜科技 jlmedaios - M209 FHIR 搜索 + 病历内涵质控 + 患者端扩展
 *
 * FHIR Patient搜索/Encounter/DocumentReference + 质控规则/结果 + 患者就诊/用药/费用
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、FHIR 搜索接口 ==================== */

/** GET /api/fhir/Patient - FHIR Patient 搜索（Bundle 格式） */
async function handleFhirPatientSearch(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patients = [
    { resourceType: 'Patient', id: 'P001', name: [{ family: '张', given: ['演示'] }], gender: 'male', birthDate: '1980-01-01' },
    { resourceType: 'Patient', id: 'P002', name: [{ family: '李', given: ['患者'] }], gender: 'female', birthDate: '1975-05-15' },
    { resourceType: 'Patient', id: 'P003', name: [{ family: '王', given: ['先生'] }], gender: 'male', birthDate: '1968-11-20' },
    { resourceType: 'Patient', id: 'P004', name: [{ family: '赵', given: ['女士'] }], gender: 'female', birthDate: '1990-03-10' },
    { resourceType: 'Patient', id: 'P005', name: [{ family: '刘', given: ['大爷'] }], gender: 'male', birthDate: '1955-07-25' },
  ];

  const bundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: patients.length,
    entry: patients.map(p => ({ resource: p })),
  };

  return json(ok(bundle));
}

/** GET /api/fhir/Encounter/P001 - FHIR Encounter 资源 */
async function handleFhirEncounter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const encounters = [
    { resourceType: 'Encounter', id: 'ENC-001', status: 'finished', class: { code: 'AMB' }, subject: { reference: 'Patient/P001' }, period: { start: '2026-10-12T09:00:00Z', end: '2026-10-12T09:30:00Z' }, reasonCode: { text: '门诊：胸闷待查' } },
    { resourceType: 'Encounter', id: 'ENC-002', status: 'finished', class: { code: 'IMP' }, subject: { reference: 'Patient/P001' }, period: { start: '2026-10-15T10:00:00Z', end: '2026-10-18T14:00:00Z' }, reasonCode: { text: '住院：冠心病' } },
    { resourceType: 'Encounter', id: 'ENC-003', status: 'finished', class: { code: 'EMER' }, subject: { reference: 'Patient/P001' }, period: { start: '2026-10-20T08:30:00Z', end: '2026-10-20T10:00:00Z' }, reasonCode: { text: '急诊：胸痛' } },
  ];

  return json(ok(encounters));
}

/** GET /api/fhir/DocumentReference/P001 - FHIR DocumentReference 资源 */
async function handleFhirDocumentReference(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const docs = [
    { resourceType: 'DocumentReference', id: 'DOC-001', status: 'current', type: { text: '入院记录' }, subject: { reference: 'Patient/P001' }, date: '2026-10-15T10:30:00Z', description: '张演示入院记录' },
    { resourceType: 'DocumentReference', id: 'DOC-002', status: 'current', type: { text: '首次病程记录' }, subject: { reference: 'Patient/P001' }, date: '2026-10-15T12:00:00Z', description: '首次病程记录' },
    { resourceType: 'DocumentReference', id: 'DOC-003', status: 'current', type: { text: '手术记录' }, subject: { reference: 'Patient/P001' }, date: '2026-10-16T15:00:00Z', description: '冠状动脉支架植入术手术记录' },
    { resourceType: 'DocumentReference', id: 'DOC-004', status: 'current', type: { text: '出院小结' }, subject: { reference: 'Patient/P001' }, date: '2026-10-18T14:30:00Z', description: '出院小结' },
    { resourceType: 'DocumentReference', id: 'DOC-005', status: 'current', type: { text: '知情同意书' }, subject: { reference: 'Patient/P001' }, date: '2026-10-16T08:00:00Z', description: 'PCI 手术知情同意书' },
  ];

  return json(ok(docs));
}

/* ==================== 二、病历内涵质控 ==================== */

/** GET /api/v1/emr/quality-rules - 质控规则列表 */
async function handleEmrQualityRules(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rules = [
    { id: 'QR-001', name: '主诉不完整', type: '入院记录', description: '主诉应包含主要症状+持续时间', deduction: '扣2分', enabled: true },
    { id: 'QR-002', name: '现病史缺失', type: '入院记录', description: '现病史应包括起病情况、主要症状特点、伴随症状', deduction: '扣5分', enabled: true },
    { id: 'QR-003', name: '鉴别诊断不足', type: '病程记录', description: '至少列出3个鉴别诊断并分析', deduction: '扣3分', enabled: true },
    { id: 'QR-004', name: '用药无指征', type: '病程记录', description: '抗菌药物使用应有明确指征并记录', deduction: '扣5分', enabled: true },
    { id: 'QR-005', name: '出院记录不全', type: '出院小结', description: '出院记录应包含入院诊断、出院诊断、治疗结果、出院医嘱', deduction: '扣4分', enabled: false },
  ];

  return json(ok({ rules, totalCount: rules.length }));
}

/** GET /api/v1/emr/quality-results - 质控结果 */
async function handleEmrQualityResults(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const results = [
    { id: 'QR-RES-001', record: '张演示-入院记录', rule: '现病史缺失', passed: false, deduction: 5, doctor: '李医生', rectifyStatus: '已整改' },
    { id: 'QR-RES-002', record: '李患者-首次病程', rule: '鉴别诊断不足', passed: false, deduction: 3, doctor: '王医生', rectifyStatus: '待整改' },
    { id: 'QR-RES-003', record: '王患者-手术记录', rule: '用药无指征', passed: false, deduction: 5, doctor: '张医生', rectifyStatus: '已复核' },
    { id: 'QR-RES-004', record: '赵患者-出院小结', rule: '出院记录不全', passed: true, deduction: 0, doctor: '刘医生', rectifyStatus: '已整改' },
    { id: 'QR-RES-005', record: '刘患者-入院记录', rule: '主诉不完整', passed: false, deduction: 2, doctor: '陈医生', rectifyStatus: '待整改' },
  ];

  return json(ok({ results, totalCount: results.length }));
}

/* ==================== 三、患者端扩展 ==================== */

/** GET /api/v1/patient/visits - 患者就诊历史 */
async function handlePatientVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const visits = [
    { id: 'PV-001', dept: '心内科', doctor: '李医生', diagnosis: '冠心病（稳定型）', time: '2026-10-12 09:00', status: '已结束' },
    { id: 'PV-002', dept: '心内科', doctor: '李主任', diagnosis: '冠心病（不稳定型心绞痛）', time: '2026-10-15 10:00', status: '已结束' },
    { id: 'PV-003', dept: '急诊科', doctor: '王医生', diagnosis: '胸痛待查', time: '2026-10-20 08:30', status: '进行中' },
    { id: 'PV-004', dept: '内分泌科', doctor: '张医生', diagnosis: '2型糖尿病', time: '2026-09-20 14:00', status: '已结束' },
    { id: 'PV-005', dept: '心内科门诊', doctor: '陈医生', diagnosis: '高血压复诊', time: '2026-08-15 10:30', status: '已结束' },
  ];

  return json(ok({ visits, totalCount: visits.length }));
}

/** GET /api/v1/patient/medications - 患者用药记录 */
async function handlePatientMedications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const meds = [
    { id: 'PM-001', drug: '阿司匹林肠溶片', dosage: '100mg 每日1次 口服', startDate: '2026-10-16', doctor: '李医生', status: '继续使用' },
    { id: 'PM-002', drug: '阿托伐他汀钙片', dosage: '20mg 每晚1次 口服', startDate: '2026-10-16', doctor: '李医生', status: '继续使用' },
    { id: 'PM-003', drug: '硝酸甘油片', dosage: '0.5mg 必要时 舌下含服', startDate: '2026-10-16', doctor: '李主任', status: '继续使用' },
    { id: 'PM-004', drug: '二甲双胍片', dosage: '0.5g 每日2次 口服', startDate: '2026-09-20', doctor: '张医生', status: '继续使用' },
    { id: 'PM-005', drug: '阿莫西林胶囊', dosage: '0.25g 每日3次 口服', startDate: '2026-10-01', doctor: '王医生', status: '已停药' },
  ];

  return json(ok({ medications: meds, totalCount: meds.length }));
}

/** GET /api/v1/patient/bills - 患者费用明细 */
async function handlePatientBills(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const bills = [
    { id: 'PB-001', item: '住院押金', amount: 5000.00, insurancePay: 0, selfPay: 5000.00, time: '2026-10-15 10:00' },
    { id: 'PB-002', item: '冠状动脉造影术', amount: 3500.00, insurancePay: 2800.00, selfPay: 700.00, time: '2026-10-16 15:00' },
    { id: 'PB-003', item: '药物洗脱支架', amount: 12000.00, insurancePay: 9600.00, selfPay: 2400.00, time: '2026-10-16 15:30' },
    { id: 'PB-004', item: '床位费（3天）', amount: 180.00, insurancePay: 144.00, selfPay: 36.00, time: '2026-10-18 14:00' },
    { id: 'PB-005', item: '药品费（出院带药）', amount: 156.80, insurancePay: 125.44, selfPay: 31.36, time: '2026-10-18 14:30' },
  ];

  return json(ok({ bills, totalCount: bills.length }));
}

export const m209Routes: RouteDef[] = [
  { method: 'GET', path: '/api/fhir/Patient', handle: handleFhirPatientSearch, auth: true },
  { method: 'GET', path: '/api/fhir/Encounter/P001', handle: handleFhirEncounter, auth: true },
  { method: 'GET', path: '/api/fhir/DocumentReference/P001', handle: handleFhirDocumentReference, auth: true },
  { method: 'GET', path: '/api/v1/emr/quality-rules', handle: handleEmrQualityRules, auth: true },
  { method: 'GET', path: '/api/v1/emr/quality-results', handle: handleEmrQualityResults, auth: true },
  { method: 'GET', path: '/api/v1/patient/visits', handle: handlePatientVisits, auth: true },
  { method: 'GET', path: '/api/v1/patient/medications', handle: handlePatientMedications, auth: true },
  { method: 'GET', path: '/api/v1/patient/bills', handle: handlePatientBills, auth: true },
];
