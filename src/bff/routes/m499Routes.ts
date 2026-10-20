/**
 * 健澜科技 jlmedaios - M499 P0 合规：多学科会诊 MDT 管理 3 端点
 *
 * mdt/cases MDT 病例列表、mdt/schedule MDT 排程、mdt/effect MDT 效果评估。
 * 与 M494 /quality/consult-rate（普通会诊及时率）、M498 /tech/*、M497 /ethics/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/mdt/cases - MDT 病例列表（患者/初步诊断/申请科室/参与科室数/状态Tag）5 条 */
async function handleMdtCases(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MC-001', patient: '患者姓名：张**（女，58 岁，住院号 20261018001）', diagnosis: '初步诊断：右肺下叶腺癌（cT2N1M0），胸膜疑似转移', dept: '申请科室：胸外科（王教授申请）', deptCount: '参与会诊科室数：5 个（胸外/肿瘤/呼吸/影像/病理）', status: '状态Tag：进行中（2026-10-20 14:00 会诊中）' },
    { id: 'MC-002', patient: '患者姓名：李**（男，66 岁，住院号 20261016002）', diagnosis: '初步诊断：胰腺癌（cT3N0M0），伴胆道梗阻', dept: '申请科室：肿瘤科（张教授申请）', deptCount: '参与会诊科室数：4 个（肿瘤/胰胃外科/介入/影像）', status: '状态Tag：待会诊（2026-10-22 09:00 预约）' },
    { id: 'MC-003', patient: '患者姓名：王**（女，45 岁，住院号 20261010003）', diagnosis: '初步诊断：复发性卵巢癌伴腹腔转移', dept: '申请科室：妇产科（陈主任申请）', deptCount: '参与会诊科室数：4 个（妇产/肿瘤/影像/病理）', status: '状态Tag：已完成（2026-10-15 会诊完成，方案已出具）' },
    { id: 'MC-004', patient: '患者姓名：赵**（男，72 岁，住院号 20261012004）', diagnosis: '初步诊断：急性 STEMI 合并心源性休克，多脏器功能不全', dept: '申请科室：心血管内科（王教授申请）', deptCount: '参与会诊科室数：3 个（心内/ICU/心外科）', status: '状态Tag：待会诊（急会诊 24h 内安排）' },
    { id: 'MC-005', patient: '患者姓名：孙**（女，52 岁，住院号 20261008005）', diagnosis: '初步诊断：复杂肝内胆管结石伴反复发作胆管炎', dept: '申请科室：普外科（李教授申请）', deptCount: '参与会诊科室数：4 个（普外/消化/影像/麻醉）', status: '状态Tag：已完成（2026-10-10 会诊完成，建议行左半肝切除）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/mdt/schedule - MDT 排程（MDT类型/会诊时间/地点/主持医师/参与科室数）5 条 */
async function handleMdtSchedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MS-001', type: 'MDT类型：肺癌 MDT（每周二固定）', time: '会诊时间：2026-10-21（周二）14:00-16:00', place: '地点：门诊楼 5F 示教室 1', host: '主持医师：胸外科 王教授（主任医师）', deptCount: '参与科室数：5 个（胸外/肿瘤/呼吸/影像/病理）' },
    { id: 'MS-002', type: 'MDT类型：胰腺癌 MDT（每周四固定）', time: '会诊时间：2026-10-23（周四）09:00-11:00', place: '地点：住院部 3F 会议室', host: '主持医师：肿瘤科 张教授（主任医师）', deptCount: '参与科室数：4 个（肿瘤/胰胃外科/介入/影像）' },
    { id: 'MS-003', type: 'MDT类型：妇科肿瘤 MDT（每周一固定）', time: '会诊时间：2026-10-27（下周一）15:00-17:00', place: '地点：妇产科示教室', host: '主持医师：妇产科 陈主任（副主任医师）', deptCount: '参与科室数：4 个（妇产/肿瘤/影像/病理）' },
    { id: 'MS-004', type: 'MDT类型：心血管急危重症 MDT（按需预约）', time: '会诊时间：2026-10-20（今日）16:00-17:00', place: '地点：ICU 会议室', host: '主持医师：心血管内科 王教授', deptCount: '参与科室数：3 个（心内/ICU/心外科）' },
    { id: 'MS-005', type: 'MDT类型：复杂肝胆结石 MDT（每周三固定）', time: '会诊时间：2026-10-22（周三）14:30-16:30', place: '地点：普外科示教室', host: '主持医师：普外科 李教授（主任医师）', deptCount: '参与科室数：4 个（普外/消化/影像/麻醉）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/mdt/effect - MDT 效果评估（病例摘要/方案采纳率/预后Tag/随访结论）5 条 */
async function handleMdtEffect(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ME-001', case: '病例摘要：张**右肺腺癌（cT2N1M0），MDT 建议新辅助化疗后手术', adoption: '方案采纳率：100%（申请科室完全采纳 MDT 建议）', outcome: '预后Tag：良好（已行新辅助化疗 2 周期，PR，拟手术）', followup: '随访结论：术后 3 个月随访，无复发转移，继续辅助治疗' },
    { id: 'ME-002', case: '病例摘要：李**胰腺癌伴胆道梗阻，MDT 建议先行 PTCD 减黄再评估手术', adoption: '方案采纳率：100%（PTCD 已完成，胆红素下降，拟行胰十二指肠切除）', outcome: '预后Tag：待定（围手术期，待术后病理评估）', followup: '随访结论：术后 2 周，恢复良好，拟出院后 1 个月返院化疗' },
    { id: 'ME-003', case: '病例摘要：王**复发性卵巢癌，MDT 建议姑息化疗为主、暂缓二次减瘤术', adoption: '方案采纳率：80%（申请科室采纳化疗建议，患者因经济原因拒绝二次减瘤）', outcome: '预后Tag：一般（化疗 1 周期后 SD，需继续评估）', followup: '随访结论：2 周前完成 2 周期化疗，CA125 下降 40%，继续随访' },
    { id: 'ME-004', case: '病例摘要：赵**急性 STEMI 合并心源性休克，MDT 建议急诊 PCI + IABP 支持', adoption: '方案采纳率：100%（急诊 PCI 已完成，IABP 辅助 3 天撤除）', outcome: '预后Tag：良好（心功能恢复至 LVEF 45%，脱离呼吸机）', followup: '随访结论：ICU 转出，拟 1 周后出院，门诊随访心功能' },
    { id: 'ME-005', case: '病例摘要：孙**复杂肝内胆管结石，MDT 建议左半肝切除', adoption: '方案采纳率：100%（已行左半肝切除，术后恢复良好）', outcome: '预后Tag：良好（术后 10 天，T 管引流，无胆漏）', followup: '随访结论：术后 1 个月复查，T 管造影通畅，拟 3 个月后拔管' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m499Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/mdt/cases', handle: handleMdtCases, auth: true },
  { method: 'GET', path: '/api/v1/mdt/schedule', handle: handleMdtSchedule, auth: true },
  { method: 'GET', path: '/api/v1/mdt/effect', handle: handleMdtEffect, auth: true },
];
