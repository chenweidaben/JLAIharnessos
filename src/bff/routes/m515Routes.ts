/**
 * 健澜科技 jlmedaios - M515 P0 合规重点（医疗质量安全·患者安全深度）：患者安全事件与 RCA 根因分析 3 端点
 *
 * 字段契约（严格对齐前端 web/src/services/api/safetyRcaBoard.ts）：
 *   SafetyEventRow:    { id, type: 'fall'|'pressureUlcer'|'medError'|'tubeDisplacement'|'fallBed', severity: 'level1'|'level2'|'level3'|'level4', dept, reportedAt }
 *   RcaRow:            { id, eventNo, status: 'pending'|'analyzing'|'completed', rootCause: 'man'|'machine'|'material'|'method'|'environment', rectificationCount: number }
 *   RectificationRow:  { id, measure, dept, status: 'ongoing'|'completed'|'overdue', completeRate: number }
 *   SafetyStats:       { monthlyEvents, rcaCompletionRate, rectificationCompletionRate, overdueRectification }
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/safety/events - 患者安全事件 5 条（结构化枚举） */
async function handleSafetyEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SE-001', type: 'fall', severity: 'level2', dept: '老年医学科', reportedAt: '2026-10-19T23:30:00+08:00' },
    { id: 'SE-002', type: 'pressureUlcer', severity: 'level3', dept: '神经内科', reportedAt: '2026-10-18T09:15:00+08:00' },
    { id: 'SE-003', type: 'medError', severity: 'level1', dept: '普外科', reportedAt: '2026-10-17T10:00:00+08:00' },
    { id: 'SE-004', type: 'tubeDisplacement', severity: 'level2', dept: '消化内科', reportedAt: '2026-10-16T03:45:00+08:00' },
    { id: 'SE-005', type: 'fallBed', severity: 'level4', dept: '骨科', reportedAt: '2026-10-15T02:45:00+08:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/safety/rca - RCA 根因分析 5 条（结构化枚举/数字） */
async function handleSafetyRca(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SR-001', eventNo: 'SA-2026-1019', status: 'pending', rootCause: 'environment', rectificationCount: 0 },
    { id: 'SR-002', eventNo: 'SA-2026-1018', status: 'analyzing', rootCause: 'man', rectificationCount: 3 },
    { id: 'SR-003', eventNo: 'SA-2026-1017', status: 'completed', rootCause: 'method', rectificationCount: 5 },
    { id: 'SR-004', eventNo: 'SA-2026-1016', status: 'analyzing', rootCause: 'man', rectificationCount: 2 },
    { id: 'SR-005', eventNo: 'SA-2026-1015', status: 'completed', rootCause: 'machine', rectificationCount: 8 },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/safety/rectification - 整改追踪 5 条（结构化枚举/数字） */
async function handleSafetyRectification(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SRe-001', measure: '夜间卫生间加装扶手+防滑垫+感应照明', dept: '后勤/老年医学科', status: 'ongoing', completeRate: 85 },
    { id: 'SRe-002', measure: '卧床患者 q2h 翻身执行率纳入护士长考核', dept: '护理部/神经内科', status: 'ongoing', completeRate: 92 },
    { id: 'SRe-003', measure: '医嘱开立系统增加剂量上限校验（超量弹窗）', dept: '信息科/药学部', status: 'completed', completeRate: 100 },
    { id: 'SRe-004', measure: '约束患者每 2h 评估记录纳入护理文书', dept: '护理部/精神科', status: 'overdue', completeRate: 60 },
    { id: 'SRe-005', measure: '全院床栏锁扣排查+更换故障床栏', dept: '后勤/骨科', status: 'completed', completeRate: 100 },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/safety/stats - 患者安全统计单对象 */
async function handleSafetyStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({
    monthlyEvents: 12,
    rcaCompletionRate: 75.0,
    rectificationCompletionRate: 88.5,
    overdueRectification: 1,
  }));
}

export const m515Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/safety/events', handle: handleSafetyEvents, auth: true },
  { method: 'GET', path: '/api/v1/safety/rca', handle: handleSafetyRca, auth: true },
  { method: 'GET', path: '/api/v1/safety/rectification', handle: handleSafetyRectification, auth: true },
  { method: 'GET', path: '/api/v1/safety/stats', handle: handleSafetyStats, auth: true },
];
