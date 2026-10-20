/**
 * 健澜科技 jlmedaios - M493 P0 合规：教学管理（edu/ 新前缀）+ 药事质量
 *
 * edu/* 走教学查房/出科考核/进修医师口径，与 M460 /teaching/rounds、M480 /teaching/* 区分；
 * pharmacy/antibiotic-rate、injection-rate 走使用率口径，
 * 与 M475 /ams-warning、M453 /abx-grading、/prescription-review 区分。
 * 避开 M460·M480·M453·M484·M475·M492·M492b 既有端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/edu/teaching-rounds - 教学查房（科室/本周查房次数/参与医师数/教学主任）5 条 */
async function handleTeachingRounds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TR-001', dept: '科室：心血管内科（教学主任 王教授）', rounds: '本周查房次数：3 次（周二/周四/周六各 1 次）', residents: '参与医师数：24 人（含规培生 12 人/进修 4 人）', director: '教学主任：王教授（主任医师，硕导）' },
    { id: 'TR-002', dept: '科室：普外科（教学主任 李教授）', rounds: '本周查房次数：2 次', residents: '参与医师数：18 人（规培生 8 人/实习生 6 人）', director: '教学主任：李教授（主任医师，博导）' },
    { id: 'TR-003', dept: '科室：神经内科（教学主任 张教授）', rounds: '本周查房次数：2 次（含 1 次神经阅片教学）', residents: '参与医师数：16 人（规培生 6 人/研究生 4 人）', director: '教学主任：张教授（主任医师）' },
    { id: 'TR-004', dept: '科室：呼吸与危重症医学科（教学主任 刘教授）', rounds: '本周查房次数：2 次', residents: '参与医师数：14 人（规培生 5 人/进修 3 人）', director: '教学主任：刘教授（主任医师）' },
    { id: 'TR-005', dept: '科室：妇产科（教学主任 陈教授）', rounds: '本周查房次数：2 次（含 1 次产房教学）', residents: '参与医师数：12 人（规培生 4 人/实习生 5 人）', director: '教学主任：陈教授（主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/edu/rotation-exam - 出科考核（科室/考核人数/合格率/平均成绩/最低分）5 条 */
async function handleRotationExam(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RE-001', dept: '科室：内科（轮转出科考核 2026-10）', count: '考核人数：36 人（含规培生 24 人/实习生 12 人）', pass: '合格率：94.4%（34 人合格，2 人补考）', avg: '平均成绩：86.2 分（满分 100）', lowest: '最低分：58 分（补考对象）' },
    { id: 'RE-002', dept: '科室：外科', count: '考核人数：28 人', pass: '合格率：92.9%（26 人合格）', avg: '平均成绩：84.5 分', lowest: '最低分：62 分' },
    { id: 'RE-003', dept: '科室：妇产科', count: '考核人数：18 人', pass: '合格率：100.0%（18 人全部合格）', avg: '平均成绩：88.6 分', lowest: '最低分：72 分' },
    { id: 'RE-004', dept: '科室：急诊科', count: '考核人数：22 人', pass: '合格率：90.9%（20 人合格）', avg: '平均成绩：82.4 分', lowest: '最低分：56 分（补考）' },
    { id: 'RE-005', dept: '科室：儿科', count: '考核人数：14 人', pass: '合格率：92.9%（13 人合格）', avg: '平均成绩：85.8 分', lowest: '最低分：68 分' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/edu/fellowship - 进修医师（月份/在培人数/来源医院数/结业人数/结业率）5 条 */
async function handleFellowship(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FS-001', month: '月份：2026-09（在培进修医师 86 人）', active: '在培人数：86 人（含省级医院 32 人/市级 48 人/县级 6 人）', hospitals: '来源医院数：42 家（全省 11 地市覆盖）', graduate: '结业人数：24 人（3/6/12 个月周期）', rate: '结业率：100.0%（24 人均考核合格）' },
    { id: 'FS-002', month: '月份：2026-08', active: '在培人数：78 人', hospitals: '来源医院数：38 家', graduate: '结业人数：20 人', rate: '结业率：100.0%' },
    { id: 'FS-003', month: '月份：2026-07', active: '在培人数：72 人', hospitals: '来源医院数：36 家', graduate: '结业人数：18 人', rate: '结业率：100.0%' },
    { id: 'FS-004', month: '月份：2026-06', active: '在培人数：68 人', hospitals: '来源医院数：34 家', graduate: '结业人数：16 人', rate: '结业率：93.8%（1 人因考核不合格延期）' },
    { id: 'FS-005', month: '月份：2026-05', active: '在培人数：62 人', hospitals: '来源医院数：32 家', graduate: '结业人数：14 人', rate: '结业率：100.0%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/antibiotic-rate - 抗菌药物使用率（科室/使用率/使用强度DDDs/送检率）5 条 */
async function handleAntibioticRate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AR-001', dept: '科室：呼吸与危重症医学科（2026-09）', rate: '抗菌药物使用率：68.5%（住院患者）', ddds: '使用强度：58.6 DDDs/100 人天（≤40 为达标，偏高需干预）', culture: '微生物送检率：42.8%（治疗性使用 ≥30% 达标）', note: '重点监控：限制使用级占 62%' },
    { id: 'AR-002', dept: '科室：普外科', rate: '抗菌药物使用率：52.6%（手术预防使用为主）', ddds: '使用强度：32.4 DDDs/100 人天（达标）', culture: '微生物送检率：18.6%（预防使用不强制送检）', note: '重点监控：Ⅰ类切口预防用药占比' },
    { id: 'AR-003', dept: '科室：神经内科', rate: '抗菌药物使用率：28.4%', ddds: '使用强度：14.8 DDDs/100 人天（达标）', culture: '微生物送检率：36.2%（达标）', note: '重点监控：无（合理使用）' },
    { id: 'AR-004', dept: '科室：ICU', rate: '抗菌药物使用率：86.2%（危重患者经验治疗）', ddds: '使用强度：86.4 DDDs/100 人天（ICU 特殊放宽）', culture: '微生物送检率：68.5%（高于院均）', note: '重点监控：特殊使用级占 32%（需会诊审批）' },
    { id: 'AR-005', dept: '科室：骨科', rate: '抗菌药物使用率：46.8%', ddds: '使用强度：26.2 DDDs/100 人天（达标）', culture: '微生物送检率：22.4%', note: '重点监控：关节置换预防用药疗程' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/injection-rate - 注射剂使用率（科室/门诊/住院/急诊/同比）5 条 */
async function handleInjectionRate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IR-001', scene: '场景：全院门诊（2026-09）', outpatient: '门诊注射率：18.6%（≤20% 达标）', inpatient: '住院注射率：92.4%（住院常规治疗）', emergency: '急诊注射率：68.5%（急诊处置为主）', yoy: '同比：-1.8pct（去年门诊 20.4%，持续改善）' },
    { id: 'IR-002', scene: '场景：儿科门诊', outpatient: '门诊注射率：12.4%（儿童优先口服）', inpatient: '住院注射率：86.2%', emergency: '急诊注射率：52.6%', yoy: '同比：-2.2pct' },
    { id: 'IR-003', scene: '场景：全科/普通内科门诊', outpatient: '门诊注射率：22.8%（略高于院均，重点干预）', inpatient: '住院注射率：88.6%', emergency: '急诊注射率：62.4%', yoy: '同比：+0.6pct（需加强合理用药宣教）' },
    { id: 'IR-004', scene: '场景：急诊综合', outpatient: '门诊注射率：N/A（急诊场景）', inpatient: '住院注射率：N/A', emergency: '急诊注射率：72.8%（含抢救/肌注/静滴）', yoy: '同比：-1.2pct' },
    { id: 'IR-005', scene: '场景：中医科门诊', outpatient: '门诊注射率：8.6%（中药口服为主）', inpatient: '住院注射率：62.4%（康复期口服为主）', emergency: '急诊注射率：32.5%', yoy: '同比：-0.8pct' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m493Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/edu/teaching-rounds', handle: handleTeachingRounds, auth: true },
  { method: 'GET', path: '/api/v1/edu/rotation-exam', handle: handleRotationExam, auth: true },
  { method: 'GET', path: '/api/v1/edu/fellowship', handle: handleFellowship, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/antibiotic-rate', handle: handleAntibioticRate, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/injection-rate', handle: handleInjectionRate, auth: true },
];
