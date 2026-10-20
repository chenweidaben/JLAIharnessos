/**
 * 健澜科技 jlmedaios - M476 P0 合规：手术麻醉质控 / 输血质控 / 危急值闭环 / 护理敏感指标 / 随访回访 / 病案质控查房
 *
 * 手术麻醉质控 / 输血质控 / 危急值闭环 / 护理敏感质量指标（汇总口径）/ 随访回访完成率 / 病案科质控查房
 * 避开 M9-C 手术麻醉、M10 输血、M7-B 危急值、M429 NQI 单指标、M471/M472/M473/M475 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/quality/operation-anesthesia - 手术麻醉质控（科室/手术并发症率/麻醉不良事件率/目标值/环比）5 条 */
async function handleOpAnesthesia(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OA-001', dept: '科室：全院手术麻醉汇总', surgComp: '手术并发症率：0.86%（术后 30 日内并发症）', anesAdv: '麻醉不良事件率：0.12%', target: '目标值：并发症率 ≤1.0%、麻醉不良事件 ≤0.2%（达标）', mom: '环比：并发症率 -0.08%（下降）' },
    { id: 'OA-002', dept: '科室：普外科', surgComp: '手术并发症率：1.12%', anesAdv: '麻醉不良事件率：0.10%', target: '目标值：≤1.0%（略超，需个案复盘）', mom: '环比：+0.05%（腹腔镜中转开放 1 例）' },
    { id: 'OA-003', dept: '科室：骨科', surgComp: '手术并发症率：0.74%', anesAdv: '麻醉不良事件率：0.08%', target: '目标值：达标', mom: '环比：持平' },
    { id: 'OA-004', dept: '科室：神经外科', surgComp: '手术并发症率：1.45%（重症复杂手术占比高）', anesAdv: '麻醉不良事件率：0.21%', target: '目标值：按复杂手术专项管控', mom: '环比：-0.12%（术前评估前置见效）' },
    { id: 'OA-005', dept: '科室：妇产科', surgComp: '手术并发症率：0.52%', anesAdv: '麻醉不良事件率：0.05%', target: '目标值：达标（流程标准）', mom: '环比：持平' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/blood-transfusion - 输血质控（科室/输血反应率/合理用血率/废血率/目标值）5 条 */
async function handleBloodTransfusion(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BT-001', dept: '科室：全院输血汇总', reaction: '输血反应率：0.18%（含过敏/发热反应）', rational: '合理用血率：96.2%（符合指征）', waste: '废血率：0.32%（报废/过期）', target: '目标值：反应率 ≤0.3%、合理用血 ≥95%（达标）' },
    { id: 'BT-002', dept: '科室：手术麻醉科（术中用血）', reaction: '输血反应率：0.22%', rational: '合理用血率：95.0%', waste: '废血率：0.40%', target: '目标值：达标（术中严格评估）' },
    { id: 'BT-003', dept: '科室：血液内科', reaction: '输血反应率：0.45%（长期输血患者抗体多）', rational: '合理用血率：94.0%', waste: '废血率：0.55%', target: '目标值：按专科（加强配型与预处理）' },
    { id: 'BT-004', dept: '科室：ICU', reaction: '输血反应率：0.30%', rational: '合理用血率：93.0%', waste: '废血率：0.60%', target: '目标值：按重症（限制性输血策略落实中）' },
    { id: 'BT-005', dept: '科室：急诊科', reaction: '输血反应率：0.10%', rational: '合理用血率：97.0%', waste: '废血率：0.15%', target: '目标值：达标（紧急用血流程规范）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/critical-value - 危急值闭环（科室/报告数/及时处理率/闭环率/平均耗时）5 条 */
async function handleCriticalValue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CV-001', dept: '科室：全院危急值汇总', reportCount: '报告数：本月 286 例', timely: '及时处理率（10 分钟内）：94.8%', closedLoop: '闭环率（病程+处置留痕）：96.2%', avgTime: '平均耗时：6.4 分钟（从接报到处置）' },
    { id: 'CV-002', dept: '科室：检验科 LIS 发起（血钾/血糖等）', reportCount: '报告数：162 例', timely: '及时处理率：96.9%', closedLoop: '闭环率：97.5%', avgTime: '平均耗时：5.8 分钟' },
    { id: 'CV-003', dept: '科室：放射/CT 发起（脑出血/气胸等）', reportCount: '报告数：58 例', timely: '及时处理率：89.7%', closedLoop: '闭环率：91.4%', avgTime: '平均耗时：8.1 分钟（需床旁评估）' },
    { id: 'CV-004', dept: '科室：心电/功能检查发起', reportCount: '报告数：34 例', timely: '及时处理率：97.1%', closedLoop: '闭环率：97.1%', avgTime: '平均耗时：5.2 分钟' },
    { id: 'CV-005', dept: '科室：病理/术中冰冻发起', reportCount: '报告数：32 例', timely: '及时处理率：93.8%', closedLoop: '闭环率：100%（术中必接）', avgTime: '平均耗时：7.0 分钟' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/sensitive-indicators - 护理敏感质量指标（指标名/发生例数/出院人次/发生率/目标值）5 条 */
async function handleNursingSensitive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NSI-001', indicator: '指标名：住院患者跌倒发生率', cases: '发生例数：6 例', discharges: '出院人次：1,842 人次', rate: '发生率：0.33‰', target: '目标值：≤0.50‰（达标）' },
    { id: 'NSI-002', indicator: '指标名：院内压力性损伤发生率', cases: '发生例数：4 例', discharges: '出院人次：1,842 人次', rate: '发生率：0.22‰', target: '目标值：≤0.30‰（达标）' },
    { id: 'NSI-003', indicator: '指标名：管路非计划滑脱发生率', cases: '发生例数：3 例', discharges: '出院人次：1,842 人次', rate: '发生率：0.16‰', target: '目标值：≤0.20‰（达标）' },
    { id: 'NSI-004', indicator: '指标名：给药错误（送达前拦截/实际）', cases: '发生例数：2 例（1 起拦截）', discharges: '出院人次：1,842 人次', rate: '发生率：0.11‰', target: '目标值：≤0.15‰（达标）' },
    { id: 'NSI-005', indicator: '指标名：护士执业环境（床护比达标率）', cases: '在岗护士：168 人', discharges: '开放床位：480 张', rate: '床护比：1:0.35', target: '目标值：≥1:0.40（招聘补足中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/return-visit - 随访回访完成率（科室/应回访数/已回访/完成率/失访数）5 条 */
async function handleReturnVisit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RV-001', dept: '科室：全院出院随访汇总', due: '应回访数：本月 3,260 例', done: '已回访：3,012 例', rate: '完成率：92.4%', lost: '失访数：248 例（电话失联/拒访）' },
    { id: 'RV-002', dept: '科室：心血管内科（重点慢病）', due: '应回访数：420 例', done: '已回访：398 例', rate: '完成率：94.8%', lost: '失访数：22 例' },
    { id: 'RV-003', dept: '科室：内分泌/糖尿病', due: '应回访数：310 例', done: '已回访：285 例', rate: '完成率：91.9%', lost: '失访数：25 例（互联网医院+电话结合）' },
    { id: 'RV-004', dept: '科室：肿瘤科', due: '应回访数：186 例', done: '已回访：160 例', rate: '完成率：86.0%', lost: '失访数：26 例（病情/随访配合度因素）' },
    { id: 'RV-005', dept: '科室：普外科（术后随访）', due: '应回访数：352 例', done: '已回访：336 例', rate: '完成率：95.5%', lost: '失访数：16 例' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/quality-rounds - 病案科质控查房记录（查房日期/科室/发现问题/整改要求/检查人）5 条 */
async function handleEmrQualityRounds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QR-001', date: '查房日期：2026-10-16', dept: '科室：呼吸内科病区', problem: '发现问题：现病史与诊断衔接不充分、抗生素使用病程记录缺项（抽查 15 份）', rectify: '整改要求：3 日内补全，科室质控员复核', checker: '检查人：病案科 王***（质控医师）' },
    { id: 'QR-002', date: '查房日期：2026-10-13', dept: '科室：普外科病区', problem: '发现问题：手术记录与术前讨论一致性待加强，1 份手术记录时限临近', rectify: '整改要求：规范术后 24h 内完成手术记录', checker: '检查人：病案科 李*** + 医务部' },
    { id: 'QR-003', date: '查房日期：2026-10-10', dept: '科室：心内科病区', problem: '发现问题：危急值处置入病程记录有 1 例未完整体现', rectify: '整改要求：危急值处置必须入病程并可审计', checker: '检查人：病案编码组 张***' },
    { id: 'QR-004', date: '查房日期：2026-10-08', dept: '科室：神经内科病区', problem: '发现问题：病案首页主要诊断选择偏误影响 DRG 分组（2 例）', rectify: '整改要求：编码员前置复核 + 主诊选择培训', checker: '检查人：病案科 + DRG 专员' },
    { id: 'QR-005', date: '查房日期：2026-10-06', dept: '科室：ICU', problem: '发现问题：转科记录衔接与监护参数记录颗粒度不足', rectify: '整改要求：转科记录必须含关键监护指标交接', checker: '检查人：病案科 陈***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m476Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/quality/operation-anesthesia', handle: handleOpAnesthesia, auth: true },
  { method: 'GET', path: '/api/v1/quality/blood-transfusion', handle: handleBloodTransfusion, auth: true },
  { method: 'GET', path: '/api/v1/quality/critical-value', handle: handleCriticalValue, auth: true },
  { method: 'GET', path: '/api/v1/nursing/sensitive-indicators', handle: handleNursingSensitive, auth: true },
  { method: 'GET', path: '/api/v1/patient/return-visit', handle: handleReturnVisit, auth: true },
  { method: 'GET', path: '/api/v1/emr/quality-rounds', handle: handleEmrQualityRounds, auth: true },
];
