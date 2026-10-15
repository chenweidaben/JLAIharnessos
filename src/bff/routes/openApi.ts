/**
 * 健澜科技 jlmedaios - M129-B 第三方对接开放接口路由（系统集成）
 *
 * 【系统集成】面向已签发 API Key 的第三方机构（区域卫生平台 / 医联体协同）：
 *  - GET /api/v1/open/patient/:id                  患者基本信息（字段级脱敏）
 *  - GET /api/v1/open/patient/:id/visits            就诊记录
 *  - GET /api/v1/open/patient/:id/prescriptions     处方记录
 *
 * 安全模型（等保三级 / 医疗合规）：
 *  - 不走用户 JWT 会话，改用 API Key 认证：
 *    Authorization: Bearer jlsk_live_xxx 或 X-Api-Key: jlsk_live_xxx；
 *  - 库内只存 Key 的 SHA-256 哈希：收到明文 -> 哈希后精确命中，
 *    未命中/已吊销/已过期一律统一 401，不区分原因防枚举；
 *  - 权限按最小粒度收敛：patient:read / patient:visits:read /
 *    patient:prescriptions:read，缺一即 403；
 *  - 出口字段级脱敏：患者信息只下发白名单字段，费用/身份证/电话不出院；
 *  - 每次校验通过回写 last_used_at（fire-and-forget，失败不影响主请求）；
 *  - 不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { aggregatePatient360 } from '../aggregators/patient360Aggregator';
import {
  hasPermission,
  hashApiKey,
  maskPatientForOpenApi,
} from '../aggregators/thirdPartyApiAggregator';

/** 认证通过后注入上下文的第三方凭证身份 */
interface AuthedThirdPartyKey {
  id: string;
  name: string;
  permissions: string[];
}

/** 401 统一文案：不区分「未携带/错误/过期/吊销」，防第三方枚举凭证 */
const UNAUTHORIZED_MSG = '无效或已过期的 API Key';

/**
 * 从请求头提取 API Key 明文：优先 Authorization: Bearer，其次 X-Api-Key。
 * 返回空串表示未携带。
 */
function extractApiKey(c: Ctx): string {
  const auth = c.req.headers.get('Authorization') ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return (c.req.headers.get('X-Api-Key') ?? '').trim();
}

/**
 * Key 认证中间件（开放接口专用）：
 *  1. 未携带 Key -> 401；
 *  2. 明文哈希后查 medmuse.api_keys，必须 status='active' 且 expires_at > now()；
 *  3. 命中则回写 last_used_at（异步，失败静默）；
 *  4. 任何异常统一 401，不泄露库表状态。
 *
 * @returns 认证通过 -> 凭证身份；失败 -> 已构造好的 401 Response
 */
async function authenticateThirdPartyKey(c: Ctx): Promise<AuthedThirdPartyKey | Response> {
  const plain = extractApiKey(c);
  if (!plain) {
    return json(fail(ErrorCode.UNAUTHORIZED, UNAUTHORIZED_MSG, c.traceId), 401);
  }

  let row: Record<string, unknown> | null = null;
  try {
    const db = getDb();
    // 参数化查询：哈希值绑定传入，杜绝 SQL 注入；expires_at 由库端 now() 实时判定
    const rows = await db`
      SELECT
        id           AS "id",
        name         AS "name",
        permissions  AS "permissions"
      FROM medmuse.api_keys
      WHERE key_hash = ${hashApiKey(plain)}
        AND status = 'active'
        AND expires_at > now()
      LIMIT 1
    `;
    row = (rows as unknown as Array<Record<string, unknown>>)[0] ?? null;
  } catch {
    // 库不可用/表未迁移：拒绝一切开放请求（故障默认关闭，fail-closed）
    return json(fail(ErrorCode.UNAUTHORIZED, UNAUTHORIZED_MSG, c.traceId), 401);
  }

  if (!row) {
    return json(fail(ErrorCode.UNAUTHORIZED, UNAUTHORIZED_MSG, c.traceId), 401);
  }

  // 回写最近使用时刻：fire-and-forget，失败不影响主请求
  try {
    const db = getDb();
    await db`UPDATE medmuse.api_keys SET last_used_at = now() WHERE id = ${row.id}`;
  } catch {
    // 静默：使用时间缺失不构成安全事件
  }

  const permissions = Array.isArray(row.permissions)
    ? (row.permissions as unknown[]).filter((p): p is string => typeof p === 'string')
    : [];
  return {
    id: String(row.id ?? ''),
    name: typeof row.name === 'string' ? row.name : '',
    permissions,
  };
}

