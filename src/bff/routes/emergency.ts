/**
 * 健澜科技 jlmedaios - 急诊核心事务路由（M1-B1）
 *
 * 真实模式端点（去 mock），覆盖：
 *  - 分诊台队列 / 统计 / 通道类型；
 *  - 接诊、分诊分级（含 AI 辅助建议）；
 *  - 绿色通道：启动 / 记录时间节点 / 关闭；
 *  - 抢救：启动 / 追加事件与用药 / 结束；
 *  - 留观：开始 / 更新 / 结束；
 *  - 终末转归。
 *
 * 安全：路由层 requirePermissionCode + 聚合器急诊 DataScope 双重门禁；
 *   未登录 401、越权 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { EMERGENCY_PERMISSIONS } from '../permissions';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import * as agg from '../aggregators/emergencyAggregator';

const P = EMERGENCY_PERMISSIONS;

/** 统一错误映射：领域/仓储错误 → HTTP 状态与信封 */
function mapError(e: unknown, traceId: string): Response {
  const name = e instanceof Error ? e.name : '';
  const message = e instanceof Error ? e.message : String(e);

  const forbidden = ['EmergencyForbiddenError'];
  const notFound = ['EmergencyNotFoundError', 'TriageNotFoundError'];
  const conflict = [
    'EmergencyConflictError',
    'TriageConflictError',
    'GreenChannelConflictError',
    'ResusConflictError',
    'ObsConflictError',
  ];
  const badRequest = [
    'EmergencyValidationError',
    'ArrivalValidationError',
    'GreenChannelNodeError',
    'ObsValidationError',
    'StateTransitionError',
  ];

  if (forbidden.includes(name)) return json(fail(ErrorCode.FORBIDDEN, message, traceId), 403);
  if (notFound.includes(name)) return json(fail(ErrorCode.NOT_FOUND, message, traceId), 404);
  if (conflict.includes(name)) return json(fail(ErrorCode.CONFLICT, message, traceId), 409);
  if (badRequest.includes(name)) return json(fail(ErrorCode.BAD_REQUEST, message, traceId), 400);

  console.error('[emergency] 未预期错误:', e);
  return json(fail(ErrorCode.INTERNAL_ERROR, '急诊服务内部错误', traceId), 500);
}

/**
 * 端点包装：权限码守卫 → 加载 Actor（含 DataScope）→ 执行 → 统一错误映射。
 */
function endpoint(
  permission: string,
  fn: (c: Ctx, actor: agg.EmergencyActor) => Promise<unknown>,
): (c: Ctx) => Promise<Response> {
  return async (c: Ctx) => {
    const denied = requirePermissionCode(c, permission);
    if (denied) return denied;
    try {
      const actor = await agg.loadActor(c.user!);
      const data = await fn(c, actor);
      return json(ok(data));
    } catch (e) {
      return mapError(e, c.traceId);
    }
  };
}

/* ============================= 路由 ============================= */

