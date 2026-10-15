/**
 * 健澜科技 jlmedaios - OA 多级审批路由（M139-A · 医院运营管理）
 *
 * 【医院运营管理】行政办公多级审批（请假/报销/采购/用印）：
 *   POST /api/v1/oa/approvals                发起审批（申请人=当前登录用户）
 *   GET  /api/v1/oa/approvals                审批中心列表（?applicantId=mine|本人id 只看我发起的）
 *   PUT  /api/v1/oa/approvals/:id/approve    处理当前节点一步（approve/reject）
 *
 * 流程纪律：多级流转不可跳步、申请人不可自审——状态机由聚合器强约束，
 *   路由层只做参数收敛、身份注入与 best-effort 落库，不另写业务规则。
 *
 * 权限：登录医护/行政均可发起；处理人缺省取当前登录用户。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  APPROVAL_TYPES,
  approveStep,
  createApproval,
  getApprovalById,
  listApprovals,
  persistApproval,
  type ApprovalType,
  type StepAction,
} from '../aggregators/oaApprovalAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 发起审批请求体 */
interface CreateBody {
  /** 单据类型：请假 / 报销 / 采购 / 用印 */
  type?: ApprovalType;
  /** 事由标题 */
  title?: string;
  /** 事由正文 */
  content?: string;
}

/** 审批处理请求体 */
interface ApproveBody {
  /** 通过 / 驳回 */
  action?: StepAction;
  /** 审批意见 */
  comment?: string;
  /** 显式指定处理人；缺省 = 当前登录用户 */
  approverId?: string;
}

export const oaApprovalRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/oa/approvals',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: CreateBody;
      try {
        body = await c.body<CreateBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      const type = body.type;
      if (!type || !APPROVAL_TYPES.includes(type)) {
        return json(
          fail(
            ErrorCode.BAD_REQUEST,
            `type 必须为 ${APPROVAL_TYPES.join(' / ')} 之一`,
            c.traceId,
          ),
          400,
        );
      }
      if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        return json(fail(ErrorCode.BAD_REQUEST, '审批标题 title 不能为空', c.traceId), 400);
      }

      // 申请人缺省取当前登录用户：谁登录、谁发起、谁留痕
      const applicantId = c.user?.id || '';
      if (!applicantId) {
        return json(fail(ErrorCode.UNAUTHORIZED, '未登录，无法发起审批', c.traceId), 401);
      }

      try {
        const approval = createApproval(
          applicantId,
          type,
          body.title.trim(),
          typeof body.content === 'string' ? body.content : '',
        );
        // best-effort 落库三级留痕，失败不阻断
        await persistApproval(approval);
        return json(ok({ approval }, '审批已发起，进入多级审批流程'));
      } catch (err) {
        console.error(`[oaApproval] POST /approvals [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.BAD_REQUEST,
            err instanceof Error ? err.message : '发起审批失败',
            c.traceId,
          ),
          400,
        );
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/oa/approvals',
    auth: true,
    handle: (c: Ctx): Response => {
      // 审批中心列表：缺省返回全部；?mine=1 或 ?applicantId=本人id 只看我发起的
      const mine = c.query.get('mine') === '1';
      const applicantId = c.query.get('applicantId')?.trim() || (mine ? c.user?.id || '' : '');
      const list = listApprovals(applicantId || undefined);
      return json(ok({ list, total: list.length }, 'ok'));
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/oa/approvals/:id/approve',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const id = c.params.id || '';
      if (!id) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少审批单 id', c.traceId), 400);
      }
      if (!getApprovalById(id)) {
        return json(fail(ErrorCode.NOT_FOUND, '审批单不存在', c.traceId), 404);
      }

      let body: ApproveBody;
      try {
        body = await c.body<ApproveBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      if (body.action !== 'approve' && body.action !== 'reject') {
        return json(
          fail(ErrorCode.BAD_REQUEST, 'action 必须为 approve / reject', c.traceId),
          400,
        );
      }

      // 处理人缺省取当前登录用户：谁登录、谁审批、谁负责
      const approverId = body.approverId?.trim() || c.user?.id || '';
      if (!approverId) {
        return json(fail(ErrorCode.UNAUTHORIZED, '未登录，无法审批', c.traceId), 401);
      }

      try {
        const approval = approveStep(id, approverId, body.action, body.comment ?? '');
        // best-effort 落库最新留痕，失败不阻断
        await persistApproval(approval);
        const verb = body.action === 'approve' ? '已通过' : '已驳回';
        return json(ok({ approval }, `当前节点${verb}，流程推进一格`));
      } catch (err) {
        console.error(`[oaApproval] PUT /:id/approve [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.CONFLICT,
            err instanceof Error ? err.message : '审批失败',
            c.traceId,
          ),
          409,
        );
      }
    },
  },
];
