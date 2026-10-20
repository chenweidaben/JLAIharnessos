/**
 * 健澜科技 jlmedaios - M510b P0 合规重点（电子病历五级·护理 NQI 看板）：压力性损伤+跌倒坠床+护理质量统计 3 端点
 *
 * nursing/nqi-pressure-ulcer 压力性损伤监测、nursing/nqi-falls 跌倒坠床监测、nursing/nqi-stats 护理质量统计。
 * 与 M510 /nursing/nqi/ 斜杠路径（不良事件/预防/疼痛口径）区分（走 nursing/nqi- 横杠路径）；
 * 与 M492 /nursing/*、M476 /nursing/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nursing/nqi-pressure-ulcer - 压力性损伤监测（患者/分期Tag/部位/科室/发生率）5 条 */
async function handleNursingNqiPressureUlcer(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PPU-001', patient: '患者姓名：张**（男，78 岁，脑梗死后遗症卧床，住院 21 天）', stage: '分期Tag：2期橙（表皮破损，真皮层暴露，面积 3×4cm）', site: '发生部位：骶尾部', dept: '科室：神经内科', rate: '发生率：本月累计 1.2‰（神内卧床患者 83 床日发生 1 起）' },
    { id: 'PPU-002', patient: '患者姓名：李**（女，66 岁，胰腺癌晚期恶病质，住院 14 天）', stage: '分期Tag：3期红（全皮层破损，皮下脂肪可见，面积 5×6cm）', site: '发生部位：左髋部', dept: '科室：肿瘤科', rate: '发生率：本月累计 2.4‰（肿瘤科卧床患者 42 床日发生 1 起）' },
    { id: 'PPU-003', patient: '患者姓名：王**（男，82 岁，ICU 机械通气镇静，住院 7 天）', stage: '分期Tag：1期黄（皮肤完整但红斑压之不褪色，面积 2×2cm）', site: '发生部位：足跟', dept: '科室：ICU', rate: '发生率：本月累计 0.8‰（ICU 卧床患者 125 床日发生 1 起）' },
    { id: 'PPU-004', patient: '患者姓名：赵**（女，58 岁，脊柱术后制动，住院 5 天）', stage: '分期Tag：2期橙（表皮破损，面积 1×2cm）', site: '发生部位：肩胛骨', dept: '科室：骨科', rate: '发生率：本月累计 0.5‰（骨科制动患者 200 床日发生 1 起）' },
    { id: 'PPU-005', patient: '患者姓名：孙**（男，70 岁，糖尿病合并压疮感染，住院 30 天）', stage: '分期Tag：4期紫（全皮层缺损伴骨/肌腱暴露，面积 6×8cm）', site: '发生部位：骶尾部（既往史加重）', dept: '科室：内分泌科（合并感染，已请外科会诊）', rate: '发生率：本月累计 3.2‰（内分泌科卧床患者 31 床日发生 1 起）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-falls - 跌倒坠床监测（患者/风险等级Tag/跌倒类型Tag/时间）5 条 */
async function handleNursingNqiFalls(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PNF-001', patient: '患者姓名：张**（男，78 岁，老年科住院，Morse 评分 65 分）', risk: '风险等级Tag：高危橙（Morse 45-79 分）', type: '跌倒类型Tag：滑倒（夜间如厕地面湿滑）', time: '发生时间：2026-10-19 23:15（无骨折，擦伤）' },
    { id: 'PNF-002', patient: '患者姓名：李**（女，82 岁，骨科术后，Morse 评分 80 分）', risk: '风险等级Tag：极高危红（Morse ≥80 分）', type: '跌倒类型Tag：坠床（自行解开床栏坠床）', time: '发生时间：2026-10-18 02:30（右髋部骨折，二次手术）' },
    { id: 'PNF-003', patient: '患者姓名：王**（男，65 岁，神内住院，Morse 评分 35 分）', risk: '风险等级Tag：中危黄（Morse 25-44 分）', type: '跌倒类型Tag：绊倒（走廊杂物绊倒）', time: '发生时间：2026-10-17 15:00（无外伤）' },
    { id: 'PNF-004', patient: '患者姓名：赵**（女，55 岁，普外科，Morse 评分 20 分）', risk: '风险等级Tag：低危绿（Morse <25 分）', type: '跌倒类型Tag：滑倒（卫生间地砖滑倒）', time: '发生时间：2026-10-16 08:00（无外伤）' },
    { id: 'PNF-005', patient: '患者姓名：孙**（男，72 岁，老年科，Morse 评分 72 分）', risk: '风险等级Tag：高危橙', type: '跌倒类型Tag：坠床（起身时头晕坠床）', time: '发生时间：2026-10-15 06:00（前额擦伤，CT 无异常）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi-stats - 护理质量统计（月份/床护比/护患比/不良事件率/满意度）5 条 */
async function handleNursingNqiStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PNS-001', month: '月份：2026-10（本月累计，截至 10-20）', ratio: '床护比：1:0.42（全院编制床位 1,200 / 注册护士 504 人，达标三级医院 1:0.4）', nurseRatio: '护患比：白班 1:4.5 / 夜班 1:8.2（ICU 1:2.5，达标）', incidentRate: '护理不良事件率：0.18‰（8 起 / 4,400 床日，优于院控目标 ≤0.25‰）', satisfaction: '护理满意度：96.2%（本月出院患者问卷 486 份）' },
    { id: 'PNS-002', month: '月份：2026-09（上月完整数据）', ratio: '床护比：1:0.41', nurseRatio: '护患比：白班 1:4.6 / 夜班 1:8.5', incidentRate: '护理不良事件率：0.22‰', satisfaction: '护理满意度：95.8%' },
    { id: 'PNS-003', month: '月份：2026-08', ratio: '床护比：1:0.40', nurseRatio: '护患比：白班 1:4.8 / 夜班 1:9.0', incidentRate: '护理不良事件率：0.26‰（超过院控目标）', satisfaction: '护理满意度：94.5%' },
    { id: 'PNS-004', month: '月份：2026-Q3 汇总（7-9 月）', ratio: '季度床护比：1:0.40', nurseRatio: '季度护患比：白班 1:4.7 / 夜班 1:8.8', incidentRate: '季度护理不良事件率：0.24‰', satisfaction: '季度护理满意度：95.0%' },
    { id: 'PNS-005', month: '月份：2026-10 分科室统计', ratio: '床护比最低科室：ICU 1:0.65（最高配置）/ 老年科 1:0.32（低于院控目标 1:0.35）', nurseRatio: '护患比最低科室：急诊科白班 1:6.0（高峰时段紧张）', incidentRate: '不良事件率最高科室：精神科 0.85‰（约束相关事件集中）', satisfaction: '满意度最低科室：急诊科 88.5%（高峰等待时间长）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m510bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing/nqi-pressure-ulcer', handle: handleNursingNqiPressureUlcer, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-falls', handle: handleNursingNqiFalls, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-stats', handle: handleNursingNqiStats, auth: true },
];
