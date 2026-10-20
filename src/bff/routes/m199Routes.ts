/**
 * 健澜科技 jlmedaios - M199 质控管理 + 感染监测 + 病案管理
 *
 * 病案质控 / 感染监测 / 护理质控 / 病历归档 / 运营 KPI
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/medical-records/quality
 * 病案首页质控
 */
async function handleRecordQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const stats = {
    passRate: '92.5%',
    defectRate: '7.5%',
    defectTypes: [
      { type: '诊断填写不完整', count: 12 },
      { type: '手术编码错误', count: 8 },
      { type: '费用漏填', count: 5 },
    ],
    rectificationRate: '85%',
  };

  const defects = [
    { id: 'DQ-001', patient: '张演示', type: '诊断填写不完整', severity: 'medium', status: '已整改' },
    { id: 'DQ-002', patient: '李患者', type: '手术编码错误', severity: 'high', status: '已整改' },
    { id: 'DQ-003', patient: '王患者', type: '费用漏填', severity: 'low', status: '整改中' },
    { id: 'DQ-004', patient: '赵患者', type: '诊断填写不完整', severity: 'medium', status: '待整改' },
    { id: 'DQ-005', patient: '刘患者', type: '手术编码错误', severity: 'high', status: '待整改' },
  ];

  return json(ok({ stats, defects, totalDefects: defects.length }));
}

/**
 * GET /api/v1/infection/surveillance
 * 医院感染监测
 */
async function handleInfectionSurveillance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const indicators = [
    { name: '感染发病率', value: '1.2%', target: '<3%', status: 'good' },
    { name: '漏报率', value: '0.3%', target: '<1%', status: 'good' },
    { name: '手卫生依从率', value: '89%', target: '>90%', status: 'warning' },
    { name: '多重耐药菌检出率', value: '5.6%', target: '<10%', status: 'good' },
    { name: '导管相关感染率', value: '0.8%', target: '<1%', status: 'good' },
  ];

  return json(ok({ period: '2026-Q3', indicators, totalIndicators: indicators.length }));
}

/**
 * GET /api/v1/nursing/quality
 * 护理质控
 */
async function handleNursingQuality(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const indicators = [
    { name: '基础护理合格率', value: '96%', target: '>95%', status: 'good' },
    { name: '特护合格率', value: '94%', target: '>95%', status: 'warning' },
    { name: '急救物品完好率', value: '100%', target: '100%', status: 'good' },
    { name: '护理差错发生率', value: '0.2%', target: '<0.5%', status: 'good' },
    { name: '护理满意度', value: '95%', target: '>90%', status: 'good' },
  ];

  return json(ok({ period: '2026-Q3', indicators, totalIndicators: indicators.length }));
}

/**
 * GET /api/v1/medical-records/filing
 * 病历归档列表
 */
async function handleRecordFiling(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'MF-001', patient: '张演示', filingDate: '2026-10-19', status: '已归档', filer: '病案室-小王' },
    { id: 'MF-002', patient: '李患者', filingDate: '2026-10-18', status: '已归档', filer: '病案室-小李' },
    { id: 'MF-003', patient: '王患者', filingDate: '2026-10-19', status: '待归档', filer: null },
    { id: 'MF-004', patient: '赵患者', filingDate: '2026-10-15', status: '延迟归档', filer: '病案室-小王' },
    { id: 'MF-005', patient: '刘患者', filingDate: '2026-10-19', status: '待归档', filer: null },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/**
 * GET /api/v1/operation/kpi
 * 运营指标 KPI
 */
async function handleOperationKPI(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const kpi = {
    today: { outpatient: 1250, discharged: 45, avgStay: 7.2, bedTurnover: 1.8, surgeries: 12 },
    month: { outpatient: 35000, discharged: 1200, avgStay: 7.5, bedTurnover: 52, surgeries: 320 },
    yoyGrowth: { outpatient: '+8.5%', discharged: '+6.2%', avgStay: '-3.1%' },
  };

  return json(ok(kpi));
}

export const m199Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medical-records/quality', handle: handleRecordQuality, auth: true },
  { method: 'GET', path: '/api/v1/infection/surveillance', handle: handleInfectionSurveillance, auth: true },
  { method: 'GET', path: '/api/v1/nursing/quality', handle: handleNursingQuality, auth: true },
  { method: 'GET', path: '/api/v1/medical-records/filing', handle: handleRecordFiling, auth: true },
  { method: 'GET', path: '/api/v1/operation/kpi', handle: handleOperationKPI, auth: true },
];
