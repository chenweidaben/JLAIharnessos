/**
 * 健澜科技 jlmedaios - M164-D API 网关管理路由（系统集成深化，仅 admin）
 *
 * 【数据中台与AI大脑】
 *  - POST /api/v1/api-gateway/route
 *      body: { routePath, method, targetSystem, targetEndpoint, authMode?, qpsLimit?, timeoutMs?, description? }
 *      登记一条网关路由（统一入口）；纯函数层不做写库，这里负责参数收敛与落 medmuse.api_routes。
 *  - POST /api/v1/api-gateway/external
 *      body: { systemName, endpoint, authMode?, credentialRef?, qpsLimit?, timeoutMs?, description? }
 *      登记一个外部对接系统（第三方系统台账）；落 medmuse.api_gateway_systems。
 *
 * 生产高可用：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403；
 *  - endpoint 经 registerExternalSystem 协议白名单校验，防 SSRF；
 *  - 路由按 (route_path, method) 唯一（DB 唯一约束兜底），重复登记返回 409；
 *  - 网关本身无状态：配置落 Postgres，多实例共享，任一台宕机不影响整体。
 *
 * 本文件导出 apiGatewayRoutes，由 server.ts 统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  registerExternalSystem,
  type AuthMode,
  type ExternalSystem,
  type HttpMethod,
} from '../aggregators/apiGatewayAggregator';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const AUTH_MODES: AuthMode[] = ['api_key', 'jwt', 'sso'];

/* ----------------------------------------------------------------------------
 * POST /api/v1/api-gateway/route  登记路由
 * -------------------------------------------------------------------------- */
async function handleCreateRoute(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await c.body()) as Record<string, unknown>;
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
  }

  const routePath = typeof body.routePath === 'string' ? body.routePath.trim() : '';
  const method = (typeof body.method === 'string' ? body.method : 'GET').toUpperCase() as HttpMethod;
  const targetSystem = typeof body.targetSystem === 'string' ? body.targetSystem.trim() : '';
  const targetEndpoint = typeof body.targetEndpoint === 'string' ? body.targetEndpoint.trim() : '';
  const authMode = (typeof body.authMode === 'string' ? body.authMode : 'api_key') as AuthMode;
  const qpsLimit = typeof body.qpsLimit === 'number' ? body.qpsLimit : 50;
  const timeoutMs = typeof body.timeoutMs === 'number' ? body.timeoutMs : 5000;
  const description = typeof body.description === 'string' ? body.description : '';

  if (!routePath || !routePath.startsWith('/')) {
    return json(fail(ErrorCode.BAD_REQUEST, 'routePath 必须以 / 开头'), 400);
  }
  if (!METHODS.includes(method)) {
    return json(fail(ErrorCode.BAD_REQUEST, 'method 非法'), 400);
  }
  if (!targetSystem || !targetEndpoint) {
    return json(fail(ErrorCode.BAD_REQUEST, 'targetSystem 与 targetEndpoint 必填'), 400);
  }
  if (!AUTH_MODES.includes(authMode)) {
    return json(fail(ErrorCode.BAD_REQUEST, 'authMode 必须为 api_key/jwt/sso'), 400);
  }

  try {
    const db = getDb();
    const rows = await db`
      INSERT INTO medmuse.api_routes
        (route_path, method, target_system, target_endpoint, auth_mode,
         qps_limit, timeout_ms, description, created_by)
      VALUES
        (${routePath}, ${method}, ${targetSystem}, ${targetEndpoint}, ${authMode},
         ${qpsLimit}, ${timeoutMs}, ${description}, ${c.user?.id ?? 'admin'})
      RETURNING
        id AS "id",
        route_path AS "routePath",
        method AS "method",
        target_system AS "targetSystem",
        target_endpoint AS "targetEndpoint",
        auth_mode AS "authMode",
        qps_limit AS "qpsLimit",
        timeout_ms AS "timeoutMs",
        description AS "description",
        status AS "status",
        circuit_state AS "circuitState"
    `;
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!row) {
      return json(fail(ErrorCode.INTERNAL_ERROR, '路由写入未返回结果'), 500);
    }
    return json(ok(row, '网关路由已登记'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    // 唯一约束冲突：(route_path, method) 重复
    if (/api_routes_path_method_uniq/.test(msg)) {
      return json(fail(ErrorCode.CONFLICT, '该路径+方法的路由已存在'), 409);
    }
    return json(fail(ErrorCode.INTERNAL_ERROR, '登记路由失败：' + msg), 500);
  }
}

/* ----------------------------------------------------------------------------
 * POST /api/v1/api-gateway/external  登记外部系统
 * -------------------------------------------------------------------------- */
async function handleCreateExternal(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await c.body()) as Record<string, unknown>;
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
  }

  const systemName = typeof body.systemName === 'string' ? body.systemName : '';
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
  const authMode = (typeof body.authMode === 'string' ? body.authMode : 'api_key') as AuthMode;
  const credentialRef = typeof body.credentialRef === 'string' ? body.credentialRef : '';
  const qpsLimit = typeof body.qpsLimit === 'number' ? body.qpsLimit : undefined;
  const timeoutMs = typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined;
  const description = typeof body.description === 'string' ? body.description : '';

  // 纯函数层统一校验（endpoint 协议 / 名称 / 认证模式 / 限流超时边界）
  let system: ExternalSystem;
  try {
    system = registerExternalSystem(systemName, endpoint, {
      mode: authMode,
      credentialRef,
      qpsLimit,
      timeoutMs,
      description,
    });
  } catch (err) {
    return json(
      fail(ErrorCode.BAD_REQUEST, err instanceof Error ? err.message : '外部系统参数非法'),
      400,
    );
  }

  try {
    const db = getDb();
    const rows = await db`
      INSERT INTO medmuse.api_gateway_systems
        (system_name, endpoint, auth_mode, credential_ref, qps_limit, timeout_ms,
         description, created_by)
      VALUES
        (${system.systemName}, ${system.endpoint}, ${system.authMode}, ${system.credentialRef},
         ${system.qpsLimit}, ${system.timeoutMs}, ${system.description}, ${c.user?.id ?? 'admin'})
      RETURNING
        id AS "id",
        system_name AS "systemName",
        endpoint AS "endpoint",
        auth_mode AS "authMode",
        credential_ref AS "credentialRef",
        qps_limit AS "qpsLimit",
        timeout_ms AS "timeoutMs",
        description AS "description",
        status AS "status"
    `;
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!row) {
      return json(fail(ErrorCode.INTERNAL_ERROR, '外部系统写入未返回结果'), 500);
    }
    return json(ok(row, '外部系统已登记'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (/api_gateway_systems_name_uniq/.test(msg)) {
      return json(fail(ErrorCode.CONFLICT, '同名外部系统已存在'), 409);
    }
    return json(fail(ErrorCode.INTERNAL_ERROR, '登记外部系统失败：' + msg), 500);
  }
}

/* ----------------------------------------------------------------------------
 * 导出路由表
 * -------------------------------------------------------------------------- */
export const apiGatewayRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/api-gateway/route',
    auth: true,
    handle: handleCreateRoute,
  },
  {
    method: 'POST',
    path: '/api/v1/api-gateway/external',
    auth: true,
    handle: handleCreateExternal,
  },
];
