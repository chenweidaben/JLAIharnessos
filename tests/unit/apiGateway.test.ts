/**
 * 健澜科技 jlmedaios - M164-D API 网关单测（系统集成深化 · 数据中台与AI大脑）
 *
 * 覆盖纯函数层：
 *  - buildAPIGateway：初始状态干净（空路由/空系统/零指标）；
 *  - registerExternalSystem：合法登记 / 非 https 抛错 / 名称非法 / 认证模式非法；
 *  - routeRequest：路由匹配命中转发 / 未注册 not_found；
 *  - 认证鉴权：api_key / jwt / sso 各自凭证校验，缺凭证 unauthorized；
 *  - 限流熔断：QPS 超限 rate_limited；熔断 open 拒绝、超时后 half_open 探测放行；
 *  - recordCircuitResult：连续失败达阈值打开熔断，探测成功闭合；
 *  - buildWebhookConfig：合法签名配置 / 弱 secret 抛错 / 非 https 抛错。
 *
 * 全部为纯函数断言，不依赖数据库与真实网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  authenticate,
  buildAPIGateway,
  buildWebhookConfig,
  isCircuitOpen,
  isRateLimited,
  recordCircuitResult,
  registerExternalSystem,
  routeRequest,
  type ApiRoute,
  type CircuitStateHolder,
  type ExternalSystem,
} from '../../src/bff/aggregators/apiGatewayAggregator';

const NOW = new Date('2026-10-16T08:00:00.000Z');

/** 一条已登记路由 */
const mkRoute = (over: Partial<ApiRoute> = {}): ApiRoute => ({
  id: 'r1',
  routePath: '/lab/results',
  method: 'POST',
  targetSystem: 'region-platform',
  targetEndpoint: '/open/lab/v1/results',
  authMode: 'api_key',
  qpsLimit: 5,
  timeoutMs: 5000,
  description: '',
  status: 'active',
  ...over,
});

/** 一个已登记外部系统 */
const mkSystem = (over: Partial<ExternalSystem> = {}): Record<string, ExternalSystem> => ({
  'region-platform': {
    systemName: 'region-platform',
    endpoint: 'https://region.hospital.cn',
    authMode: 'api_key',
    credentialRef: 'kms://rp',
    qpsLimit: 50,
    timeoutMs: 5000,
    status: 'active',
    description: '',
    registeredAt: NOW.toISOString(),
    ...over,
  },
});

