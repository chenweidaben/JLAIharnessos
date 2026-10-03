/**
 * 健澜科技 jlmedaios - 事务性发件箱管理路由 集成测试（M7-D）
 *
 * 直连真实 PostgreSQL，对 BFF 路由（无 mock）验证：
 *  - admin（outbox:manage）列出死信、重投死信（dead -> pending）；
 *  - 重投不存在的 id 404；非法 id 400；
 *  - doctor 无 outbox:manage 403；未登录 401。
 *
 * 测试夹具用 aggregate_type='test_outbox_mgmt' 标记，afterAll 清理。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import {
  closeDbForTest,
  getDb,
  verifyDbConnection,
  withTx,
} from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import {
  appendEvent,
  claimBatch,
  markDead,
  countByStatus,
} from '../../src/db/repositories/outboxRepo.js';
import { outboxRoutes } from '../../src/bff/routes/outbox.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

let admin: AuthView;
let doctorChen: AuthView;
if (dbAvailable) {
  const au = await getUserByUsername('admin');
  admin = buildAuthView(au!, await getUserRoleLinks(au!.id));
  const dc = await getUserByUsername('doctor_chen');
  doctorChen = buildAuthView(dc!, await getUserRoleLinks(dc!.id));
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.event_outbox WHERE aggregate_type = 'test_outbox_mgmt'`;
    await closeDbForTest();
  }
});

function makeCtx(
  view: AuthView | null,
  opts: { params?: Record<string, string>; query?: Record<string, string> } = {},
): Ctx {
  const user = view
    ? {
        id: view.id, name: view.realName, roles: view.rawRoles, permissions: view.permissions,
      }
    : null;
  return {
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    body: async () => ({}),
    user,
    traceId: 'test',
  } as unknown as Ctx;
}

function findRoute(method: string, path: string) {
  return outboxRoutes.find((r) => r.method === method && r.path === path)!;
}

/** 造一条死信，返回其 id。 */
async function seedDeadLetter(aggId: string): Promise<number> {
  const eid = crypto.randomUUID();
  await withTx(async (tx) => {
    await appendEvent(
      {
        eventId: eid,
        eventType: 'test:dead',
        aggregateType: 'test_outbox_mgmt',
        aggregateId: aggId,
        payload: { x: 1 },
      },
      tx,
    );
  });
  const claimed = await withTx(async (tx) => {
    const c = await claimBatch(100, tx);
    return c.filter((e) => e.eventId === eid);
  });
  await markDead(claimed.map((e) => e.id), '永久错误');
  return claimed[0].id;
}

describe.skipIf(!dbAvailable)('M7-D 死信队列管理路由', () => {
  it('admin 列出死信：包含刚造的死信并给总数', async () => {
    const id = await seedDeadLetter('mgmt-1');
    const res = await findRoute('GET', '/api/v1/outbox/dead-letters').handle(
      makeCtx(admin, { query: { limit: '50' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    const found = body.data.items.find((e: { id: number }) => e.id === id);
    expect(found).toBeTruthy();
    expect(found.lastError).toBe('永久错误');
    expect(found.eventType).toBe('test:dead');
  });

  it('admin 重投死信：200，事件 dead -> pending', async () => {
    const id = await seedDeadLetter('mgmt-2');
    const before = await countByStatus();
    const res = await findRoute('POST', '/api/v1/outbox/requeue/:id').handle(
      makeCtx(admin, { params: { id: String(id) } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.requeued).toBe(true);
    const after = await countByStatus();
    expect(after.pending).toBe(before.pending + 1);
  });

  it('重投不存在的 id：404', async () => {
    const res = await findRoute('POST', '/api/v1/outbox/requeue/:id').handle(
      makeCtx(admin, { params: { id: '99999999' } }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe(40400);
  });

  it('非法 id：400', async () => {
    const res = await findRoute('POST', '/api/v1/outbox/requeue/:id').handle(
      makeCtx(admin, { params: { id: 'abc' } }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
  });

  it('doctor 无 outbox:manage：列死信 403', async () => {
    const res = await findRoute('GET', '/api/v1/outbox/dead-letters').handle(makeCtx(doctorChen));
    expect(res.status).toBe(403);
  });

  it('doctor 重投：403', async () => {
    const res = await findRoute('POST', '/api/v1/outbox/requeue/:id').handle(
      makeCtx(doctorChen, { params: { id: '1' } }),
    );
    expect(res.status).toBe(403);
  });

  it('未登录：401', async () => {
    const res = await findRoute('GET', '/api/v1/outbox/dead-letters').handle(makeCtx(null));
    expect(res.status).toBe(401);
  });
});
