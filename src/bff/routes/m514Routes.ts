/**
 * 健澜科技 jlmedaios - M514 P0 合规重点（医疗质量安全·院感深度）：院感监控深度 2 端点缺口
 *
 * infection/deep-rates 院感发生率深度、infection/hand-hygiene 手卫生依从性（已 200 不重建）、infection/stats 院感统计。
 * 与 M473 /quality/infection 概览区分（走 infection/ 新前缀）；与 M513 /insurance/*、M512 /workflow/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/infection/deep-rates - 院感发生率深度（感染类型Tag/发生率Tag/科室）5 条 */
async function handleInfectionDeepRates(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDR-001', type: '感染类型Tag：VAP 呼吸机相关肺炎橙（ICU 机械通气患者）', rate: '发生率Tag：1-5‰ 橙（3.2‰，ICU 860 机械通气日发生 28 起）', dept: '科室：ICU（重点监控，目标 ≤5‰）' },
    { id: 'IDR-002', type: '感染类型Tag：CLABSI 导管相关血流感染红', rate: '发生率Tag：>5‰ 红（6.8‰，中心静脉导管 1,200 导管日发生 8 起）', dept: '科室：ICU / 血液科（需整改导管护理流程）' },
    { id: 'IDR-003', type: '感染类型Tag：CAUTI 导管相关尿路感染紫', rate: '发生率Tag：1-5‰ 橙（2.5‰，留置导尿 2,000 导管日发生 5 起）', dept: '科室：神内 / 老年医学科（卧床患者多）' },
    { id: 'IDR-004', type: '感染类型Tag：SSI 手术部位感染蓝', rate: '发生率Tag：<1‰ 绿（0.8‰，本月手术 2,860 台发生 23 起）', dept: '科室：普外科 / 骨科（清洁手术为主）' },
    { id: 'IDR-005', type: '感染类型Tag：MDRO 多重耐药菌绿（CRE / MRSA / CRAB）', rate: '发生率Tag：1-5‰ 橙（3.5‰，MDRO 检出率 12.8%，高于院控目标 ≤10%）', dept: '科室：ICU / 呼吸科（需接触隔离）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/infection/stats - 院感统计（月份/病例数/发生率Tag/MDRO检出率Tag/手卫生依从率）5 条 */
async function handleInfectionStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IS-001', month: '月份：2026-10（本月累计，截至 10-20）', cases: '本月院感病例数：38 例（VAP 8 / CLABSI 6 / CAUTI 5 / SSI 12 / MDRO 7）', rate: '院感发生率Tag：1.8‰ 橙（38 例 / 21,000 住院床日，处于 1-5‰ 区间）', mdro: 'MDRO 检出率Tag：12.8% 橙（高于院控目标 ≤10%）', handHygiene: '手卫生平均依从率：92.5% 橙（目标 ≥95%）' },
    { id: 'IS-002', month: '月份：2026-09（上月完整数据）', cases: '本月院感病例数：42 例', rate: '院感发生率Tag：1.9‰ 橙', mdro: 'MDRO 检出率Tag：13.2% 橙', handHygiene: '手卫生平均依从率：91.8% 橙' },
    { id: 'IS-003', month: '月份：2026-08', cases: '本月院感病例数：48 例', rate: '院感发生率Tag：2.2‰ 橙（夏季高发）', mdro: 'MDRO 检出率Tag：14.5% 橙', handHygiene: '手卫生平均依从率：90.2% 橙' },
    { id: 'IS-004', month: '月份：2026-Q3 汇总（7-9 月）', cases: '季度院感病例数：138 例', rate: '季度院感发生率Tag：2.0‰ 橙', mdro: '季度 MDRO 检出率Tag：13.5% 橙', handHygiene: '季度手卫生平均依从率：91.5% 橙' },
    { id: 'IS-005', month: '月份：2026-10 分类型统计', cases: 'VAP 8 例（ICU 占比 87.5%）/ CLABSI 6 例（ICU 占比 66.7%）/ CAUTI 5 例（神内 60%）/ SSI 12 例（普外科 50%）/ MDRO 7 例（ICU 57.1%）', rate: '高风险科室Tag：ICU（院感发生率 5.8‰，远超院控目标）', mdro: 'MDRO 最高科室：ICU 22.5%（需重点整改）', handHygiene: '手卫生最低科室：急诊科 82.0%（高峰时段依从性差）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m514Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/infection/deep-rates', handle: handleInfectionDeepRates, auth: true },
  { method: 'GET', path: '/api/v1/infection/stats', handle: handleInfectionStats, auth: true },
];
