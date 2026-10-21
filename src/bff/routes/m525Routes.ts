/**
 * 健澜科技 jlmedaios - M525 新标准 P0：护理评估闭环状态机 3 端点
 *
 * nursing-care/instances 护理评估实例（状态机全链路）、nursing-care/measures 护理措施执行清单、nursing-care/stats 护理闭环统计。
 * 走 nursing-care/ 新前缀；与 M524 /order/*、M510b /nursing/nqi-*、M510 /nursing/nqi/*、M492 /nursing/*、M476 /nursing/*、/outpatient/* 路由区分。
 *
 * 业务流程闭环纪律：评估 assessed → 护理措施 planned → 执行 executed → 记录 documented，状态机不可越级；
 * cancelled 为终态；各环节操作人 + ISO8601 时间戳随状态联动，未到环节字段为 null。
 * 枚举英文 key，数值 number，布尔 boolean，日期 ISO8601；禁止中文标签拼字符串。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nursing-care/instances - 护理评估实例（五态覆盖，状态机环节时间戳/操作人闭环，未到环节为 null）5 条 */
async function handleNursingCareInstances(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    // status=documented：评估/计划/执行/记录四环节全部非空（完整闭环）
    {
      id: 'NC-001',
      patient: '张**',
      ward: '心内科一病区',
      assessmentLevel: 'level2' as const,
      status: 'documented' as const,
      assessor: '李护士',
      assessedAt: '2026-10-21T07:30:00+08:00',
      planner: '李护士',
      plannedAt: '2026-10-21T07:40:00+08:00',
      executor: '王护士',
      executedAt: '2026-10-21T08:30:00+08:00',
      recorder: '王护士',
      documentedAt: '2026-10-21T08:35:00+08:00',
    },
    // status=executed：评估/计划/执行非空，记录环节未到（null）
    {
      id: 'NC-002',
      patient: '李**',
      ward: '消化内科病区',
      assessmentLevel: 'level3' as const,
      status: 'executed' as const,
      assessor: '赵护士',
      assessedAt: '2026-10-21T08:05:00+08:00',
      planner: '赵护士',
      plannedAt: '2026-10-21T08:15:00+08:00',
      executor: '孙护士',
      executedAt: '2026-10-21T09:00:00+08:00',
      recorder: null,
      documentedAt: null,
    },
    // status=planned：评估/计划非空，执行/记录未到（null）
    {
      id: 'NC-003',
      patient: '王**',
      ward: '骨科病区',
      assessmentLevel: 'level2' as const,
      status: 'planned' as const,
      assessor: '周护士',
      assessedAt: '2026-10-21T08:20:00+08:00',
      planner: '周护士',
      plannedAt: '2026-10-21T08:30:00+08:00',
      executor: null,
      executedAt: null,
      recorder: null,
      documentedAt: null,
    },
    // status=assessed：仅评估，后续计划/执行/记录全部 null
    {
      id: 'NC-004',
      patient: '赵**',
      ward: '呼吸内科病区',
      assessmentLevel: 'level1' as const,
      status: 'assessed' as const,
      assessor: '钱护士',
      assessedAt: '2026-10-21T08:45:00+08:00',
      planner: null,
      plannedAt: null,
      executor: null,
      executedAt: null,
      recorder: null,
      documentedAt: null,
    },
    // status=cancelled：终态，评估后取消，后续计划/执行/记录未到（null）
    {
      id: 'NC-005',
      patient: '孙**',
      ward: '神经内科病区',
      assessmentLevel: 'level4' as const,
      status: 'cancelled' as const,
      assessor: '郑护士',
      assessedAt: '2026-10-21T07:50:00+08:00',
      planner: null,
      plannedAt: null,
      executor: null,
      executedAt: null,
      recorder: null,
      documentedAt: null,
    },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing-care/measures - 护理措施执行清单（measureType 英文枚举，compliant 布尔）5 条 */
async function handleNursingCareMeasures(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NM-001', patient: '张**', measureType: 'turning' as const, executor: '王护士', executedAt: '2026-10-21T08:30:00+08:00', ward: '心内科一病区', compliant: true },
    { id: 'NM-002', patient: '李**', measureType: 'bedrail' as const, executor: '孙护士', executedAt: '2026-10-21T09:00:00+08:00', ward: '消化内科病区', compliant: true },
    { id: 'NM-003', patient: '王**', measureType: 'identification' as const, executor: '周护士', executedAt: '2026-10-21T08:32:00+08:00', ward: '骨科病区', compliant: true },
    { id: 'NM-004', patient: '赵**', measureType: 'pain_reassessment' as const, executor: '钱护士', executedAt: '2026-10-21T09:10:00+08:00', ward: '呼吸内科病区', compliant: false },
    { id: 'NM-005', patient: '孙**', measureType: 'pressure_relief' as const, executor: '郑护士', executedAt: '2026-10-21T08:05:00+08:00', ward: '神经内科病区', compliant: true },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing-care/stats - 护理闭环统计（全部 number，date ISO 日期）5 条 */
async function handleNursingCareStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NS-001', ward: '心内科一病区', totalAssessments: 320, plannedCount: 312, executedCount: 301, documentedCount: 296, measureComplianceRate: 94.7, avgDocumentMin: 5.2, date: '2026-10-21' },
    { id: 'NS-002', ward: '消化内科病区', totalAssessments: 286, plannedCount: 278, executedCount: 269, documentedCount: 264, measureComplianceRate: 93.4, avgDocumentMin: 6.1, date: '2026-10-21' },
    { id: 'NS-003', ward: '骨科病区', totalAssessments: 245, plannedCount: 239, executedCount: 231, documentedCount: 227, measureComplianceRate: 93.9, avgDocumentMin: 5.8, date: '2026-10-21' },
    { id: 'NS-004', ward: '呼吸内科病区', totalAssessments: 268, plannedCount: 261, executedCount: 252, documentedCount: 248, measureComplianceRate: 92.5, avgDocumentMin: 6.4, date: '2026-10-21' },
    { id: 'NS-005', ward: '神经内科病区', totalAssessments: 230, plannedCount: 224, executedCount: 216, documentedCount: 212, measureComplianceRate: 92.1, avgDocumentMin: 6.7, date: '2026-10-21' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m525Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing-care/instances', handle: handleNursingCareInstances, auth: true },
  { method: 'GET', path: '/api/v1/nursing-care/measures', handle: handleNursingCareMeasures, auth: true },
  { method: 'GET', path: '/api/v1/nursing-care/stats', handle: handleNursingCareStats, auth: true },
];
