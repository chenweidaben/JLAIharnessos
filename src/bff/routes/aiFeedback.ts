/**
 * 健澜科技 jlmedaios - M108 诊疗反馈学习闭环路由
 *
 *  - POST /api/v1/medmuse/feedback        接收医生对 AI 建议的处置反馈；
 *    写库采用 fire-and-forget：先立刻响应客户端，后台异步落 medmuse.ai_feedback_log，
 *    写失败仅记录日志、不回吐给医生、绝不阻塞主诊疗流程。
 *  - GET  /api/v1/medmuse/feedback/stats   按建议类型聚合 采纳/修改/拒绝 次数与当前权重，
 *    供推荐链路与运营看板观测学习闭环效果。
 *
 * 两个端点均需登录（auth:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  aggregateByType,
  type DoctorDecision,
  type Feedback,
} from '../aggregators/aiFeedbackAggregator';

/** 允许的医生决策取值（与表 CHECK 约束一致） */
const DECISIONS: readonly DoctorDecision[] = ['adopted', 'modified', 'rejected'];

/** POST /feedback 请求体 */
interface FeedbackBody {
  agentRole?: string;
  suggestionType?: string;
  patientId?: string;
  contextSnapshot?: unknown;
  doctorDecision?: string;
  modificationNote?: string;
}

/**
 * 把一条反馈异步写入 medmuse.ai_feedback_log。
 * 任何异常都吞掉并打印告警——反馈是旁路学习信号，绝不能反向影响主流程。
 */
function persistFeedback(input: Required<Pick<FeedbackBody, 'doctorDecision'>> & FeedbackBody): void {
  void (async () => {
    try {
      const db = getDb();
      await db`
        INSERT INTO medmuse.ai_feedback_log
          (agent_role, suggestion_type, patient_id, context_snapshot, doctor_decision, modification_note)
        VALUES (
          ${input.agentRole ?? null},
          ${input.suggestionType ?? null},
          ${input.patientId ?? null},
          ${input.contextSnapshot == null ? null : JSON.stringify(input.contextSnapshot)}::jsonb,
          ${input.doctorDecision},
          ${input.modificationNote ?? null}
        )
      `;
    } catch (err) {
      // fire-and-forget：记录但不抛出，不阻塞诊疗主流程
      console.error('[aiFeedback] 反馈落库失败（已忽略）:', err);
    }
  })();
}

export const aiFeedbackRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/medmuse/feedback',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: FeedbackBody;
      try {
        body = await c.body<FeedbackBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
      }
      if (!body || typeof body.suggestionType !== 'string' || !body.suggestionType) {
        return json(fail(ErrorCode.BAD_REQUEST, 'suggestionType 不能为空'), 400);
      }
      if (!body.doctorDecision || !DECISIONS.includes(body.doctorDecision as DoctorDecision)) {
        return json(
          fail(ErrorCode.BAD_REQUEST, `doctorDecision 必须为 ${DECISIONS.join('/')}`),
          400,
        );
      }

      // 异步落库，不 await：立刻返回，写失败在 persistFeedback 内部吞掉
      persistFeedback({ ...body, doctorDecision: body.doctorDecision as DoctorDecision });
      return json(
        ok({ accepted: true }, '反馈已接收，将异步用于推荐权重学习'),
      );
    },
  },
  {
    method: 'GET',
    path: '/api/v1/medmuse/feedback/stats',
    auth: true,
    handle: async (): Promise<Response> => {
      try {
        const db = getDb();
        // 只读学习所需的两列，避免拉回大 jsonb 快照
        const rows = await db`
          SELECT suggestion_type AS suggestionType, doctor_decision AS doctorDecision
          FROM medmuse.ai_feedback_log
        `;
        const history: Feedback[] = (
          rows as unknown as Array<{ suggestionType: string; doctorDecision: DoctorDecision }>
        )
          .filter((r) => r && r.doctorDecision)
          .map((r) => ({ suggestionType: r.suggestionType ?? 'unknown', doctorDecision: r.doctorDecision }));
        const byType = aggregateByType(history);
        return json(ok({ byType, total: history.length }));
      } catch (err) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '统计失败'),
          500,
        );
      }
    },
  },
];
