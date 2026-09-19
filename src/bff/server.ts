/**
 * 健澜科技数智医院智能体 - BFF HTTP/WebSocket 服务器
 *
 * 基于 Bun 原生运行时，零额外依赖：
 *  - REST：统一 /api/v1 前缀，聚合后端服务并适配前端
 *  - WS：/ws/chat 对话流式与告警推送（需鉴权）
 *  - 中间件：认证 / 限流 / CSRF / 安全头 / 日志 / 错误处理
 *
 * 启动：bun run src/bff/server.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { attachUser, newCtx, requireAuth, verifyJwt } from './middleware/auth';
import { verifyCsrf } from './middleware/csrf';
import { withErrorHandler } from './middleware/error';
import { logRequest } from './middleware/log';
import { rateLimit } from './middleware/rateLimit';
import { withSecurityHeaders } from './middleware/securityHeaders';
import { tenantContextMiddleware } from './middleware/tenant';
import { metrics, recordHttpRequest, renderMetrics } from './observability/metrics';
import { authRoutes } from './routes/auth';
import { permissionAdminRoutes } from './routes/admin/permissions';
import { tenantAdminRoutes } from './routes/admin/tenants';
import { chatRoutes } from './routes/chat';
import { dashboardRoutes } from './routes/dashboard';
import { medicalRoutes } from './routes/medical';
import { operationRoutes } from './routes/operation';
import { patientRoutes } from './routes/patient';
import { qualityRoutes } from './routes/quality';
import { skillRoutes } from './routes/skills';
import { systemRoutes } from './routes/system';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from './types';

// ============================================================================
// 路由表与编译
// ============================================================================

const allRoutes: RouteDef[] = [
  ...authRoutes,
  ...patientRoutes,
  ...chatRoutes,
  ...medicalRoutes,
  ...dashboardRoutes,
  ...qualityRoutes,
  ...operationRoutes,
  ...systemRoutes,
  ...permissionAdminRoutes,
  ...skillRoutes,
  ...tenantAdminRoutes,
];

interface Compiled {
  method: string;
  regex: RegExp;
  keys: string[];
  def: RouteDef;
}

function compile(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const re =
    '^' +
    pattern.replace(/:([^/]+)/g, (_m, k: string) => {
      keys.push(k);
      return '([^/]+)';
    }) +
    '$';
  return { regex: new RegExp(re), keys };
}

const compiled: Compiled[] = allRoutes.map((def) => {
  const { regex, keys } = compile(def.path);
  return { method: def.method.toUpperCase(), regex, keys, def };
});

// ============================================================================
// WebSocket（/ws/chat）— 鉴权后升级
// ============================================================================

const chatClients = new Set<Bun.ServerWebSocket<unknown>>();

function broadcast(event: string, payload: unknown): void {
  const frame = JSON.stringify({ event, timestamp: Date.now(), payload });
  for (const ws of chatClients) {
    try {
      ws.send(frame);
    } catch {
      chatClients.delete(ws);
    }
  }
}

/** 校验 WebSocket 升级请求的 Token（query 参数 ?token= 或 Sec-WebSocket-Protocol） */
function wsAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const token =
    url.searchParams.get('token') ??
    (req.headers.get('sec-websocket-protocol') ?? '').replace(/^bearer\./i, '');
  if (!token) return false;
  // JWT 格式
  if (token.split('.').length === 3) return verifyJwt(token) !== null;
  // 开发态演示 token
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  if (
    !isProd &&
    (token.startsWith('jt-') || token.startsWith('jr-') || token === 'bff-access-token')
  ) {
    return true;
  }
  return false;
}

// ============================================================================
// Fetch 入口
// ============================================================================

async function handleFetch(
  req: Request,
  server: Bun.Server<unknown>,
): Promise<Response | undefined> {
  const url = new URL(req.url);
  const startedAt = Date.now();

  // WebSocket 升级（需鉴权）
  if (url.pathname === '/ws/chat' && req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    if (!wsAuthorized(req)) {
      return new Response('unauthorized', { status: 401 });
    }
    if (server.upgrade(req, { data: { path: '/ws/chat' } })) return undefined;
    return new Response('upgrade failed', { status: 426 });
  }

  // Prometheus 指标端点。默认依赖内网网络策略隔离（不对公网暴露）；
  // 配置 METRICS_TOKEN 后强制校验 Authorization: Bearer <token>。
  if (url.pathname === '/metrics' && req.method === 'GET') {
    const expectedToken = process.env.METRICS_TOKEN;
    if (expectedToken) {
      const auth = req.headers.get('authorization') ?? '';
      if (auth !== `Bearer ${expectedToken}`) {
        return new Response('unauthorized', { status: 401 });
      }
    }
    return new Response(renderMetrics(), {
      status: 200,
      headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' },
    });
  }

  const ctx: Ctx = newCtx(req, {}, url.searchParams);
  attachUser(ctx);

  let status = 200;
  let routeLabel = 'unmatched';
  try {
    // 限流
    const limited = rateLimit(ctx);
    if (limited) {
      status = 429;
      return withSecurityHeaders(limited);
    }

    // CSRF 校验（状态变更请求）
    const csrfDenied = verifyCsrf(ctx);
    if (csrfDenied) {
      status = 403;
      return withSecurityHeaders(csrfDenied);
    }

    // 多租户/院区上下文解析（无显式租户头时回退默认租户；未知/停用/越权院区短路 403）
    const tenantDenied = tenantContextMiddleware(ctx);
    if (tenantDenied) {
      status = 403;
      return withSecurityHeaders(tenantDenied);
    }

    for (const r of compiled) {
      if (r.method !== req.method.toUpperCase()) continue;
      const m = url.pathname.match(r.regex);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      ctx.params = params;
      routeLabel = r.def.path;

      if (r.def.auth) {
        const denied = requireAuth(ctx);
        if (denied) {
          status = 401;
          return withSecurityHeaders(denied);
        }
      }
      const wrapped = withErrorHandler(r.def.handle);
      const res = await wrapped(ctx);
      status = res.status;
      return withSecurityHeaders(res);
    }

    status = 404;
    return withSecurityHeaders(
      json(
        fail(ErrorCode.NOT_FOUND, `路由不存在: ${req.method} ${url.pathname}`, ctx.traceId),
        404,
      ),
    );
  } finally {
    logRequest(ctx, status, startedAt);
    recordHttpRequest({
      method: req.method,
      route: routeLabel,
      code: status,
      durationSeconds: (Date.now() - startedAt) / 1000,
    });
  }
}