describe('M164-D API 网关', () => {
  describe('buildAPIGateway 初始状态', () => {
    it('空路由 / 空系统 / 零指标', () => {
      const g = buildAPIGateway();
      expect(g.routes).toHaveLength(0);
      expect(Object.keys(g.systems)).toHaveLength(0);
      expect(g.metrics.totalRequests).toBe(0);
      expect(g.metrics.totalErrors).toBe(0);
    });
  });

  describe('registerExternalSystem 登记校验', () => {
    it('合法登记：返回不可变系统，endpoint 去尾斜杠', () => {
      const s = registerExternalSystem('region-platform', 'https://region.hospital.cn/open/', {
        mode: 'api_key',
        credentialRef: 'kms://rp',
      });
      expect(s.systemName).toBe('region-platform');
      expect(s.endpoint).toBe('https://region.hospital.cn/open');
      expect(s.authMode).toBe('api_key');
      expect(s.status).toBe('active');
    });

    it('非 https 公网地址抛错', () => {
      expect(() =>
        registerExternalSystem('bad', 'http://insecure.com/open', { mode: 'api_key' }),
      ).toThrow(/https/);
    });

    it('localhost 开发地址放行', () => {
      const s = registerExternalSystem('dev', 'http://localhost:8080/open', { mode: 'jwt' });
      expect(s.endpoint).toBe('http://localhost:8080/open');
    });

    it('名称含空白抛错', () => {
      expect(() => registerExternalSystem('a b', 'https://x.cn', { mode: 'api_key' })).toThrow();
    });
  });

  describe('routeRequest 路由匹配与转发', () => {
    it('命中路由：拼合下游 URL，决策 routed', () => {
      const d = routeRequest('/lab/results', 'POST', {
        routes: [mkRoute()],
        systems: mkSystem(),
        credential: { apiKey: 'jlsk_live_xxx' },
        now: NOW,
        traceId: 'trc_test',
      });
      expect(d.decision).toBe('routed');
      expect(d.target?.url).toBe('https://region.hospital.cn/open/lab/v1/results');
      expect(d.target?.authMode).toBe('api_key');
      expect(d.authOk).toBe(true);
    });

    it('未注册路径：not_found', () => {
      const d = routeRequest('/unknown', 'GET', {
        routes: [mkRoute()],
        systems: mkSystem(),
        credential: { apiKey: 'k' },
        now: NOW,
      });
      expect(d.decision).toBe('not_found');
    });

    it('方法不匹配：not_found', () => {
      const d = routeRequest('/lab/results', 'GET', {
        routes: [mkRoute()],
        systems: mkSystem(),
        credential: { apiKey: 'k' },
        now: NOW,
      });
      expect(d.decision).toBe('not_found');
    });
  });

  describe('认证鉴权（API Key / JWT / SSO）', () => {
    it('api_key 模式：缺 apiKey 则 unauthorized', () => {
      const d = routeRequest('/lab/results', 'POST', {
        routes: [mkRoute({ authMode: 'api_key' })],
        systems: mkSystem(),
        credential: {},
        now: NOW,
      });
      expect(d.decision).toBe('unauthorized');
      expect(d.authOk).toBe(false);
    });

    it('jwt 模式：缺 token 则 unauthorized，带 token 放行', () => {
      expect(authenticate('jwt', {})).toBe(false);
      expect(authenticate('jwt', { token: 'eyJxxx' })).toBe(true);
      const d = routeRequest('/lab/results', 'POST', {
        routes: [mkRoute({ authMode: 'jwt' })],
        systems: mkSystem(),
        credential: { token: 'eyJxxx' },
        now: NOW,
      });
      expect(d.decision).toBe('routed');
    });

    it('sso 模式：缺 subject 则 unauthorized，带 subject 放行', () => {
      expect(authenticate('sso', {})).toBe(false);
      expect(authenticate('sso', { subject: 'doctor@h' })).toBe(true);
    });
  });

  describe('限流（QPS 滑动窗口）', () => {
    it('窗口内请求数达到上限：rate_limited', () => {
      const nowMs = NOW.getTime();
      // qpsLimit=5，窗口内已有 5 个时间戳 → 第 6 次超限
      const stamps = [nowMs - 100, nowMs - 200, nowMs - 300, nowMs - 400, nowMs - 500];
      expect(isRateLimited(5, stamps, nowMs)).toBe(true);

      const d = routeRequest('/lab/results', 'POST', {
        routes: [mkRoute({ qpsLimit: 5 })],
        systems: mkSystem(),
        credential: { apiKey: 'k' },
        recentTimestamps: stamps,
        now: NOW,
      });
      expect(d.decision).toBe('rate_limited');
    });

    it('窗口外（>1s）时间戳不占配额', () => {
      const nowMs = NOW.getTime();
      const stamps = [nowMs - 2000, nowMs - 3000];
      expect(isRateLimited(5, stamps, nowMs)).toBe(false);
    });
  });

  describe('熔断（三态）', () => {
    it('closed：放行', () => {
      const h: CircuitStateHolder = {
        state: 'closed', failureCount: 0, successCount: 0, openedAt: null,
        threshold: 5, resetMs: 30000,
      };
      expect(isCircuitOpen(h, NOW).open).toBe(false);
    });

    it('open 且未到恢复窗口：拒绝', () => {
      const h: CircuitStateHolder = {
        state: 'open', failureCount: 5, successCount: 0,
        openedAt: NOW.toISOString(), threshold: 5, resetMs: 30000,
      };
      expect(isCircuitOpen(h, NOW).open).toBe(true);
    });

    it('open 超过 resetMs：转 half_open 探测放行', () => {
      const opened = new Date(NOW.getTime() - 40000);
      const h: CircuitStateHolder = {
        state: 'open', failureCount: 5, successCount: 0,
        openedAt: opened.toISOString(), threshold: 5, resetMs: 30000,
      };
      const r = isCircuitOpen(h, NOW);
      expect(r.open).toBe(false);
      expect(r.halfOpenNow).toBe(true);
    });

    it('连续失败达阈值：打开熔断', () => {
      let h: CircuitStateHolder | undefined = undefined;
      for (let i = 0; i < 5; i++) {
        h = recordCircuitResult(h, false, NOW);
      }
      expect(h?.state).toBe('open');
      expect(h?.openedAt).toBe(NOW.toISOString());
    });

    it('half_open 探测成功：闭合熔断器', () => {
      const h: CircuitStateHolder = {
        state: 'half_open', failureCount: 5, successCount: 0,
        openedAt: NOW.toISOString(), threshold: 5, resetMs: 30000,
      };
      const closed = recordCircuitResult(h, true, NOW);
      expect(closed.state).toBe('closed');
      expect(closed.failureCount).toBe(0);
    });

    it('熔断 open 时 routeRequest 返回 circuit_open', () => {
      const h: CircuitStateHolder = {
        state: 'open', failureCount: 5, successCount: 0,
        openedAt: NOW.toISOString(), threshold: 5, resetMs: 30000,
      };
      const d = routeRequest('/lab/results', 'POST', {
        routes: [mkRoute()],
        systems: mkSystem(),
        credential: { apiKey: 'k' },
        circuits: { '/lab/results': h },
        now: NOW,
      });
      expect(d.decision).toBe('circuit_open');
    });
  });

  describe('buildWebhookConfig 网关事件外发', () => {
    it('合法配置：固定签名头与 content-type', () => {
      const w = buildWebhookConfig('circuit.opened', 'https://x.cn/hook', '0123456789abcdef0123');
      expect(w.event).toBe('circuit.opened');
      expect(w.signatureHeader).toBe('x-jlan-signature');
      expect(w.contentType).toBe('application/json');
      expect(w.enabled).toBe(true);
    });

    it('弱 secret（<16 位）抛错', () => {
      expect(() => buildWebhookConfig('route.error', 'https://x.cn/hook', 'short')).toThrow(/16/);
    });

    it('非 https url 抛错', () => {
      expect(() =>
        buildWebhookConfig('route.error', 'http://x.cn/hook', '0123456789abcdef'),
      ).toThrow(/https/);
    });
  });
});
