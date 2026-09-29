/**
 * 健澜科技 jlmedaios - 病案首页 集成测试（M3-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 出院自动汇聚（幂等）、编码保存、第二人质控 pass/return、归档全链路；
 *  - 职责分离：编码员本人自审被拒（403）；
 *  - 权限：药师无 front_page:code → 403；DataScope 跨科 → 403；
 *  - 并发对同一出院就诊汇聚只生成一份首页；乐观锁版本冲突 → 409；
 *  - BFF 路由信封 / 401 / 错误码映射。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 删除全部测试夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createDiagnosis } from '../../src/db/repositories/diagnosisRepo.js';
import { getFrontPageByVisit, listReviewsByFrontPage } from '../../src/db/repositories/frontPageRepo.js';
import {
  aggregateFrontPage,
  archiveFrontPage,
  getFrontPageDetail,
  getFrontPageQueue,
  saveCoding,
  submitReview,
} from '../../src/bff/aggregators/frontPageAggregator.js';
import { frontPageRoutes } from '../../src/bff/routes/frontPage.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let pharmacist: AuthView;

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

/** 新建患者/出院住院就诊/主诊断，并完成出院汇聚，返回首页 id。 */
async function newDischargedPage(opts: {
  department: string;
  primaryDiagnosis?: string;
}): Promise<{ pageId: string; visitId: string }> {
  const patient = await createPatient({
    mrn: `M3A${seq()}`,
    nameMasked: `病*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1960-01-01',
    tags: ['M3A_TEST'],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: opts.department,
    chiefComplaint: '体检发现右上肺占位1周',
  });
  await createDiagnosis({
    visitId: visit.id, patientId: patient.id,
    name: opts.primaryDiagnosis ?? '肺恶性肿瘤', kind: 'primary', confirmed: true,
  });
  const db = getDb();
  await db`
    UPDATE clinical.visits
    SET status='discharged', discharge_at = now(), admit_at = now() - interval '7 days'
    WHERE id = ${visit.id}
  `;
  const { page } = await aggregateFrontPage(admin, visit.id);
  return { pageId: page.id, visitId: visit.id };
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}
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
  if (dbAvailable) {
    const db = getDb();
    await db`
      DELETE FROM clinical.front_page_reviews r
      USING clinical.medical_record_front_pages fp
      WHERE r.front_page_id = fp.id AND fp.visit_id IN (
        SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON p.id=v.patient_id
        WHERE p.tags @> '["M3A_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.medical_record_front_pages fp
      WHERE fp.visit_id IN (
        SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON p.id=v.patient_id
        WHERE p.tags @> '["M3A_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.diagnoses d
      WHERE d.visit_id IN (
        SELECT v.id FROM clinical.visits v JOIN clinical.patients p ON p.id=v.patient_id
        WHERE p.tags @> '["M3A_TEST"]'::jsonb
      )
    `;
    await db`
      DELETE FROM clinical.visits v
      USING clinical.patients p
      WHERE v.patient_id=p.id AND p.tags @> '["M3A_TEST"]'::jsonb
    `;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M3A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M3-A 汇聚与状态机全链路', () => {
  it('出院汇聚→编码→第二人质控通过→归档，签名链留痕', async () => {
    const { pageId } = await newDischargedPage({ department: '心血管内科' });
    let detail = await getFrontPageDetail(admin, pageId);
    expect(detail.page.status).toBe('draft');
    expect(detail.page.primaryDiagnosis).toBe('肺恶性肿瘤');

    // 编码员（admin）保存 ICD 编码
    const coded = await saveCoding(admin, pageId, {
      version: detail.page.version,
      primaryDiagnosisCode: 'C34.900',
    });
    expect(coded.page.status).toBe('coding');
    expect(coded.page.codedBy).toBe(admin.id);

    // 第二人（doctor_chen）质控通过（心血管内科，在范围内）
    detail = await getFrontPageDetail(admin, pageId);
    const passed = await submitReview(doctorChen, pageId, {
      version: detail.page.version, decision: 'pass', comment: '首页完整，同意通过',
    });
    expect(passed.page.status).toBe('qc');

    // 归档
    detail = await getFrontPageDetail(admin, pageId);
    const archived = await archiveFrontPage(doctorChen, pageId, detail.page.version);
    expect(archived.page.status).toBe('archived');
    expect(archived.page.archivedBy).toBe(doctorChen.id);

    const reviews = await listReviewsByFrontPage(pageId);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].decision).toBe('pass');
    expect(reviews[0].prevHash).toBe('GENESIS');
    expect(reviews[0].curHash).toMatch(/^[0-9a-f]{64}$/);

    // 归档后不在队列
    const queue = await getFrontPageQueue(admin);
    expect(queue.items.some((i) => i.pageId === pageId)).toBe(false);
  });

  it('退回闭环：return 回到 coding，重新编码后再通过', async () => {
    const { pageId } = await newDischargedPage({ department: '心血管内科' });
    await saveCoding(admin, pageId, { version: 1, primaryDiagnosisCode: 'C34.900' });
    let detail = await getFrontPageDetail(admin, pageId);

    const ret = await submitReview(doctorChen, pageId, {
      version: detail.page.version, decision: 'return', comment: 'ICD 编码不完整，请补全其他诊断',
    });
    expect(ret.page.status).toBe('coding');

    // 重新编码（版本号自增，乐观锁）
    detail = await getFrontPageDetail(admin, pageId);
    const recoded = await saveCoding(admin, pageId, {
      version: detail.page.version, primaryDiagnosisCode: 'C34.900',
      secondaryDiagnoses: [{ name: '高血压', code: 'I10.x00' }],
    });
    expect(recoded.page.status).toBe('coding');

    detail = await getFrontPageDetail(admin, pageId);
    const pass = await submitReview(doctorChen, pageId, {
      version: detail.page.version, decision: 'pass', comment: '已补全，同意通过',
    });
    expect(pass.page.status).toBe('qc');

    const reviews = await listReviewsByFrontPage(pageId);
    expect(reviews.map((r) => r.decision)).toEqual(['return', 'pass']);
    // 哈希链链接：第二条 prev_hash == 第一条 cur_hash
    expect(reviews[1].prevHash).toBe(reviews[0].curHash);
  });
});

describe.skipIf(!dbAvailable)('M3-A 职责分离与权限/数据范围', () => {
  it('编码员本人自审 → 403（职责分离）', async () => {
    const { pageId } = await newDischargedPage({ department: '心血管内科' });
    await saveCoding(admin, pageId, { version: 1, primaryDiagnosisCode: 'C34.900' });
    const detail = await getFrontPageDetail(admin, pageId);
    // admin 即编码员，本人质控必须被拒
    await expect(
      submitReview(admin, pageId, { version: detail.page.version, decision: 'pass' }),
    ).rejects.toBeTruthy();
  });

  it('DataScope 跨科：心血管内科医生不能访问急诊科首页 → 403', async () => {
    const { pageId } = await newDischargedPage({ department: '急诊科' });
    await expect(getFrontPageDetail(doctorChen, pageId)).rejects.toBeTruthy();
    // admin（全院）可访问
    await expect(getFrontPageDetail(admin, pageId)).resolves.toBeTruthy();
  });

  it('乐观锁：错误版本号推进 → 409', async () => {
    const { pageId } = await newDischargedPage({ department: '心血管内科' });
    await expect(
      saveCoding(admin, pageId, { version: 999, primaryDiagnosisCode: 'C34.900' }),
    ).rejects.toBeTruthy();
  });
});

describe.skipIf(!dbAvailable)('M3-A 并发幂等汇聚', () => {
  it('同出院就诊并发汇聚只生成一份首页', async () => {
    const patient = await createPatient({
      mrn: `M3A${seq()}`, nameMasked: `并*${seq().slice(-4)}`,
      gender: '男', birthDate: null, tags: ['M3A_TEST'],
    });
    patientIds.push(patient.id);
    const visit = await createVisit({
      patientId: patient.id, visitType: 'inpatient', department: '心血管内科',
    });
    const db = getDb();
    await db`UPDATE clinical.visits SET status='discharged', discharge_at=now() WHERE id=${visit.id}`;

    const [r1, r2] = await Promise.all([
      aggregateFrontPage(admin, visit.id),
      aggregateFrontPage(admin, visit.id),
    ]);
    // 只有一个 created=true，另一个回查既有行
    expect([r1.created, r2.created].filter(Boolean)).toHaveLength(1);
    expect(r1.page.id).toBe(r2.page.id);

    const rows = await db`
      SELECT count(*)::int AS n FROM clinical.medical_record_front_pages WHERE visit_id=${visit.id}
    `;
    expect(rows[0].n).toBe(1);
  });
});

/* ------------------------------ BFF 路由 ------------------------------ */

function makeCtx(
  view: AuthView | null,
  opts: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {},
): Ctx {
  const user = view
    ? { id: view.id, name: view.realName, roles: view.rawRoles, permissions: view.permissions }
    : null;
  return {
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}
function findRoute(method: string, path: string) {
  return frontPageRoutes.find((r) => r.method === method && r.path === path)!;
}

describe.skipIf(!dbAvailable)('M3-A BFF 路由：权限与信封', () => {
  it('药师无 front_page:code 保存编码 → 403', async () => {
    const route = findRoute('POST', '/api/v1/front-pages/:id/coding');
    const res = await route.handle(makeCtx(pharmacist, { params: { id: 'x' }, body: { version: 1 } }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).not.toBe(0);
  });

  it('未登录访问队列 → 401', async () => {
    const res = await findRoute('GET', '/api/v1/front-pages/queue').handle(makeCtx(null));
    expect(res.status).toBe(401);
  });

  it('管理员队列成功路径统一信封', async () => {
    const res = await findRoute('GET', '/api/v1/front-pages/queue').handle(makeCtx(admin));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data).toHaveProperty('items');
  });

  it('错误映射：不存在首页 404、非法 decision 400', async () => {
    const notFound = await findRoute('GET', '/api/v1/front-pages/:id').handle(
      makeCtx(admin, { params: { id: crypto.randomUUID() } }),
    );
    expect(notFound.status).toBe(404);
    expect((await notFound.json()).code).toBe(40400);

    const { pageId } = await newDischargedPage({ department: '心血管内科' });
    await saveCoding(admin, pageId, { version: 1, primaryDiagnosisCode: 'C34.900' });
    const bad = await findRoute('POST', '/api/v1/front-pages/:id/review').handle(
      makeCtx(doctorChen, { params: { id: pageId }, body: { version: 2, decision: 'maybe' } }),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).code).toBe(40000);
  });
});