// ============================================================================
// 启动
// ============================================================================

const port = Number(process.env.HTTP_PORT ?? 8080);

const server = Bun.serve({
  port,
  async fetch(req, bunServer) {
    return (await handleFetch(req, bunServer)) ?? new Response(null, { status: 101 });
  },
  websocket: {
    open(ws) {
      chatClients.add(ws);
      metrics.wsConnections.inc();
    },
    message(ws: Bun.ServerWebSocket<unknown>, raw: string | Buffer) {
      let parsed: {
        event?: string;
        action?: string;
        conversationId?: string;
        payload?: { conversationId?: string };
      } = {};
      try {
        parsed = JSON.parse(String(raw)) as typeof parsed;
      } catch {
        /* ignore */
      }
      // 兼容前端事件帧（event）与早期 action 帧；会话 id 可能在顶层或 payload 内
      const kind = parsed.event ?? parsed.action;
      const conv = parsed.conversationId ?? parsed.payload?.conversationId ?? 'demo';

      if (kind === 'heartbeat' || kind === 'ping') {
        ws.send(
          JSON.stringify({ event: 'heartbeat', timestamp: Date.now(), payload: { ok: true } }),
        );
        return;
      }

      if (kind === 'agent:start' || kind === 'start_stream') {
        // 流式增量推送（演示为确定性文本；生产由 MedicalAgentLoop + LLM 驱动）
        const messageId = `msg_${Date.now()}`;
        const parts = [
          '正在调阅患者数据……',
          '已获取最新检验与医嘱。',
          '综合判断：',
          '建议结合临床评估，必要时按危急值流程处置。',
        ];
        parts.forEach((delta, i) => {
          setTimeout(() => {
            const done = i === parts.length - 1;
            ws.send(
              JSON.stringify({
                event: 'agent:delta',
                timestamp: Date.now(),
                payload: { conversationId: conv, messageId, delta, done },
              }),
            );
            if (done) {
              ws.send(
                JSON.stringify({
                  event: 'agent:done',
                  timestamp: Date.now(),
                  payload: { conversationId: conv, messageId },
                }),
              );
            }
          }, i * 300);
        });
      }
    },
    close(ws) {
      chatClients.delete(ws);
      metrics.wsConnections.dec();
    },
  },
});

// 演示用：非生产环境周期性推送一条模拟危急值告警（生产环境严禁推送假告警）
const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';
const demoAlertTimer = isProduction
  ? null
  : setInterval(() => {
      // 事件名与前端 useAlert 订阅的 critical:alert 通道保持一致；
      // payload 对齐前端 Alert 契约（type/level/title/content/patientId）
      broadcast('critical:alert', {
        id: `al_${Date.now()}`,
        type: 'critical-value',
        level: 'critical',
        title: '肌钙蛋白危急值',
        content:
          '李**（P100086）cTnI 升高达危急值，请立即复核并按危急值流程处置（10 分钟内处置 + 双人复核 + 系统登记）',
        patientId: 'P100086',
        patientName: '李**',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }, 30_000);

// eslint-disable-next-line no-console
console.log(
  `[jianlan-bff] listening on http://0.0.0.0:${port}  (WebSocket /ws/chat [auth required])`,
);

// 优雅停机：停止接收新连接、关闭演示定时器与 WS，再退出，便于滚动发布与 K8s 终止
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[jianlan-bff] 收到 ${signal}，开始优雅停机…`);
  if (demoAlertTimer) clearInterval(demoAlertTimer);
  for (const ws of chatClients) {
    try {
      ws.close(1001, 'server shutting down');
    } catch {
      /* already closed */
    }
  }
  void server.stop(false);
  // 给在途同步响应一个极短收尾窗口后退出
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { broadcast, ok, server };
