/**
 * 健澜科技 jlmedaios - M288 缺口补充
 *
 * 肿瘤记录/慢病管理/ICU 监护
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/oncology/records - 肿瘤记录 5 条 */
async function handleOncologyRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const records = [
    { id: 'OR-001', patient: '王***', diagnosis: '肺腺癌（IV期）', stage: 'IV', treatment: '靶向治疗（奥希替尼）', oncologist: '李***主任', startDate: '2026-06-01', status: '治疗中' },
    { id: 'OR-002', patient: '李***', diagnosis: '乳腺癌（IIIB期）', stage: 'IIIB', treatment: '化疗（AC-T方案）', oncologist: '陈***副主任', startDate: '2026-08-15', status: '治疗中' },
    { id: 'OR-003', patient: '张***', diagnosis: '胃癌（II期）', stage: 'II', treatment: '手术+辅助化疗', oncologist: '刘***主治', startDate: '2026-03-20', status: '随访中' },
    { id: 'OR-004', patient: '赵***', diagnosis: '结直肠癌（III期）', stage: 'III', treatment: '术后化疗（FOLFOX）', oncologist: '李***主任', startDate: '2026-07-10', status: '治疗中' },
    { id: 'OR-005', patient: '陈***', diagnosis: '肝癌（I期）', stage: 'I', treatment: '手术切除', oncologist: '王***副主任', startDate: '2026-01-05', status: '随访中' },
  ];
  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/chronic/management - 慢病管理 5 条 */
async function handleChronicManagement(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CM-001', patient: '刘***', disease: '2型糖尿病', lastVisit: '2026-10-15', nextVisit: '2026-11-15', bloodGlucose: '空腹 7.2 mmol/L', status: '稳定' },
    { id: 'CM-002', patient: '吴***', disease: '高血压（2级）', lastVisit: '2026-10-10', nextVisit: '2026-11-10', bloodPressure: '145/92 mmHg', status: '需调整用药' },
    { id: 'CM-003', patient: '孙***', disease: '冠心病', lastVisit: '2026-09-20', nextVisit: '2026-10-20', symptoms: '活动后胸闷', status: '待复诊' },
    { id: 'CM-004', patient: '周***', disease: '慢性阻塞性肺疾病（COPD）', lastVisit: '2026-10-05', nextVisit: '2026-11-05', lungFunction: 'FEV1/FVC 62%', status: '稳定' },
    { id: 'CM-005', patient: '郑***', disease: '脑卒中后遗症', lastVisit: '2026-09-28', nextVisit: '2026-10-28', rehabProgress: '上肢肌力 IV 级', status: '康复中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/icu/monitor - ICU 监护数据 5 条 */
async function handleIcuMonitor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const monitors = [
    { id: 'IM-001', patient: '钱***', bed: 'ICU-01', heartRate: '85 bpm', bloodPressure: '120/75 mmHg', oxygenSaturation: '98%', ventilator: '有创呼吸机', status: '稳定' },
    { id: 'IM-002', patient: '冯***', bed: 'ICU-02', heartRate: '110 bpm', bloodPressure: '95/60 mmHg', oxygenSaturation: '92%', ventilator: '无创通气', status: '需关注' },
    { id: 'IM-003', patient: '褚***', bed: 'ICU-03', heartRate: '72 bpm', bloodPressure: '130/80 mmHg', oxygenSaturation: '99%', ventilator: '高流量氧疗', status: '稳定' },
    { id: 'IM-004', patient: '卫***', bed: 'ICU-04', heartRate: '130 bpm', bloodPressure: '85/50 mmHg', oxygenSaturation: '88%', ventilator: '有创呼吸机', status: '危重' },
    { id: 'IM-005', patient: '蒋***', bed: 'ICU-05', heartRate: '90 bpm', bloodPressure: '115/70 mmHg', oxygenSaturation: '96%', ventilator: '自主呼吸', status: '拟转出' },
  ];
  return json(ok({ monitors, totalCount: monitors.length }));
}

export const m288Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/oncology/records', handle: handleOncologyRecords, auth: true },
  { method: 'GET', path: '/api/v1/chronic/management', handle: handleChronicManagement, auth: true },
  { method: 'GET', path: '/api/v1/icu/monitor', handle: handleIcuMonitor, auth: true },
];
