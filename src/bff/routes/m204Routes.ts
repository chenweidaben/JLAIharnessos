/**
 * 健澜科技 jlmedaios - M204 临床报告详情 + FHIR扩展资源 + 系统管理域
 *
 * 检验/影像详情 + 护理记录 + FHIR Observation/Condition/Procedure + 科室/字典
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、临床报告详情 ==================== */

/** GET /api/v1/lab/reports/:id/detail - 检验报告详情 */
async function handleLabReportDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const id = c.params?.id ?? 'LAB-001';

  return json(ok({
    id,
    patient: { name: '张演示', gender: '男', age: 45, dept: '心内科', bedNo: '3床' },
    items: [
      { name: '白细胞计数', value: '7.5', unit: '10^9/L', ref: '4.0-10.0', flag: 'normal' },
      { name: '血红蛋白', value: '130', unit: 'g/L', ref: '120-160', flag: 'normal' },
      { name: '血小板计数', value: '220', unit: '10^9/L', ref: '100-300', flag: 'normal' },
      { name: '空腹血糖', value: '6.8', unit: 'mmol/L', ref: '3.9-6.1', flag: 'high' },
      { name: '总胆固醇', value: '5.8', unit: 'mmol/L', ref: '<5.2', flag: 'high' },
      { name: '低密度脂蛋白', value: '3.8', unit: 'mmol/L', ref: '<3.4', flag: 'high' },
    ],
    interpretation: '血糖及血脂偏高，建议内分泌科随访，控制饮食并加强运动。',
  }));
}

/** GET /api/v1/pacs/reports/:id/detail - 检查报告详情 */
async function handlePacsReportDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const id = c.params?.id ?? 'PACS-001';

  return json(ok({
    id,
    patient: { name: '张演示', gender: '男', age: 45 },
    bodyPart: '胸部CT平扫',
    findings: '双肺纹理清晰，右肺下叶可见片状高密度影，边界模糊，大小约2.5x3.0cm。纵隔淋巴结未见明显肿大。心影大小形态正常。',
    diagnosis: '右肺下叶炎症，建议治疗后复查。',
    suggestion: '抗炎治疗2周后复查胸部CT。',
    doctor: '影像科-李医生',
    reviewer: '影像科-王主任',
    reportDate: '2026-10-20 10:30',
  }));
}

/** GET /api/v1/nursing/records - 护理记录列表 */
async function handleNursingRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'NR-001', patient: '张演示', time: '2026-10-20 08:00', temp: 36.5, pulse: 78, resp: 18, bp: '120/80', consciousness: '清醒', measure: '遵医嘱服药，监测血压', recorder: '护士-小王' },
    { id: 'NR-002', patient: '李患者', time: '2026-10-20 09:00', temp: 37.8, pulse: 92, resp: 20, bp: '135/85', consciousness: '嗜睡', measure: '物理降温，半小时后复测', recorder: '护士-小李' },
    { id: 'NR-003', patient: '王患者', time: '2026-10-20 10:00', temp: 36.8, pulse: 75, resp: 16, bp: '118/76', consciousness: '清醒', measure: '协助床上活动', recorder: '护士-小张' },
    { id: 'NR-004', patient: '赵患者', time: '2026-10-20 11:00', temp: 38.5, pulse: 105, resp: 22, bp: '145/90', consciousness: '烦躁', measure: '通知医生，心电监护', recorder: '护士-小陈' },
    { id: 'NR-005', patient: '刘患者', time: '2026-10-20 12:00', temp: 36.2, pulse: 70, resp: 17, bp: '110/70', consciousness: '清醒', measure: '正常输液护理', recorder: '护士-小王' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/* ==================== 二、FHIR 扩展资源 ==================== */

/** GET /api/fhir/Observation/P001 - FHIR Observation 资源 */
async function handleFhirObservation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const observations = [
    { resourceType: 'Observation', id: 'obs-001', status: 'final', code: { text: '血压' }, subject: { reference: 'Patient/P001' }, valueQuantity: { value: 120, unit: 'mmHg' } },
    { resourceType: 'Observation', id: 'obs-002', status: 'final', code: { text: '体温' }, subject: { reference: 'Patient/P001' }, valueQuantity: { value: 36.5, unit: 'Cel' } },
    { resourceType: 'Observation', id: 'obs-003', status: 'final', code: { text: '心率' }, subject: { reference: 'Patient/P001' }, valueQuantity: { value: 78, unit: '/min' } },
    { resourceType: 'Observation', id: 'obs-004', status: 'final', code: { text: '血氧饱和度' }, subject: { reference: 'Patient/P001' }, valueQuantity: { value: 98, unit: '%' } },
    { resourceType: 'Observation', id: 'obs-005', status: 'final', code: { text: '呼吸频率' }, subject: { reference: 'Patient/P001' }, valueQuantity: { value: 18, unit: '/min' } },
    { resourceType: 'Observation', id: 'obs-006', status: 'final', code: { text: '血糖' }, subject: { reference: 'Patient/P001' }, valueQuantity: { value: 6.8, unit: 'mmol/L' } },
    { resourceType: 'Observation', id: 'obs-007', status: 'final', code: { text: '血红蛋白' }, subject: { reference: 'Patient/P001' }, valueQuantity: { value: 130, unit: 'g/L' } },
    { resourceType: 'Observation', id: 'obs-008', status: 'final', code: { text: '白细胞计数' }, subject: { reference: 'Patient/P001' }, valueQuantity: { value: 7.5, unit: '10^9/L' } },
  ];

  return json(ok(observations));
}

