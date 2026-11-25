/**
 * 健澜科技 jlmedaios - 检验 AI 辅助解读 BFF 路由（M3-E + M12-A）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 队列 / 详情（lab:interpret:view）；
 *  - 生成解读、医师签名、退回（lab:interpret:sign）。
 * 查询参数 audience=doctor|patient（默认 doctor）；body {mode: auto|rule|llm}（默认 auto）。
 * 统一错误信封；AI 仅辅助，签名后生效。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  LabInterpError,
  generateForVisit,
  getForVisit,
  listQueue,
  signInterpretation,
  rejectInterpretation,
} from '../aggregators/labInterpretAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof LabInterpError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : err.status === 503
                ? ErrorCode.SERVICE_UNAVAILABLE
                : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '检验解读处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      return json(ok(data));
    } catch (err) {
      return mapError(err);
    }
  };
}

function audienceOf(c: Ctx): string {
  const a = new URL(c.req.url).searchParams.get('audience');
  return a === 'patient' ? 'patient' : 'doctor';
}

export const labInterpretRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/lab-interpret/queue',
    handle: guarded('lab:interpret:view', async (c, view) => {
      const params = new URL(c.req.url).searchParams;
      const s = params.get('status');
      const status =
        s === 'pending_review' || s === 'signed' || s === 'rejected' ? s : null;
      const audience = params.get('audience');
      return { items: await listQueue(view, status, audience) };
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab-interpret/generate/:visitId',
    handle: guarded('lab:interpret:sign', async (c, view) => {
      const body = await c.body<{ mode?: string }>().catch((): { mode?: string } => ({}));
      return generateForVisit(c.params.visitId, audienceOf(c), body?.mode ?? 'auto', view);
    }),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/lab-interpret/visit/:visitId',
    handle: guarded('lab:interpret:view', (c, view) => getForVisit(c.params.visitId, audienceOf(c), view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab-interpret/sign/:id',
    handle: guarded('lab:interpret:sign', (c, view) => signInterpretation(c.params.id, view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab-interpret/reject/:id',
    handle: guarded('lab:interpret:sign', async (c, view) =>
      rejectInterpretation(c.params.id, view, (await c.body<{ reason?: string }>()).reason ?? ''),
    ),
    auth: true,
  },
];
