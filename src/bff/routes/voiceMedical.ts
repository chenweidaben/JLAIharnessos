/**
 * 健澜科技 jlmedaios - 语音电子病历 BFF 路由（M2-C）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 口述转写：对就诊发起语音口述，ASR + 医疗后处理结果落库（draft）；
 *  - 会话查询：本人会话列表 / 详情（含原始转写、术语纠正、用药提及、风险提示）；
 *  - 复核转病历：medical_record:write，口述医师本人复核编辑、确认用药后签名成病历；
 *  - 作废：medical_record:write，仅口述医师本人。
 *
 * 严谨性：ASR 仅辅助、转写须医师复核；临床写操作本人签名（聚合器强制）；
 * 业务变更与审计哈希链同事务提交，统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  VoiceMedicalError,
  dictate,
  getDictation,
  listMyDictations,
  convert,
  discard,
} from '../aggregators/voiceMedicalAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof VoiceMedicalError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '语音病历处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
  render: (data: T) => Response = (d) => json(ok(d)),
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      if (data instanceof Response) return data;
      return render(data);
    } catch (err) {
      return mapError(err);
    }
  };
}

export const voiceMedicalRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/voice-medical/dictations',
    handle: guarded('medical_record:read', async (c, view) =>
      listMyDictations(view, {
        visitId: c.query.get('visitId') ?? undefined,
        status: (c.query.get('status') as 'draft' | 'converted' | 'discarded' | null) ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/voice-medical/dictations',
    handle: guarded('medical_record:write', async (_c, view) => dictate(view, await _c.body())),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/voice-medical/dictations/:id',
    handle: guarded('medical_record:read', (c, view) => getDictation(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/voice-medical/dictations/:id/convert',
    handle: guarded('medical_record:write', async (c, view) =>
      convert(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/voice-medical/dictations/:id/discard',
    handle: guarded('medical_record:write', (c, view) => discard(view, c.params.id)),
    auth: true,
  },
];
