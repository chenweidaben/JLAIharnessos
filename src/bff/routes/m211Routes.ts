/**
 * 健澜科技 jlmedaios - M211 临床路径 + 单病种 + 绩效管理（医院评审重点）
 *
 * 临床路径/路径患者 + 单病种上报/质量指标 + 科室绩效/医生绩效 + 收费项目/价格调整
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、临床路径管理 ==================== */

/** GET /api/v1/clinical-pathways/paths - 临床路径列表 */
async function handleClinicalPathwaysPaths(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const paths = [
    { id: 'CP-001', name: '急性心肌梗死', icdCode: 'I21.9', dept: '心内科', standardStay: 7, enrollRate: 85.5 },
    { id: 'CP-002', name: '心力衰竭', icdCode: 'I50.9', dept: '心内科', standardStay: 10, enrollRate: 78.3 },
    { id: 'CP-003', name: '社区获得性肺炎', icdCode: 'J15.9', dept: '呼吸科', standardStay: 8, enrollRate: 82.1 },
    { id: 'CP-004', name: '2型糖尿病', icdCode: 'E11.9', dept: '内分泌科', standardStay: 12, enrollRate: 75.6 },
    { id: 'CP-005', name: '胆囊结石', icdCode: 'K80.2', dept: '普外科', standardStay: 6, enrollRate: 88.9 },
  ];

  return json(ok({ paths, totalCount: paths.length }));
}

/** GET /api/v1/clinical-pathways/patients - 路径在管患者 */
async function handleClinicalPathwaysPatients(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patients = [
    { id: 'CPP-001', patient: '张演示', pathName: '急性心肌梗死', enrollDate: '2026-10-15', currentStage: '治疗', variation: '有', variationReason: '造影后需植入支架，路径内已包含', status: '在径' },
    { id: 'CPP-002', patient: '李患者', pathName: '社区获得性肺炎', enrollDate: '2026-10-16', currentStage: '康复', variation: '无', variationReason: null, status: '在径' },
    { id: 'CPP-003', patient: '王先生', pathName: '2型糖尿病', enrollDate: '2026-10-12', currentStage: '出院', variation: '无', variationReason: null, status: '出径' },
    { id: 'CPP-004', patient: '赵女士', pathName: '胆囊结石', enrollDate: '2026-10-18', currentStage: '手术', variation: '有', variationReason: '术中发现胆总管结石，需转术式', status: '变异出径' },
    { id: 'CPP-005', patient: '刘大爷', pathName: '心力衰竭', enrollDate: '2026-10-10', currentStage: '治疗', variation: '无', variationReason: null, status: '在径' },
  ];

  return json(ok({ patients, totalCount: patients.length }));
}

/* ==================== 二、单病种管理 ==================== */

/** GET /api/v1/single-disease/reports - 单病种上报 */
async function handleSingleDiseaseReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { id: 'SDR-001', disease: '急性心肌梗死', patient: '张演示', stayDays: 7, totalCost: 35680.50, complication: '无', status: '已上报' },
    { id: 'SDR-002', disease: '心力衰竭', patient: '李患者', stayDays: 12, totalCost: 28560.00, complication: '肺部感染', status: '待上报' },
    { id: 'SDR-003', disease: '社区获得性肺炎', patient: '王先生', stayDays: 8, totalCost: 15320.80, complication: '无', status: '已审核' },
    { id: 'SDR-004', disease: '脑梗死', patient: '赵女士', stayDays: 15, totalCost: 42680.00, complication: '下肢深静脉血栓', status: '已上报' },
    { id: 'SDR-005', disease: '髋关节置换', patient: '刘大爷', stayDays: 14, totalCost: 68500.00, complication: '无', status: '已审核' },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/** GET /api/v1/single-disease/quality - 单病种质量指标 */
async function handleSingleDiseaseQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    cmi: 1.35,
    lowRiskMortality: 0.12,
    surgeryComplicationRate: 1.85,
    returnToORRate: 0.45,
    averageStay: 8.6,
    averageCost: 23560.80,
  }));
}

/* ==================== 三、绩效管理 ==================== */