export const emergencyRoutes: RouteDef[] = [
  // ---- 队列 / 统计 / 元数据 ----
  {
    method: 'GET',
    path: '/api/v1/emergency/queue',
    handle: endpoint(P.VIEW, (_c, actor) => agg.getQueue(actor)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/emergency/stats',
    handle: endpoint(P.VIEW, (_c, actor) => agg.getStats(actor)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/emergency/channel-types',
    handle: endpoint(P.VIEW, () => Promise.resolve(agg.listChannelTypes())),
    auth: true,
  },

  // ---- 接诊 ----
  {
    method: 'POST',
    path: '/api/v1/emergency/arrivals',
    handle: endpoint(P.TRIAGE, async (c, actor) => {
      const body = await c.body<{
        patientId?: string;
        newPatient?: agg.triageRepo.ArrivalInput['newPatient'];
        chiefComplaint?: string;
        arriveTime?: string;
        campusId?: string;
      }>();
      return agg.arrive(actor, {
        patientId: body.patientId,
        newPatient: body.newPatient,
        chiefComplaint: body.chiefComplaint,
        arriveTime: body.arriveTime,
        campusId: body.campusId,
      });
    }),
    auth: true,
  },

  // ---- 分诊分级 ----
  {
    method: 'POST',
    path: '/api/v1/emergency/triage/:visitId',
    handle: endpoint(P.TRIAGE, async (c, actor) => {
      const body = await c.body<agg.TriageForm>();
      return agg.triage(actor, c.params.visitId, body);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/triage/:visitId/ai-advice',
    handle: endpoint(P.TRIAGE, async (c, actor) => {
      const body = await c.body<Omit<agg.TriageForm, 'level'>>();
      return agg.aiTriageAdvice(actor, body);
    }),
    auth: true,
  },

  // ---- 绿色通道 ----
  {
    method: 'GET',
    path: '/api/v1/emergency/green-channels',
    handle: endpoint(P.VIEW, async (c) => {
      const status = (c.query.get('status') as 'active' | 'completed' | 'cancelled') ?? undefined;
      const items = await agg.gcRepo.listChannels(status ? { status } : {});
      return { items };
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/green-channels/:visitId/start',
    handle: endpoint(P.GREEN_CHANNEL, async (c, actor) => {
      const body = await c.body<{ type: import('@/emergency/greenChannelTemplate').GreenChannelType; subtype?: string }>();
      return agg.startGreenChannel(actor, c.params.visitId, { type: body.type, subtype: body.subtype });
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/green-channels/channel/:channelId/nodes/:nodeKey',
    handle: endpoint(P.GREEN_CHANNEL, async (c, actor) => {
      const body = await c.body<{ actualTime?: string }>();
      return agg.recordGreenChannelNode(
        actor,
        c.params.channelId,
        c.params.nodeKey,
        body.actualTime,
      );
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/green-channels/channel/:channelId/close',
    handle: endpoint(P.GREEN_CHANNEL, async (c, actor) => {
      const body = await c.body<{ outcome: string; qualityNote?: string | null }>();
      return agg.closeGreenChannel(actor, c.params.channelId, {
        outcome: body.outcome,
        qualityNote: body.qualityNote,
      });
    }),
    auth: true,
  },

  // ---- 抢救 ----
  {
    method: 'GET',
    path: '/api/v1/emergency/resuscitation',
    handle: endpoint(P.VIEW, async () => {
      const items = await agg.resusRepo.listResuscitations({ activeOnly: true });
      return { items };
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/resuscitation/:visitId/start',
    handle: endpoint(P.RESUSCITATION, async (c, actor) => {
      const body = await c.body<{ bedNo?: string; diagnosis?: string }>();
      return agg.startResuscitation(actor, c.params.visitId, {
        bedNo: body.bedNo,
        diagnosis: body.diagnosis,
      });
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/resuscitation/record/:resusId/events',
    handle: endpoint(P.RESUSCITATION, async (c, actor) => {
      const body = await c.body<agg.ResusEventInput>();
      return agg.addResusEvent(actor, c.params.resusId, body);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/resuscitation/record/:resusId/medications',
    handle: endpoint(P.RESUSCITATION, async (c, actor) => {
      const body = await c.body<agg.ResusMedicationInput>();
      return agg.addResusMedication(actor, c.params.resusId, body);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/resuscitation/record/:resusId/complete',
    handle: endpoint(P.RESUSCITATION, async (c, actor) => {
      const body = await c.body<{
        status: 'stabilized' | 'transferred_icu' | 'deceased';
        outcome: string;
        summary?: string | null;
        nextStatus?: import('@/emergency/stateMachine').EmergencyStatus;
      }>();
      return agg.completeResuscitation(actor, c.params.resusId, body);
    }),
    auth: true,
  },

  // ---- 留观 ----
  {
    method: 'GET',
    path: '/api/v1/emergency/observations',
    handle: endpoint(P.VIEW, async () => {
      const items = await agg.obsRepo.listObservations({ activeOnly: true });
      return { items };
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/observations/:visitId/start',
    handle: endpoint(P.OBSERVATION, async (c, actor) => {
      const body = await c.body<{
        bedNo?: string;
        diagnosis?: string;
        nursingLevel?: string;
        expectedOutcome?: string;
        pendingTasks?: agg.obsRepo.ObsTask[];
      }>();
      return agg.startObservation(actor, c.params.visitId, body);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/observations/record/:obsId/update',
    handle: endpoint(P.OBSERVATION, async (c, actor) => {
      const body = await c.body<{
        status?: agg.obsRepo.ObsStatus;
        vitals?: Record<string, unknown>;
        ivStatus?: string;
        pendingTasks?: agg.obsRepo.ObsTask[];
        nursingLevel?: string;
      }>();
      return agg.updateObservation(actor, c.params.obsId, body);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/emergency/observations/record/:obsId/end',
    handle: endpoint(P.OBSERVATION, async (c, actor) => {
      const body = await c.body<{ status: 'discharged' | 'admitted' }>();
      return agg.endObservation(actor, c.params.obsId, { status: body.status });
    }),
    auth: true,
  },

  // ---- 转归 ----
  {
    method: 'POST',
    path: '/api/v1/emergency/dispositions/:visitId',
    handle: endpoint(P.DISPOSITION, async (c, actor) => {
      const body = await c.body<{
        disposition: agg.triageRepo.DispositionCode;
        destination?: string | null;
        wardId?: string | null;
        bedId?: string | null;
        remark?: string | null;
      }>();
      return agg.recordDisposition(actor, c.params.visitId, body);
    }),
    auth: true,
  },
];