/** GET /api/fhir/Condition/P001 - FHIR Condition 资源 */
async function handleFhirCondition(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const conditions = [
    { resourceType: 'Condition', id: 'cond-001', clinicalStatus: 'active', code: { text: '冠心病' }, subject: { reference: 'Patient/P001' }, onsetDateTime: '2025-06-15' },
    { resourceType: 'Condition', id: 'cond-002', clinicalStatus: 'active', code: { text: '高血压（2级）' }, subject: { reference: 'Patient/P001' }, onsetDateTime: '2023-03-20' },
    { resourceType: 'Condition', id: 'cond-003', clinicalStatus: 'active', code: { text: '2型糖尿病' }, subject: { reference: 'Patient/P001' }, onsetDateTime: '2024-11-10' },
  ];

  return json(ok(conditions));
}

/** GET /api/fhir/Procedure/P001 - FHIR Procedure 资源 */
async function handleFhirProcedure(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const procedures = [
    { resourceType: 'Procedure', id: 'proc-001', status: 'completed', code: { text: '冠状动脉造影术' }, subject: { reference: 'Patient/P001' }, performedDateTime: '2026-10-16' },
    { resourceType: 'Procedure', id: 'proc-002', status: 'completed', code: { text: '冠状动脉支架植入术' }, subject: { reference: 'Patient/P001' }, performedDateTime: '2026-10-16' },
  ];

  return json(ok(procedures));
}

/* ==================== 三、系统管理域 ==================== */

/** GET /api/v1/system/departments - 科室列表 */
async function handleSystemDepartments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const depts = [
    { name: '心内科', code: 'NK001', type: '临床', beds: 60, director: '李主任' },
    { name: '呼吸科', code: 'NK002', type: '临床', beds: 50, director: '王主任' },
    { name: '消化科', code: 'NK003', type: '临床', beds: 45, director: '张主任' },
    { name: '神经内科', code: 'NK004', type: '临床', beds: 55, director: '刘主任' },
    { name: '内分泌科', code: 'NK005', type: '临床', beds: 40, director: '陈主任' },
    { name: '骨科', code: 'WK001', type: '临床', beds: 50, director: '赵主任' },
    { name: '普外科', code: 'WK002', type: '临床', beds: 55, director: '钱主任' },
    { name: '妇产科', code: 'FK001', type: '临床', beds: 60, director: '孙主任' },
    { name: '儿科', code: 'EK001', type: '临床', beds: 40, director: '周主任' },
    { name: '急诊科', code: 'EJ001', type: '临床', beds: 30, director: '吴主任' },
  ];

  return json(ok({ departments: depts, totalCount: depts.length }));
}

/** GET /api/v1/system/dict/:type - 数据字典 */
async function handleSystemDict(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const type = c.params?.type || 'gender';

  const dict: Record<string, object[]> = {
    gender: [
      { code: 'M', label: '男' },
      { code: 'F', label: '女' },
      { code: 'U', label: '未知' },
    ],
    bloodType: [
      { code: 'A', label: 'A型' },
      { code: 'B', label: 'B型' },
      { code: 'AB', label: 'AB型' },
      { code: 'O', label: 'O型' },
    ],
    departmentType: [
      { code: 'CLINIC', label: '临床' },
      { code: 'MEDICAL', label: '医技' },
      { code: 'ADMIN', label: '行政' },
    ],
    orderType: [
      { code: 'LONG', label: '长期医嘱' },
      { code: 'TEMP', label: '临时医嘱' },
      { code: 'PRN', label: '备用医嘱' },
    ],
  };

  return json(ok({ type, items: dict[type] || [] }));
}

export const m204Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/lab/reports/:id/detail', handle: handleLabReportDetail, auth: true },
  { method: 'GET', path: '/api/v1/pacs/reports/:id/detail', handle: handlePacsReportDetail, auth: true },
  { method: 'GET', path: '/api/v1/nursing/records', handle: handleNursingRecords, auth: true },
  { method: 'GET', path: '/api/fhir/Observation/P001', handle: handleFhirObservation, auth: true },
  { method: 'GET', path: '/api/fhir/Condition/P001', handle: handleFhirCondition, auth: true },
  { method: 'GET', path: '/api/fhir/Procedure/P001', handle: handleFhirProcedure, auth: true },
  { method: 'GET', path: '/api/v1/system/departments', handle: handleSystemDepartments, auth: true },
  { method: 'GET', path: '/api/v1/system/dict/:type', handle: handleSystemDict, auth: true },
];
