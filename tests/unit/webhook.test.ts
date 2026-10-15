/**
 * 健澜科技 jlmedaios - M129-D 系统事件 Webhook 单测（系统集成）
 *
 * 覆盖纯函数层：
 *  - registerWebhook：合法登记 / 非法 url / 非法事件 / 弱 secret / 空事件抛错；
 *  - signPayload + verifySignature：已知 HMAC 向量、错密钥、篡改报文、伪造签名；
 *  - computeBackoffMs：指数退避 1s/2s/4s，封顶 30s；
 *  - shouldRetry：成功不重试 / 耗尽不重试 / 失败未耗尽重试；
 *  - triggerWebhook：fan-out 仅命中 active 且订阅事件者；失败重试直至成功；
 *    重试耗尽返回 success=false；disabled / 未订阅者被跳过。
 *
 * 全部为纯函数断言，传输层注入假函数，不依赖数据库与真实网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  computeBackoffMs,
  registerWebhook,
  signPayload,
  shouldRetry,
  triggerWebhook,
  verifySignature,
  WEBHOOK_EVENTS,
  type Webhook,
  type WebhookTransport,
} from '../../src/bff/aggregators/webhookAggregator';

/** 构造一条合法 webhook 的快捷函数 */
const mk = (over: Partial<Webhook> = {}): Webhook =>
  ({
    id: 'wh_test',
    url: 'https://example.com/jlan/hook',
    events: ['patient.created'],
    secret: '0123456789abcdef0123456789abcdef',
    status: 'active',
    description: '测试订阅',
    createdBy: 'admin001',
    createdAt: '2026-10-16T08:00:00.000Z',
    updatedAt: '2026-10-16T08:00:00.000Z',
    ...over,
  }) as Webhook;

