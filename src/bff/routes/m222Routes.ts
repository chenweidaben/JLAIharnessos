/**
 * 健澜科技 jlmedaios - M222 移动护理 PDA + 门诊输液 + 发热门诊
 *
 * PDA 任务/生命体征/扫码核对 + 门诊输液列表/统计 + 发热门诊就诊/统计
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、移动护理 PDA ==================== */

/** GET /api/v1/mobile/tasks - PDA 待执行任务 */
async function handleMobileTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const tasks = [
    { id: 'MTK-001', type: '服药', patient: '张演示', bed: '12床', drug: '阿司匹林肠溶片 100mg', execTime: '2026-10-20 08:00' },
    { id: 'MTK-002', type: '注射', patient: '李患者', bed: '15床', drug: '低分子肝素钙 4000IU', execTime: '2026-10-20 09:00' },
    { id: 'MTK-003', type: '输液', patient: '王先生', bed: '18床', drug: '0.9% 生理盐水 250ml+头孢曲松 2g', execTime: '2026-10-20 10:00' },
    { id: 'MTK-004', type: '测量体征', patient: '赵女士', bed: '20床', drug: '-', execTime: '2026-10-20 10:30' },
    { id: 'MTK-005', type: '换药', patient: '刘大爷', bed: '22床', drug: '伤口换药（普外科术后）', execTime: '2026-10-20 11:00' },
  ];

  return json(ok({ tasks, totalCount: tasks.length }));
}

/** GET /api/v1/mobile/vitals - PDA 生命体征录入 */
async function handleMobileVitals(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const vitals = [
    { id: 'VIT-001', patient: '张演示', temp: 36.5, pulse: 72, resp: 18, bp: '120/80', spo2: 98, recorder: '王护士' },
    { id: 'VIT-002', patient: '李患者', temp: 37.2, pulse: 85, resp: 20, bp: '135/85', spo2: 96, recorder: '李护士' },
    { id: 'VIT-003', patient: '王先生', temp: 38.5, pulse: 95, resp: 22, bp: '145/95', spo2: 94, recorder: '王护士' },
    { id: 'VIT-004', patient: '赵女士', temp: 36.8, pulse: 68, resp: 16, bp: '115/75', spo2: 99, recorder: '张护士' },
    { id: 'VIT-005', patient: '刘大爷', temp: 36.3, pulse: 65, resp: 16, bp: '130/80', spo2: 97, recorder: '李护士' },
  ];

  return json(ok({ vitals, totalCount: vitals.length }));
}

/** GET /api/v1/mobile/med-scan - PDA 扫码核对记录 */
async function handleMobileMedScan(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const scans = [
    { id: 'SCN-001', drugBarcode: 'DRG-20261020-001', patientWristband: 'WRB-P001', result: '一致', nurse: '王护士', time: '2026-10-20 08:05' },
    { id: 'SCN-002', drugBarcode: 'DRG-20261020-002', patientWristband: 'WRB-P002', result: '一致', nurse: '李护士', time: '2026-10-20 09:05' },
    { id: 'SCN-003', drugBarcode: 'DRG-20261020-003', patientWristband: 'WRB-P003', result: '不一致（腕带不匹配）', nurse: '王护士', time: '2026-10-20 10:05' },
  ];

  return json(ok({ scans, totalCount: scans.length }));
}

/* ==================== 二、门诊输液 ==================== */

/** GET /api/v1/outpatient/infusion - 门诊输液列表 */
async function handleOutpatientInfusion(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const infusions = [
    { id: 'INF-001', patient: '张演示', drug: '0.9% 生理盐水 250ml+青霉素 800 万 U', dripRate: 50, seat: 'A01', status: '输液中' },
    { id: 'INF-002', patient: '李患者', drug: '5% 葡萄糖 250ml+维生素 C 2g', dripRate: 60, seat: 'A02', status: '输液中' },
    { id: 'INF-003', patient: '王先生', drug: '0.9% 生理盐水 100ml+头孢呋辛 1.5g', dripRate: 40, seat: 'B01', status: '待输液' },
    { id: 'INF-004', patient: '赵女士', drug: '甲硝唑注射液 100ml', dripRate: 55, seat: 'B02', status: '已结束' },
    { id: 'INF-005', patient: '刘大爷', drug: '0.9% 生理盐水 250ml+左氧氟沙星 0.3g', dripRate: 45, seat: 'A03', status: '输液中' },
  ];

  return json(ok({ infusions, totalCount: infusions.length }));
}

/** GET /api/v1/outpatient/infusion-stats - 输液统计 */
async function handleOutpatientInfusionStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayTotal: 125,
    completed: 68,
    inProgress: 42,
    waiting: 15,
    avgWaitTime: 12.5,
  }));
}

/* ==================== 三、发热门诊 ==================== */

/** GET /api/v1/fever/visits - 发热门诊就诊 */
async function handleFeverVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const visits = [
    { id: 'FEV-001', patient: '张演示', temp: 38.5, symptoms: '咳嗽、咽痛', diagnosis: '急性上呼吸道感染', disposition: '离院', time: '2026-10-20 09:00' },
    { id: 'FEV-002', patient: '李患者', temp: 39.2, symptoms: '咳嗽、乏力、腹泻', diagnosis: '疑似流感（待核酸确认）', disposition: '留观', time: '2026-10-20 09:30' },
    { id: 'FEV-003', patient: '王先生', temp: 37.8, symptoms: '咽痛', diagnosis: '急性咽炎', disposition: '离院', time: '2026-10-20 10:00' },
    { id: 'FEV-004', patient: '赵女士', temp: 38.9, symptoms: '咳嗽、乏力', diagnosis: '肺炎（待 CT 确认）', disposition: '转诊（呼吸科）', time: '2026-10-20 10:30' },
    { id: 'FEV-005', patient: '刘大爷', temp: 37.5, symptoms: '无明显症状', diagnosis: '低热待查', disposition: '离院', time: '2026-10-20 11:00' },
  ];

  return json(ok({ visits, totalCount: visits.length }));
}

/** GET /api/v1/fever/stats - 发热门诊统计 */
async function handleFeverStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayVisits: 45,
    suspectedInfectious: 8,
    observation: 3,
    reportedCases: 2,
  }));
}

export const m222Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/mobile/tasks', handle: handleMobileTasks, auth: true },
  { method: 'GET', path: '/api/v1/mobile/vitals', handle: handleMobileVitals, auth: true },
  { method: 'GET', path: '/api/v1/mobile/med-scan', handle: handleMobileMedScan, auth: true },
  { method: 'GET', path: '/api/v1/outpatient/infusion', handle: handleOutpatientInfusion, auth: true },
  { method: 'GET', path: '/api/v1/outpatient/infusion-stats', handle: handleOutpatientInfusionStats, auth: true },
  { method: 'GET', path: '/api/v1/fever/visits', handle: handleFeverVisits, auth: true },
  { method: 'GET', path: '/api/v1/fever/stats', handle: handleFeverStats, auth: true },
];
