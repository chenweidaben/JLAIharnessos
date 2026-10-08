/**
 * 健澜科技 jlmedaios - 知识库管理与 RAG 检索 集成测试（M4-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock），覆盖：
 *  - 新建知识库、重复标识 409、非法标识 400；
 *  - 文档摄入（解析、分块、嵌入、索引），返回分块数；
 *  - 空正文 400、不存在 KB 404；
 *  - RAG 混合检索：摄入后能检索到相关内容且来源可追溯；
 *  - 文档列表、删除知识库（级联清理分块/文档）；
 *  - BFF 路由信封：未认证 401、药师无 manage 403。
 *
 * 隔离：使用唯一 KB 标识，afterAll 按标识删除（级联）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { getDb, verifyDbConnection } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import {
  KnowledgeError,
  createKb,
  deleteKb,
  ingestDocument,
  listDocuments,
  listKbs,
  retrieve,
  setEmbeddingServiceForTest,
} from '../../src/bff/aggregators/knowledgeAggregator.js';
import { knowledgeBaseRoutes } from '../../src/bff/routes/knowledgeBase.js';
import { MockEmbeddingService } from '../../src/knowledge/vector/EmbeddingService.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorChen: AuthView;
let pharmacist: AuthView;

const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const kbId = `m4a-test-${runId}`;
let kbCreated = false;

const SAMPLE_DOC = `# 二甲双胍临床用药须知

## 适应证
二甲双胍是 2 型糖尿病的一线口服降糖药，尤其适用于超重或肥胖的患者。

## 禁忌证
二甲双胍禁用于严重肾功能不全、急性代谢性酸中毒、严重感染和缺氧状态的患者。
造影检查前后应按医嘱暂停使用二甲双胍。

## 不良反应
常见胃肠道反应，包括腹泻、恶心、腹胀；罕见乳酸酸中毒。`;

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

beforeAll(() => {
  if (dbAvailable) {
    // 显式使用本地确定性嵌入，保证测试可重复
    setEmbeddingServiceForTest(new MockEmbeddingService(1024));
  }
});

if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  doctorChen = await load('doctor_chen');
  pharmacist = await load('pharmacist_wang');
}

afterAll(async () => {
  if (!dbAvailable) return;
  // 删除测试 KB（级联分块/文档）
  try {
    await deleteKb(admin, kbId);
  } catch {
    /* 已删除则忽略 */
  }
  setEmbeddingServiceForTest(null);
});

describe.skipIf(!dbAvailable || !realMode)('M4-A 知识库管理与 RAG 检索（真实 PostgreSQL）', () => {
  if (!dbAvailable) {
    it.skip('数据库不可用，跳过（不冒充通过）', () => {});
    return;
  }

  it('新建知识库成功', async () => {
    const kb = await createKb(admin, {
      id: kbId,
      name: 'M4A 测试库',
      description: '集成测试用',
      authorityLevel: 'general',
    });
    kbCreated = true;
    expect(kb.id).toBe(kbId);
    expect(kb.enabled).toBe(true);
  });

  it('重复标识 → 409', async () => {
    let caught: unknown = null;
    try {
      await createKb(admin, { id: kbId, name: '重复' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KnowledgeError);
    expect((caught as KnowledgeError).status).toBe(409);
  });

  it('非法标识 → 400', async () => {
    let caught: unknown = null;
    try {
      await createKb(admin, { id: 'Bad ID!', name: '非法' });
    } catch (e) {
      caught = e;
    }
    expect((caught as KnowledgeError).status).toBe(400);
  });

  it('摄入文档成功并返回分块数', async () => {
    const res = await ingestDocument(doctorChen, kbId, {
      title: '二甲双胍用药须知',
      content: SAMPLE_DOC,
      format: 'md',
      author: 'test',
    });
    expect(res.chunkCount).toBeGreaterThan(0);
    expect(res.document.status).toBe('ready');
  });

  it('空正文 → 400', async () => {
    let caught: unknown = null;
    try {
      await ingestDocument(admin, kbId, { title: '空', content: '   ' });
    } catch (e) {
      caught = e;
    }
    expect((caught as KnowledgeError).status).toBe(400);
  });

  it('摄入到不存在的 KB → 404', async () => {
    let caught: unknown = null;
    try {
      await ingestDocument(admin, 'no-such-kb-xyz', {
        title: 't',
        content: '一些内容用于测试',
      });
    } catch (e) {
      caught = e;
    }
    expect((caught as KnowledgeError).status).toBe(404);
  });

  it('RAG 检索能命中摄入内容且来源可追溯', async () => {
    const results = await retrieve(admin, '二甲双胍的禁忌证是什么', { topK: 3 });
    expect(results.length).toBeGreaterThan(0);
    const top = results[0];
    expect(top.documentTitle).toBe('二甲双胍用药须知');
    expect(top.kbId).toBe(kbId);
    expect(top.content).toContain('禁忌');
    expect(top.score).toBeGreaterThan(0);
  });

  it('空检索词 → 400', async () => {
    let caught: unknown = null;
    try {
      await retrieve(admin, '  ');
    } catch (e) {
      caught = e;
    }
    expect((caught as KnowledgeError).status).toBe(400);
  });

  it('文档列表包含已摄入文档', async () => {
    const docs = await listDocuments(admin, kbId);
    expect(docs.some((d) => d.title === '二甲双胍用药须知')).toBe(true);
  });

  it('知识库列表包含测试库', async () => {
    const kbs = await listKbs(admin);
    expect(kbs.some((k) => k.id === kbId)).toBe(true);
  });

  it('删除知识库后级联清理', async () => {
    await deleteKb(admin, kbId);
    kbCreated = false;
    const db = getDb();
    const chunks = await db`SELECT count(*)::int AS n FROM knowledge.chunks WHERE kb_id = ${kbId}`;
    const docs = await db`SELECT count(*)::int AS n FROM knowledge.documents WHERE kb_id = ${kbId}`;
    expect((chunks[0] as { n: number }).n).toBe(0);
    expect((docs[0] as { n: number }).n).toBe(0);
  });

  it('BFF 路由：未认证 → 401', async () => {
    const route = knowledgeBaseRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/v1/kb',
    )!;
    const res = await route.handle({
      user: null,
      query: new URLSearchParams(),
      params: {},
    } as unknown as Ctx);
    expect(res.status).toBe(401);
  });

  it('BFF 路由：药师无 knowledge:manage → 403', async () => {
    const route = knowledgeBaseRoutes.find(
      (r) => r.method === 'POST' && r.path === '/api/v1/kb',
    )!;
    const res = await route.handle({
      user: { id: pharmacist.id, roles: pharmacist.rawRoles },
      params: {},
      body: async () => ({ id: 'x', name: 'x' }),
    } as unknown as Ctx);
    expect(res.status).toBe(403);
  });
});
