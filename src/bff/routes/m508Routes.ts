/**
 * 健澜科技 jlmedaios - M508 P0 合规重点（电子病历五级）：患者时间线 3 端点
 *
 * timeline/events 时间线事件、timeline/summary 病程摘要、timeline/stats 时间线统计。
 * 与 M492 随访、M496 健康教育、M507 /fhir/*、M506 /emr/version/*、/outpatient/* 路由区分（走 timeline/ 新前缀）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/timeline/events - 患者时间线事件（事件类型Tag/时间戳/事件描述/发生科室）5 条 */
async function handleTimelineEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TE-001', type: '事件类型Tag：住院绿（入院）', time: '时间戳：2026-10-18 09:30', desc: '事件描述：患者张**入院，诊断"右肺下叶腺癌 cT2N1M0"，收住胸外科', dept: '发生科室：胸外科' },
    { id: 'TE-002', type: '事件类型Tag：检验橙（危急值）', time: '时间戳：2026-10-19 06:15', desc: '事件描述：检验结果危急值——血钾 2.8 mmol/L（低于 3.0 危急线），已通知值班医师补钾', dept: '发生科室：检验科（危急值联动胸外科）' },
    { id: 'TE-003', type: '事件类型Tag：用药青（医嘱）', time: '时间戳：2026-10-19 10:00', desc: '事件描述：开立化疗方案——培美曲塞 + 顺铂（新辅助化疗第 1 周期）', dept: '发生科室：胸外科 / 肿瘤科联合' },
    { id: 'TE-004', type: '事件类型Tag：手术红（手术）', time: '时间戳：2026-10-21 08:00（计划）', desc: '事件描述：拟行胸腔镜下右肺下叶切除术（待化疗 2 周期后评估）', dept: '发生科室：胸外科 / 麻醉科' },
    { id: 'TE-005', type: '事件类型Tag：门诊蓝（门诊）', time: '时间戳：2026-10-15 14:00（既往）', desc: '事件描述：门诊首次就诊，胸部 CT 发现右肺下叶占位，建议住院进一步诊治', dept: '发生科室：门诊呼吸内科' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/timeline/summary - 患者病程摘要（患者/主要诊断/过敏史/手术史/累计住院次数）5 条 */
async function handleTimelineSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TSm-001', patient: '患者姓名：张**（女，58 岁，住院号 20261018001）', diagnosis: '主要诊断：右肺下叶腺癌 cT2N1M0（2026-10-15 首次确诊）', allergy: '过敏史摘要：青霉素过敏（皮疹），无食物过敏', surgery: '手术史摘要：2018 年行腹腔镜胆囊切除术（既往史，与本次无关）', count: '累计住院次数：本次为第 2 次住院（第 1 次为 2018 年胆囊切除术）' },
    { id: 'TSm-002', patient: '患者姓名：李**（男，66 岁，住院号 20261016002）', diagnosis: '主要诊断：胰腺癌 cT3N0M0 伴胆道梗阻（2026-10-16 确诊）', allergy: '过敏史摘要：无药物过敏史', surgery: '手术史摘要：2015 年行阑尾切除术（既往史）', count: '累计住院次数：本次为第 3 次住院' },
    { id: 'TSm-003', patient: '患者姓名：王**（女，45 岁，住院号 20261010003）', diagnosis: '主要诊断：复发性卵巢癌伴腹腔转移（2026-10-10 确诊）', allergy: '过敏史摘要：磺胺类药物过敏（严重皮疹）', surgery: '手术史摘要：2020 年行卵巢癌根治术（首次手术），本次为复发后住院', count: '累计住院次数：本次为第 4 次住院（多次化疗住院）' },
    { id: 'TSm-004', patient: '患者姓名：赵**（男，72 岁，住院号 20261012004）', diagnosis: '主要诊断：急性 STEMI 合并心源性休克（2026-10-12 急诊入院）', allergy: '过敏史摘要：造影剂过敏（轻度，已预处理）', surgery: '手术史摘要：2022 年行 PCI 术（前降支支架植入）', count: '累计住院次数：本次为第 2 次心脏相关住院' },
    { id: 'TSm-005', patient: '患者姓名：孙**（女，52 岁，住院号 20261008005）', diagnosis: '主要诊断：复杂肝内胆管结石伴反复发作胆管炎（2026-10-08 确诊）', allergy: '过敏史摘要：无药物过敏史', surgery: '手术史摘要：2019 年行胆囊切除术（既往史）', count: '累计住院次数：本次为第 3 次住院' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/timeline/stats - 时间线统计（患者ID/近30天事件数/跨科室事件数/关键事件Tag）5 条 */
async function handleTimelineStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TSt-001', patient: '患者ID：EMR-20261018001（张**）', events: '近 30 天事件数：24 条（门诊 3 / 住院 1 / 检验 12 / 检查 4 / 用药 3 / 手术 1）', deptCount: '跨科室事件数：4 个科室（门诊呼吸 / 胸外 / 检验 / 影像）', key: '关键事件Tag：危急值红（血钾 2.8 mmol/L）+ 用药青（化疗方案）' },
    { id: 'TSt-002', patient: '患者ID：EMR-20261016002（李**）', events: '近 30 天事件数：18 条', deptCount: '跨科室事件数：3 个科室（肿瘤 / 胰胃外科 / 介入）', key: '关键事件Tag：手术蓝（拟行胰十二指肠切除）+ 危急值红（胆红素升高）' },
    { id: 'TSt-003', patient: '患者ID：EMR-20261010003（王**）', events: '近 30 天事件数：32 条（多次化疗复查）', deptCount: '跨科室事件数：4 个科室（妇产 / 肿瘤 / 影像 / 病理）', key: '关键事件Tag：过敏警示橙（磺胺过敏）+ 用药青（姑息化疗）' },
    { id: 'TSt-004', patient: '患者ID：EMR-20261012004（赵**）', events: '近 30 天事件数：15 条（急诊抢救密集）', deptCount: '跨科室事件数：3 个科室（心内 / ICU / 心外）', key: '关键事件Tag：危急值红（肌钙蛋白升高）+ 手术蓝（急诊 PCI）' },
    { id: 'TSt-005', patient: '患者ID：EMR-20261008005（孙**）', events: '近 30 天事件数：20 条', deptCount: '跨科室事件数：4 个科室（普外 / 消化 / 影像 / 麻醉）', key: '关键事件Tag：手术蓝（拟行左半肝切除）+ 危急值红（胆管炎高热）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m508Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/timeline/events', handle: handleTimelineEvents, auth: true },
  { method: 'GET', path: '/api/v1/timeline/summary', handle: handleTimelineSummary, auth: true },
  { method: 'GET', path: '/api/v1/timeline/stats', handle: handleTimelineStats, auth: true },
];