describe('M129-D 系统事件 Webhook', () => {
  describe('registerWebhook 登记校验', () => {
    it('合法入参：返回不可变 Webhook，事件去重', () => {
      const w = registerWebhook(
        'https://example.com/hook',
        ['patient.created', 'patient.created', 'critical_result'],
        '0123456789abcdef',
        { description: '区域平台', createdBy: 'admin001' },
      );
      expect(w.url).toBe('https://example.com/hook');
      expect(w.events).toHaveLength(2);
      expect(w.events).toContain('patient.created');
      expect(w.events).toContain('critical_result');
      expect(w.status).toBe('active');
      expect(w.secret).toBe('0123456789abcdef');
      expect(() => new Date(w.createdAt).toISOString()).not.toThrow();
    });

    it('非法 url（http 公网 / 非 http 协议）抛错', () => {
      expect(() =>
        registerWebhook('http://insecure.com/hook', ['patient.created'], '0123456789abcdef'),
      ).toThrow(/https/);
      expect(() =>
        registerWebhook('file:///etc/passwd', ['patient.created'], '0123456789abcdef'),
      ).toThrow();
    });

    it('localhost 开发地址放行', () => {
      const w = registerWebhook(
        'http://localhost:8080/hook',
        ['patient.created'],
        '0123456789abcdef',
      );
      expect(w.url).toBe('http://localhost:8080/hook');
    });

    it('弱 secret（<16 位）抛错', () => {
      expect(() =>
        registerWebhook('https://example.com/hook', ['patient.created'], 'short'),
      ).toThrow(/secret/);
    });

    it('非法事件类型抛错', () => {
      expect(() =>
        registerWebhook('https://example.com/hook', ['patient.deleted'], '0123456789abcdef'),
      ).toThrow(/非法 webhook 事件/);
    });

    it('空事件数组抛错', () => {
      expect(() =>
        registerWebhook('https://example.com/hook', [], '0123456789abcdef'),
      ).toThrow(/至少订阅一个事件/);
    });
  });

  describe('HMAC-SHA256 签名与校验', () => {
    it('同密钥同报文：sign → verify 通过', () => {
      const secret = '0123456789abcdef';
      const body = JSON.stringify({ event: 'patient.created', data: { id: 'P001' } });
      const sig = signPayload(secret, body);
      expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
      expect(verifySignature(secret, body, sig)).toBe(true);
    });

    it('错密钥 / 篡改报文 / 伪造签名均校验失败', () => {
      const secret = '0123456789abcdef';
      const body = '{"a":1}';
      const sig = signPayload(secret, body);
      expect(verifySignature('different-secret-xxxxxx', body, sig)).toBe(false);
      expect(verifySignature(secret, '{"a":2}', sig)).toBe(false);
      expect(verifySignature(secret, body, 'sha256=deadbeef')).toBe(false);
      expect(verifySignature(secret, body, 'not-a-signature')).toBe(false);
    });
  });

  describe('computeBackoffMs 指数退避', () => {
    it('首次不等待；第二次 1s；第三次 2s；第四次 4s', () => {
      expect(computeBackoffMs(1)).toBe(0);
      expect(computeBackoffMs(2)).toBe(1000);
      expect(computeBackoffMs(3)).toBe(2000);
      expect(computeBackoffMs(4)).toBe(4000);
    });

    it('退避封顶 30s', () => {
      expect(computeBackoffMs(20)).toBe(30_000);
    });
  });

  describe('shouldRetry 重试判定', () => {
    it('成功不重试；失败未耗尽重试；失败已耗尽不重试', () => {
      expect(shouldRetry(1, true, 5)).toBe(false);
      expect(shouldRetry(1, false, 5)).toBe(true);
      expect(shouldRetry(5, false, 5)).toBe(false);
    });
  });

  describe('triggerWebhook fan-out + 重试', () => {
    it('仅命中 active 且订阅该事件的 webhook，disabled / 未订阅被跳过', async () => {
      const activeSubscribed = mk({ id: 'wh_a', url: 'https://a/hook' });
      const disabled = mk({ id: 'wh_b', url: 'https://b/hook', status: 'disabled' });
      const activeOtherEvent = mk({
        id: 'wh_c',
        url: 'https://c/hook',
        events: ['prescription.created'],
      });
      const calls: string[] = [];
      const fakeSend: WebhookTransport = async (url) => {
        calls.push(url);
        return { ok: true };
      };
      const results = await triggerWebhook(
        'patient.created',
        { patientId: 'P001' },
        { webhooks: [activeSubscribed, disabled, activeOtherEvent], send: fakeSend },
      );
      expect(results).toHaveLength(1);
      expect(results[0].webhookId).toBe('wh_a');
      expect(calls).toEqual(['https://a/hook']);
    });

    it('失败重试直至成功：attempts 累计，最终 success=true', async () => {
      const w = mk({
        id: 'wh_retry',
        events: ['critical_result'],
        secret: '0123456789abcdef0123456789abcdef',
      });
      let n = 0;
      const fakeSend: WebhookTransport = async (url, body, signature) => {
        n += 1;
        // 校验假传输确实收到了合法签名（HMAC 正确性的端到端证据）
        expect(verifySignature(w.secret, body, signature)).toBe(true);
        expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);
        if (n < 3) return { ok: false, statusCode: 503, error: '上游暂不可用' };
        return { ok: true, statusCode: 200 };
      };
      const results = await triggerWebhook(
        'critical_result',
        { lab: 'K+', value: '6.8' },
        { webhooks: [w], send: fakeSend, maxRetries: 5 },
      );
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].attempts).toBe(3);
      expect(results[0].error).toBeUndefined();
    });

    it('重试耗尽仍失败：success=false，attempts=maxRetries', async () => {
      const w = mk({ id: 'wh_dead', events: ['error.alert'] });
      const fakeSend: WebhookTransport = async () => ({
        ok: false,
        statusCode: 500,
        error: '对端 500',
      });
      const results = await triggerWebhook(
        'error.alert',
        { route: '/api/x' },
        { webhooks: [w], send: fakeSend, maxRetries: 3 },
      );
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].attempts).toBe(3);
      expect(results[0].error).toContain('500');
    });

    it('非法事件直接抛错（不外发）', async () => {
      const w = mk();
      let called = false;
      const fakeSend: WebhookTransport = async () => {
        called = true;
        return { ok: true };
      };
      await expect(
        triggerWebhook('patient.deleted', {}, { webhooks: [w], send: fakeSend }),
      ).rejects.toThrow(/非法 webhook 事件/);
      expect(called).toBe(false);
    });

    it('事件白名单常量覆盖四类事件', () => {
      expect(WEBHOOK_EVENTS).toEqual([
        'patient.created',
        'prescription.created',
        'critical_result',
        'error.alert',
      ]);
    });
  });
});
