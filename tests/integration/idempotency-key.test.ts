/**
 * 健澜科技 jlmedaios - 统一幂等键框架集成测试（M7-A）
 *
 * 直接对真实 PostgreSQL 运行 withIdempotency 中间件（不经 mock），覆盖：
 *  - 无 Idempotency-Key：直接执行，行为不变；
 *  - 首次请求：执行 handler 并落库缓存；
 *  - 重复请求：安全重放首次响应（Idempotent-Replay 头），handler 不二次执行；
 *  - 处理中并发：返回 409；
 *  - 同键不同请求（指纹不一致）：返回 409；
 *  - handler 抛错：删除占位，同一键可重试；
 *  - key 长度非法：400；
 *  - 用户隔离：不同用户同键互不影响；未登录以 IP 为作用域。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。
 * 运行：bun test tests/integration/idempotency-key.test.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { newCtx } from '../../src/bff/middleware/auth.js';
import {
  computeRequestHash,
  withIdempotency,
} from '../../src/bff/middleware/idempotency.js';
import { type Ctx, json, ok } from '../../src/bff/types.js';
import { getRecord } from '../../src/db/repositories/idempotencyRepo.js';

const BASE = 'http://127.0.0.1:8080/api/v1/idemp-test';
const USER_A = { id: 'idemp-user-a', name: '医师甲', roles: ['doctor'], permissions: [] };
const USER_B = { id: 'idemp-user-b', name: '医师乙', roles: ['doctor'], permissions: [] };

let dbAvailable = false;

async function makeCtx(
  key: string | null,
  bodyObj: Record<string, unknown>,
  user: Ctx['user'] = USER_A,
  path = '/api/v1/idemp-test',
): Promise<Ctx> {
  const bodyText = JSON.stringify(bodyObj);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['Idempotency-Key'] = key;
  const req = new Request(`http://127.0.0.1:8080${path}`, {
    method: 'POST',
    headers,
    body: bodyText,
  });
  const ctx = newCtx(req, {}, new URL(req.url).searchParams, bodyText);
  ctx.user = user;
  return ctx;
}

beforeAll(async () => {
  try {
    await verifyDbConnection(2, 1000);
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  if (dbAvailable) {
    // 清理本测试产生的记录（含处理中占位）
    await getDb()`
      DELETE FROM clinical.idempotency_keys
      WHERE user_id IN ('idemp-user-a','idemp-user-b')
         OR idempotency_key LIKE 'idemp-test-%'`;
    await closeDbForTest();
  }
});

describe('M7-A 统一幂等键框架', () => {
  it('无 Idempotency-Key 时直接执行（行为不变）', async () => {
    if (!dbAvailable) return;
    let calls = 0;
    const ctx = await makeCtx(null, { a: 1 });
    const res = await withIdempotency(ctx, () => {
      calls++;
      return json(ok({ n: calls }), 200);
    });
    expect(calls).toBe(1);
    expect(res.status).toBe(200);
    expect(res.headers.get('Idempotent-Replay')).toBeNull();
  });

  it('首次请求执行 handler 并缓存响应', async () => {
    if (!dbAvailable) return;
    let calls = 0;
    const ctx = await makeCtx('idemp-test-first-001', { order: 'X1' });
    const res = await withIdempotency(ctx, () => {
      calls++;
      return json(ok({ result: 'created', n: calls }), 201);
    });
    expect(calls).toBe(1);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.data.result).toBe('created');
    const rec = await getRecord('idemp-test-first-001', USER_A.id);
    expect(rec?.status).toBe('completed');
    expect(rec?.responseStatus).toBe(201);
  });

  it('重复请求安全重放，handler 不二次执行', async () => {
    if (!dbAvailable) return;
    let calls = 0;
    const run = () => {
      calls++;
      return json(ok({ result: 'once', n: calls }), 200);
    };
    const ctx1 = await makeCtx('idemp-test-replay-002', { order: 'X2' });
    await withIdempotency(ctx1, run);
    const ctx2 = await makeCtx('idemp-test-replay-002', { order: 'X2' });
    const res2 = await withIdempotency(ctx2, run);
    expect(calls).toBe(1); // handler 仅执行一次
    expect(res2.status).toBe(200);
    expect(res2.headers.get('Idempotent-Replay')).toBe('true');
    const data = await res2.json();
    expect(data.data.result).toBe('once');
  });

  it('处理中并发请求返回 409', async () => {
    if (!dbAvailable) return;
    // 预置一条 processing 记录（模拟另一请求正在处理）
    const db = getDb();
    await db`
      INSERT INTO clinical.idempotency_keys
        (idempotency_key, user_id, method, request_path, request_hash, status)
      VALUES ('idemp-test-processing-003','idemp-user-a','POST','/api/v1/idemp-test',
        ${await computeRequestHash('POST', '/api/v1/idemp-test', JSON.stringify({ order: 'X3' }))},
        'processing')`;
    let calls = 0;
    const ctx = await makeCtx('idemp-test-processing-003', { order: 'X3' });
    const res = await withIdempotency(ctx, () => {
      calls++;
      return json(ok({}), 200);
    });
    expect(calls).toBe(0);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.message).toContain('处理中');
  });

  it('同键不同请求（指纹不一致）返回 409', async () => {
    if (!dbAvailable) return;
    let calls = 0;
    const ctx1 = await makeCtx('idemp-test-mismatch-004', { amount: 100 });
    await withIdempotency(ctx1, () => {
      calls++;
      return json(ok({}), 200);
    });
    // 同键但不同请求体
    const ctx2 = await makeCtx('idemp-test-mismatch-004', { amount: 999 });
    const res2 = await withIdempotency(ctx2, () => {
      calls++;
      return json(ok({}), 200);
    });
    expect(calls).toBe(1);
    expect(res2.status).toBe(409);
    const data = await res2.json();
    expect(data.message).toContain('不同请求');
  });

  it('handler 抛错后删除占位，同一键可重试成功', async () => {
    if (!dbAvailable) return;
    let attempt = 0;
    const run = () => {
      attempt++;
      if (attempt === 1) throw new Error('首次处理失败');
      return json(ok({ result: 'retry-ok' }), 200);
    };
    const ctx1 = await makeCtx('idemp-test-retry-005', { order: 'X5' });
    expect(withIdempotency(ctx1, run)).rejects.toThrow('首次处理失败');
    // 占位已删除，可重试
    const ctx2 = await makeCtx('idemp-test-retry-005', { order: 'X5' });
    const res2 = await withIdempotency(ctx2, run);
    expect(res2.status).toBe(200);
    const data = await res2.json();
    expect(data.data.result).toBe('retry-ok');
  });

  it('key 长度非法返回 400', async () => {
    if (!dbAvailable) return;
    const ctx = await makeCtx('short', { a: 1 });
    const res = await withIdempotency(ctx, () => json(ok({}), 200));
    expect(res.status).toBe(400);
  });

  it('不同用户同键互不影响（用户隔离）', async () => {
    if (!dbAvailable) return;
    let callsA = 0;
    let callsB = 0;
    const ctxA = await makeCtx('idemp-test-isolated-006', { order: 'A' }, USER_A);
    await withIdempotency(ctxA, () => {
      callsA++;
      return json(ok({ who: 'A' }), 200);
    });
    const ctxB = await makeCtx('idemp-test-isolated-006', { order: 'A' }, USER_B);
    const resB = await withIdempotency(ctxB, () => {
      callsB++;
      return json(ok({ who: 'B' }), 200);
    });
    expect(callsA).toBe(1);
    expect(callsB).toBe(1); // B 独立执行，未被 A 的记录拦截
    const data = await resB.json();
    expect(data.data.who).toBe('B');
  });

  it('未登录请求以 IP 为匿名作用域，重复仍重放', async () => {
    if (!dbAvailable) return;
    let calls = 0;
    const run = () => {
      calls++;
      return json(ok({ anon: true }), 200);
    };
    const ctx1 = await makeCtx('idemp-test-anon-007', { a: 1 }, null);
    await withIdempotency(ctx1, run);
    const ctx2 = await makeCtx('idemp-test-anon-007', { a: 1 }, null);
    const res2 = await withIdempotency(ctx2, run);
    expect(calls).toBe(1);
    expect(res2.headers.get('Idempotent-Replay')).toBe('true');
  });
});
