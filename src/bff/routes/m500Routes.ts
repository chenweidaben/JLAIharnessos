/**
 * 健澜科技 jlmedaios - M500 里程碑 P0 合规：医疗废弃物全流程管理 3 端点（补缺口）
 *
 * waste/collection 已 200（已有确认不重建）；本批补建 waste/treatment、waste/traceability、waste/statistics。
 * 与 M479 /infection/*（院感）、M499 /mdt/*、M498 /tech/*、M497 /ethics/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/waste/treatment - 医废处置（处置方式Tag/重量kg/处置时间/处置单位）5 条 */
async function handleWasteTreatment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WT-001', method: '处置方式Tag：高温蒸煮（感染性医废就地处置）', weight: '重量：45.6 kg（批次 W20261020-001）', time: '处置时间：2026-10-20 11:30（当日上午批次）', unit: '处置单位：院内医废高温蒸煮设备（编号 YY-W-001）' },
    { id: 'WT-002', method: '处置方式Tag：焚烧（病理性医废委外处置）', weight: '重量：12.8 kg（批次 W20261019-003）', time: '处置时间：2026-10-19 14:00（委外转运）', unit: '处置单位：杭州绿益医废处置有限公司（特许经营）' },
    { id: 'WT-003', method: '处置方式Tag：消毒（损伤性医废就地消毒）', weight: '重量：8.2 kg（批次 W20261020-002，锐器盒 16 个）', time: '处置时间：2026-10-20 10:00', unit: '处置单位：院内医废消毒设备（编号 YY-W-002）' },
    { id: 'WT-004', method: '处置方式Tag：化学处理（化学性医废委外处置）', weight: '重量：5.4 kg（批次 W20261018-005，显影液/废试剂）', time: '处置时间：2026-10-18 15:30', unit: '处置单位：杭州危废处置中心（危废经营许可证）' },
    { id: 'WT-005', method: '处置方式Tag：高温蒸煮（药物性医废委外处置）', weight: '重量：3.6 kg（批次 W20261017-002，过期药品）', time: '处置时间：2026-10-17 09:00', unit: '处置单位：杭州绿益医废处置有限公司' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/waste/traceability - 医废追溯（批次号/产生科室/交接人/接收人/称重记录/状态Tag）5 条 */
async function handleWasteTraceability(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WTb-001', batch: '批次号：W20261020-001（二维码可追溯）', dept: '产生科室：普外科病房（今日 08:00 产生）', handover: '交接人：普外科 李护士（工号 N1023）', receiver: '接收人：医废转运员 王师傅（工号 T005）', weight: '称重记录：45.6 kg（交接时双称重，误差 0.1 kg 内）', status: '状态Tag：已处置（高温蒸煮完成，已销账）' },
    { id: 'WTb-002', batch: '批次号：W20261019-003', dept: '产生科室：病理科（昨日 16:00 产生）', handover: '交接人：病理科 张技师（工号 P008）', receiver: '接收人：绿益公司 刘转运员', weight: '称重记录：12.8 kg（院方 12.85 / 转运方 12.80，差 0.05 kg）', status: '状态Tag：已处置（焚烧完成，已回收联单）' },
    { id: 'WTb-003', batch: '批次号：W20261020-002', dept: '产生科室：急诊科（今日 09:30 产生）', handover: '交接人：急诊科 刘护士（工号 N208）', receiver: '接收人：医废转运员 王师傅', weight: '称重记录：8.2 kg（锐器盒 16 个 × 0.51 kg）', status: '状态Tag：转运中（已交接，待院内消毒设备处理）' },
    { id: 'WTb-004', batch: '批次号：W20261018-005', dept: '产生科室：影像科（2026-10-18 14:00 产生）', handover: '交接人：影像科 陈技师（工号 R016）', receiver: '接收人：危废中心 赵转运员', weight: '称重记录：5.4 kg（显影液 4.2 kg + 废试剂 1.2 kg）', status: '状态Tag：已处置（化学处理完成，危废联单已归档）' },
    { id: 'WTb-005', batch: '批次号：W20261017-002', dept: '产生科室：药剂科（2026-10-17 08:00 产生）', handover: '交接人：药剂科 周药师（工号 P031）', receiver: '接收人：绿益公司 刘转运员', weight: '称重记录：3.6 kg（过期药品）', status: '状态Tag：已处置（高温蒸煮，已回收联单）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/waste/statistics - 医废统计（本月总量/感染性占比/损伤性占比/科室TOP5/处置及时率）5 条 */
async function handleWasteStatistics(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WS-001', total: '本月总量：2,860 kg（2026-10 累计，日均 92.3 kg）', infectious: '感染性医废占比：78.5%（2,245 kg），主要来自病房/门诊', sharp: '损伤性医废占比：12.4%（355 kg），锐器盒约 710 个', top5: '科室 TOP5：①普外科 320 kg ②急诊科 286 kg ③骨科 218 kg ④妇产科 196 kg ⑤神经内科 182 kg', timely: '处置及时率：98.6%（当日收集当日处置，2 批次延迟超 24h）' },
    { id: 'WS-002', total: '本月感染性医废：2,245 kg（较上月 +4.2%）', infectious: '感染性医废主要来源：病房输液器/棉签/敷料（占 62%）', sharp: '损伤性医废主要来源：注射针头/手术刀片/缝合针（占 85%）', top5: '感染性医废 TOP3 科室：①普外科 268 kg ②急诊科 242 kg ③骨科 186 kg', timely: '感染性医废处置及时率：99.1%（高温蒸煮设备满负荷运行）' },
    { id: 'WS-003', total: '本月病理性医废：86 kg（较上月 -8.3%）', infectious: '病理性医废来源：手术切除标本/胎盘/引产组织（委外焚烧）', sharp: '病理性医废处置方式：100% 委外焚烧（绿益公司）', top5: '病理性医废 TOP3 科室：①妇产科 32 kg ②普外科 26 kg ③骨科 12 kg', timely: '病理性医废处置及时率：100%（全部按周转运，无积压）' },
    { id: 'WS-004', total: '本月化学性医废：42 kg（较上月 +12.5%）', infectious: '化学性医废来源：显影液/废试剂/甲醛/消毒液（委外危废）', sharp: '化学性医废处置方式：100% 委外危废处置（危废经营许可证单位）', top5: '化学性医废 TOP3 科室：①影像科 22 kg ②病理科 12 kg ③检验科 6 kg', timely: '化学性医废处置及时率：100%（按月转运，台账完整）' },
    { id: 'WS-005', total: '本月药物性医废：28 kg（较上月 -5.7%）', infectious: '药物性医废来源：过期药品/废弃化疗药物/废弃疫苗（委外焚烧）', sharp: '药物性医废处置方式：100% 委外焚烧（绿益公司）', top5: '药物性医废 TOP3 科室：①药剂科 18 kg ②肿瘤科 6 kg ③检验科 2 kg', timely: '药物性医废处置及时率：100%（按月转运，台账完整）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m500Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/waste/treatment', handle: handleWasteTreatment, auth: true },
  { method: 'GET', path: '/api/v1/waste/traceability', handle: handleWasteTraceability, auth: true },
  { method: 'GET', path: '/api/v1/waste/statistics', handle: handleWasteStatistics, auth: true },
];
