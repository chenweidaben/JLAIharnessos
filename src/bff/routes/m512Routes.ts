/**
 * 健澜科技 jlmedaios - M512 P0 合规重点（电子病历五级·多角色工作流）：角色工作流引擎监控看板 1 端点缺口
 *
 * workflow/instances、workflow/nodes 已 200（已有确认不重建）；本批补建 workflow/stats 工作流统计。
 * 与 M494 /quality/*、M511 /eventbus/*、M510b /nursing/nqi-*、M510 /nursing/nqi/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/stats - 工作流统计（今日实例总数/平均流转时长/异常率/角色待办总数）5 条 */
async function handleWorkflowStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WS-001', todayTotal: '今日流程实例总数：1,860 个（门诊接诊 860 / 住院医嘱 520 / 检验申请 280 / 检查申请 140 / 手术安排 60）', avgDuration: '平均流转时长：门诊接诊 8.5min / 住院医嘱 12.3min / 检验申请 25.6min / 检查申请 35.2min / 手术安排 48.0min', exceptionRate: '异常率：0.8%（15 个实例异常，主要为检验申请超时未审核）', pendingTotal: '角色待办总数：医生 320 / 护士 180 / 药师 95 / 检验师 68 / 技师 45' },
    { id: 'WS-002', todayTotal: '昨日（2026-10-19）流程实例总数：2,140 个', avgDuration: '平均流转时长：门诊接诊 9.2min / 住院医嘱 13.0min', exceptionRate: '异常率：1.2%', pendingTotal: '角色待办总数：医生 380 / 护士 210 / 药师 110 / 检验师 82 / 技师 55' },
    { id: 'WS-003', todayTotal: '近 7 日平均流程实例总数：1,980 个/日', avgDuration: '近 7 日平均流转时长：18.5min', exceptionRate: '近 7 日平均异常率：1.0%', pendingTotal: '近 7 日平均角色待办总数：医生 350 / 护士 195 / 药师 100 / 检验师 75 / 技师 50' },
    { id: 'WS-004', todayTotal: '本月（2026-10）累计流程实例总数：38,600 个（截至 10-20）', avgDuration: '本月累计平均流转时长：19.2min', exceptionRate: '本月累计异常率：1.1%', pendingTotal: '本月累计角色待办总数：医生 7,200 / 护士 3,900 / 药师 2,100 / 检验师 1,500 / 技师 1,000' },
    { id: 'WS-005', todayTotal: '分类型实例数：门诊接诊占比最高 45%（医生高频节点）', avgDuration: '流转时长最长：手术安排 48.0min（多角色协同节点多）', exceptionRate: '异常率最高：检验申请 1.5%（检验师审核节点积压）', pendingTotal: '待办最多角色：医生 320（门诊接诊节点高频）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m512Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/stats', handle: handleWorkflowStats, auth: true },
];