/** GET /api/v1/performance/departments - 科室绩效 */
async function handlePerformanceDepartments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const depts = [
    { id: 'PERF-D-001', dept: '心内科', revenue: 1250.5, outpatientCount: 8500, dischargeCount: 1250, satisfaction: 95.2, score: 92.5 },
    { id: 'PERF-D-002', dept: '呼吸科', revenue: 980.3, outpatientCount: 7200, dischargeCount: 980, satisfaction: 93.8, score: 89.6 },
    { id: 'PERF-D-003', dept: '普外科', revenue: 1560.8, outpatientCount: 6800, dischargeCount: 1560, satisfaction: 94.5, score: 91.2 },
    { id: 'PERF-D-004', dept: '妇产科', revenue: 890.2, outpatientCount: 8200, dischargeCount: 1120, satisfaction: 96.1, score: 93.8 },
    { id: 'PERF-D-005', dept: '急诊科', revenue: 760.5, outpatientCount: 12500, dischargeCount: 680, satisfaction: 92.3, score: 87.5 },
  ];

  return json(ok({ departments: depts, totalCount: depts.length }));
}

/** GET /api/v1/performance/doctors - 医生绩效 */
async function handlePerformanceDoctors(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const doctors = [
    { id: 'PERF-DR-001', doctor: '李主任', title: '主任医师', outpatientCount: 2500, surgeryCount: 180, recordScore: 95.5, annualScore: 92.8 },
    { id: 'PERF-DR-002', doctor: '王医生', title: '副主任医师', outpatientCount: 3200, surgeryCount: 120, recordScore: 92.3, annualScore: 89.5 },
    { id: 'PERF-DR-003', doctor: '张医生', title: '主治医师', outpatientCount: 2800, surgeryCount: 85, recordScore: 90.8, annualScore: 87.2 },
    { id: 'PERF-DR-004', doctor: '陈医生', title: '住院医师', outpatientCount: 1800, surgeryCount: 30, recordScore: 88.5, annualScore: 85.6 },
    { id: 'PERF-DR-005', doctor: '刘医生', title: '主治医师', outpatientCount: 2600, surgeryCount: 95, recordScore: 91.2, annualScore: 88.9 },
  ];

  return json(ok({ doctors, totalCount: doctors.length }));
}

/* ==================== 四、物价收费 ==================== */

/** GET /api/v1/pricing/items - 收费项目目录 */
async function handlePricingItems(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const items = [
    { id: 'PRC-001', name: '普通门诊挂号费', code: '110100001', price: 10.00, insuranceCategory: '甲类', execDept: '门诊部' },
    { id: 'PRC-002', name: '床位费（普通病房）', code: '120100001', price: 50.00, insuranceCategory: '甲类', execDept: '住院部' },
    { id: 'PRC-003', name: '一级护理费', code: '130100001', price: 35.00, insuranceCategory: '甲类', execDept: '护理部' },
    { id: 'PRC-004', name: '血常规化验费', code: '140100001', price: 25.00, insuranceCategory: '乙类', execDept: '检验科' },
    { id: 'PRC-005', name: '冠状动脉造影术', code: '150100001', price: 3500.00, insuranceCategory: '乙类', execDept: '心内科' },
  ];

  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pricing/adjustments - 价格调整记录 */
async function handlePricingAdjustments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const adjustments = [
    { id: 'PAD-001', item: '普通门诊挂号费', oldPrice: 15.00, newPrice: 10.00, effectiveDate: '2026-07-01', reason: '政策调价（医保局统一降价）' },
    { id: 'PAD-002', item: '床位费（普通病房）', oldPrice: 45.00, newPrice: 50.00, effectiveDate: '2026-08-01', reason: '成本核算（物价部门核定调整）' },
    { id: 'PAD-003', item: '血常规化验费', oldPrice: 30.00, newPrice: 25.00, effectiveDate: '2026-09-01', reason: '政策调价（检验项目打包降价）' },
  ];

  return json(ok({ adjustments, totalCount: adjustments.length }));
}

export const m211Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/clinical-pathways/paths', handle: handleClinicalPathwaysPaths, auth: true },
  { method: 'GET', path: '/api/v1/clinical-pathways/patients', handle: handleClinicalPathwaysPatients, auth: true },
  { method: 'GET', path: '/api/v1/single-disease/reports', handle: handleSingleDiseaseReports, auth: true },
  { method: 'GET', path: '/api/v1/single-disease/quality', handle: handleSingleDiseaseQuality, auth: true },
  { method: 'GET', path: '/api/v1/performance/departments', handle: handlePerformanceDepartments, auth: true },
  { method: 'GET', path: '/api/v1/performance/doctors', handle: handlePerformanceDoctors, auth: true },
  { method: 'GET', path: '/api/v1/pricing/items', handle: handlePricingItems, auth: true },
  { method: 'GET', path: '/api/v1/pricing/adjustments', handle: handlePricingAdjustments, auth: true },
];