/** 权限守卫：凭证缺少所需数据面权限 -> 403 */
function requireOpenPermission(
  authed: AuthedThirdPartyKey,
  required: string,
  traceId: string,
): Response | null {
  if (!hasPermission(authed.permissions, required)) {
    return json(
      fail(ErrorCode.FORBIDDEN, `API Key 未授权访问该数据面（需要 ${required}）`, traceId),
      403,
    );
  }
  return null;
}

/**
 * GET /api/v1/open/patient/:id
 * 患者基本信息（patient:read）。出口字段白名单脱敏，费用/身份证/电话不出院。
 */
async function handleGetPatient(c: Ctx): Promise<Response> {
  const authed = await authenticateThirdPartyKey(c);
  if (authed instanceof Response) return authed;
  const denied = requireOpenPermission(authed, 'patient:read', c.traceId);
  if (denied) return denied;

  const id = (c.params.id ?? '').trim();
  if (!id) return json(fail(ErrorCode.BAD_REQUEST, '缺少患者标识', c.traceId), 400);

  const record = aggregatePatient360(id);
  if (!record) return json(fail(ErrorCode.NOT_FOUND, '患者不存在', c.traceId), 404);

  return json(
    ok({
      patient: maskPatientForOpenApi(
        (record.patient ?? null) as Record<string, unknown> | null,
      ),
    }),
  );
}

/**
 * GET /api/v1/open/patient/:id/visits
 * 就诊记录（patient:visits:read）。仅下发就诊结构化数据，不含病历正文。
 */
async function handleGetVisits(c: Ctx): Promise<Response> {
  const authed = await authenticateThirdPartyKey(c);
  if (authed instanceof Response) return authed;
  const denied = requireOpenPermission(authed, 'patient:visits:read', c.traceId);
  if (denied) return denied;

  const id = (c.params.id ?? '').trim();
  if (!id) return json(fail(ErrorCode.BAD_REQUEST, '缺少患者标识', c.traceId), 400);

  const record = aggregatePatient360(id);
  if (!record) return json(fail(ErrorCode.NOT_FOUND, '患者不存在', c.traceId), 404);

  return json(ok({ patientId: id, visits: record.encounters ?? [] }));
}

/**
 * GET /api/v1/open/patient/:id/prescriptions
 * 处方记录（patient:prescriptions:read）。
 */
async function handleGetPrescriptions(c: Ctx): Promise<Response> {
  const authed = await authenticateThirdPartyKey(c);
  if (authed instanceof Response) return authed;
  const denied = requireOpenPermission(authed, 'patient:prescriptions:read', c.traceId);
  if (denied) return denied;

  const id = (c.params.id ?? '').trim();
  if (!id) return json(fail(ErrorCode.BAD_REQUEST, '缺少患者标识', c.traceId), 400);

  const record = aggregatePatient360(id);
  if (!record) return json(fail(ErrorCode.NOT_FOUND, '患者不存在', c.traceId), 404);

  return json(ok({ patientId: id, prescriptions: record.prescriptions ?? [] }));
}

/**
 * 开放接口路由表：auth:false —— 不走用户 JWT 会话，
 * 认证由本文件内的 authenticateThirdPartyKey 完成。
 */
export const openApiRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/open/patient/:id',
    auth: false,
    handle: handleGetPatient,
  },
  {
    method: 'GET',
    path: '/api/v1/open/patient/:id/visits',
    auth: false,
    handle: handleGetVisits,
  },
  {
    method: 'GET',
    path: '/api/v1/open/patient/:id/prescriptions',
    auth: false,
    handle: handleGetPrescriptions,
  },
];
