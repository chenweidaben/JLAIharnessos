/**
 * 健澜科技 jlmedaios - 运行病历质控 集成测试（M2-B）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 规则检查 + 三级质控通过（submitted→reviewed→signed→archived）与签名链；
 *  - 退回整改、作者重提闭环；非作者重提 403；
 *  - 质控人不得为作者本人（403）；
 *  - 带阻断/主要缺陷通过须显式确认并写明理由，否则 409；
 *  - 队列数据范围过滤；AI 辅助检查结构；BFF 权限/信封。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 删除全部测试夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import {
  closeDbForTest,
  getDb,
  verifyDbConnection,
} from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createMedicalRecord } from '../../src/db/repositories/medicalRecordRepo.js';
import { listReviewsByRecord } from '../../src/db/repositories/medicalRecordReviewRepo.js';
import {
  getQcQueue,
  getQcRecord,
  resubmitRecord,
  runQcCheck,
  submitQcReview,
} from '../../src/bff/aggregators/medicalQcAggregator.js';
import { medicalQcRoutes } from '../../src/bff/routes/medicalQc.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let pharmacist: AuthView;

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

const goodContent = {
  chiefComplaint: '反复胸闷1周，加重1天',
  presentIllness: '患者1周前劳累后出现胸闷，位于心前区，持续数分钟可缓解；1天来症状加重，发作频繁，无明显放射痛，无大汗及晕厥，今日来诊。',
  pastHistory: '高血压病史10年，吸烟20年。',
  physicalExam: 'T36.6 P82次/分 R18次/分 BP150/95mmHg，神清，心肺听诊心律齐，未闻及杂音，双肺无啰音。',
  auxiliaryExam: '心电图提示窦性心律，ST-T未见明显抬高。',
  diagnosis: '胸闷待查：冠心病可能',
  treatment: '建议完善冠脉相关检查，暂予抗血小板、调脂及对症治疗，门诊随诊。',
};

function plainTextOf(content: Record<string, string>): string {
  return Object.entries(content)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/** 新建患者/就诊/病历并置 submitted（模拟作者提交）。 */
async function newSubmittedRecord(opts: {
  author: AuthView;
  department: string;
  content?: Record<string, string>;
}): Promise<string> {
  const content = opts.content ?? goodContent;
  const patient = await createPatient({
    mrn: `M2B${seq()}`,
    nameMasked: `控*${seq().slice(-4)}`,
    gender: '未知',
    birthDate: null,
    tags: ['M2B_TEST'],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'outpatient',
    department: opts.department,
  });
  const record = await createMedicalRecord({
    visitId: visit.id,
    recordType: 'outpatient',
    title: '门诊病历',
    content,
    plainText: plainTextOf(content),
    authorId: opts.author.id,
  });
  const db = getDb();
  await db`UPDATE clinical.medical_records SET status='submitted' WHERE id=${record.id}`;
  return record.id;
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
      DELETE FROM clinical.medical_record_reviews r
      USING clinical.medical_records m, clinical.visits v, clinical.patients p
      WHERE r.record_id=m.id AND m.visit_id=v.id AND v.patient_id=p.id
        AND p.tags @> '["M2B_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.medical_records m
      USING clinical.visits v, clinical.patients p
      WHERE m.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M2B_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.visits v
      USING clinical.patients p
      WHERE v.patient_id=p.id AND p.tags @> '["M2B_TEST"]'::jsonb
    `;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M2B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M2-B 三级质控全流程', () => {
  it('规则检查通过后逐级签名：reviewed→signed→archived，签名链完整', async () => {
    const id = await newSubmittedRecord({ author: doctorChen, department: '心血管内科' });

    const check = await runQcCheck(admin, id, false);
    expect(check.canPass).toBe(true);
    expect(check.score).toBe(100);

    const before = await getQcRecord(admin, id);
    expect(before.nextLevel).toBe(1);

    const l1 = await submitQcReview(admin, id, { decision: 'pass', level: 1 });
    expect(l1.newStatus).toBe('reviewed');
    const afterL1 = await getQcRecord(admin, id);
    expect(afterL1.nextLevel).toBe(2);

    const l2 = await submitQcReview(admin, id, { decision: 'pass', level: 2 });
    expect(l2.newStatus).toBe('signed');
    const afterL2 = await getQcRecord(admin, id);
    expect(afterL2.nextLevel).toBe(3);

    const l3 = await submitQcReview(admin, id, { decision: 'pass', level: 3 });
    expect(l3.newStatus).toBe('archived');

    const reviews = await listReviewsByRecord(id);
    expect(reviews).toHaveLength(3);
    expect(reviews.map((r) => r.decision)).toEqual(['pass', 'pass', 'pass']);
    expect(reviews.map((r) => r.reviewLevel)).toEqual([1, 2, 3]);
    expect(reviews.every((r) => r.reviewerId === admin.id)).toBe(true);

    const queue = await getQcQueue(admin);
    expect(queue.items.some((i) => i.recordId === id)).toBe(false);
  });
});

describe.skipIf(!dbAvailable)('M2-B 退回整改与职责分离', () => {
  it('退回→非作者重提403→作者重提→再通过，闭环留痕', async () => {
    const id = await newSubmittedRecord({ author: doctorChen, department: '心血管内科' });

    const ret = await submitQcReview(admin, id, {
      decision: 'return', level: 1, comment: '现病史描述不充分，请补充诱因与缓解因素',
    });
    expect(ret.newStatus).toBe('returned');
    const returned = await getQcRecord(admin, id);
    expect(returned.nextLevel).toBe(1);

    expect(resubmitRecord(admin, id)).rejects.toBeTruthy();

    const resub = await resubmitRecord(doctorChen, id);
    expect(resub.status).toBe('submitted');

    const pass = await submitQcReview(admin, id, { decision: 'pass', level: 1 });
    expect(pass.newStatus).toBe('reviewed');

    const reviews = await listReviewsByRecord(id);
    expect(reviews).toHaveLength(2);
    expect(reviews[0].decision).toBe('return');
    expect(reviews[1].decision).toBe('pass');
  });

  it('质控人不得为作者本人：作者提交结论 403', async () => {
    const id = await newSubmittedRecord({ author: doctorChen, department: '心血管内科' });
    expect(
      submitQcReview(doctorChen, id, { decision: 'pass', level: 1 }),
    ).rejects.toBeTruthy();
  });

  it('越级质控 409：submitted 状态直接提交 2 级', async () => {
    const id = await newSubmittedRecord({ author: doctorChen, department: '心血管内科' });
    expect(
      submitQcReview(admin, id, { decision: 'pass', level: 2 }),
    ).rejects.toBeTruthy();
  });
});

describe.skipIf(!dbAvailable)('M2-B 缺陷门禁与队列范围', () => {
  it('带阻断缺陷通过：未确认 409；显式确认并写明理由后通过', async () => {
    const defective = {
      chiefComplaint: '胸闷',
      presentIllness: '反复胸闷发作，今日加重，持续不缓解，无其他伴随。',
      pastHistory: '',
      physicalExam: '',
      auxiliaryExam: '',
      diagnosis: '',
      treatment: '',
    };
    const id = await newSubmittedRecord({
      author: doctorChen, department: '心血管内科', content: defective,
    });
    const check = await runQcCheck(admin, id, false);
    expect(check.canPass).toBe(false);
    expect(check.rule.blockCount).toBeGreaterThan(0);

    expect(
      submitQcReview(admin, id, { decision: 'pass', level: 1 }),
    ).rejects.toBeTruthy();

    const pass = await submitQcReview(admin, id, {
      decision: 'pass', level: 1,
      comment: '经复核患者为门诊简单情况，已电话补充确认相关信息，予以通过',
      acknowledgeIssues: true,
      issues: check.issues,
    });
    expect(pass.newStatus).toBe('reviewed');
  });

  it('队列按数据范围过滤：科室医生只见本科室病历', async () => {
    await newSubmittedRecord({ author: doctorChen, department: '心血管内科' });
    await newSubmittedRecord({ author: doctorChen, department: '急诊科' });

    const chenQueue = await getQcQueue(doctorChen);
    expect(chenQueue.items.every((i) => i.department === '心血管内科')).toBe(true);
    expect(chenQueue.items.some((i) => i.department === '急诊科')).toBe(false);

    const adminQueue = await getQcQueue(admin);
    expect(adminQueue.items.some((i) => i.department === '急诊科')).toBe(true);
  });

  it('AI 辅助检查返回完整结构（规则结果不受 AI 影响）', async () => {
    const id = await newSubmittedRecord({ author: doctorChen, department: '心血管内科' });
    const r = await runQcCheck(admin, id, true);
    expect(r.rule).toBeTruthy();
    expect(r.ai).toHaveProperty('issues');
    expect(r.ai).toHaveProperty('model');
    expect(r.ai).toHaveProperty('error');
  });
});

/* ------------------------------ BFF 路由 ------------------------------ */

function makeCtx(
  view: AuthView | null,
  opts: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {},
): Ctx {
  const user = view
    ? {
        id: view.id, name: view.realName, roles: view.rawRoles, permissions: view.permissions,
      }
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
  return medicalQcRoutes.find((r) => r.method === method && r.path === path)!;
}

describe.skipIf(!dbAvailable)('M2-B BFF 路由：权限与信封', () => {
  it('药师无 medical_record:audit 权限提交结论 → 403', async () => {
    const route = findRoute('POST', '/api/v1/medical-qc/records/:id/review');
    const res = await route.handle(makeCtx(pharmacist, { params: { id: 'x' } }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).not.toBe(0);
  });

  it('未登录访问队列 → 401', async () => {
    const route = findRoute('GET', '/api/v1/medical-qc/queue');
    const res = await route.handle(makeCtx(null));
    expect(res.status).toBe(401);
  });

  it('错误映射：不存在病历 404、越级 409、非法 decision 400', async () => {
    const notFound = await findRoute('GET', '/api/v1/medical-qc/records/:id').handle(
      makeCtx(admin, { params: { id: crypto.randomUUID() } }),
    );
    expect(notFound.status).toBe(404);
    expect((await notFound.json()).code).toBe(40400);

    const recId = await newSubmittedRecord({ author: doctorChen, department: '心血管内科' });
    const wrongLevel = await findRoute('POST', '/api/v1/medical-qc/records/:id/review').handle(
      makeCtx(admin, { params: { id: recId }, body: { decision: 'pass', level: 3 } }),
    );
    expect(wrongLevel.status).toBe(409);
    expect((await wrongLevel.json()).code).toBe(40900);

    const badBody = await findRoute('POST', '/api/v1/medical-qc/records/:id/review').handle(
      makeCtx(admin, { params: { id: recId }, body: { level: 1 } }),
    );
    expect(badBody.status).toBe(400);
    expect((await badBody.json()).code).toBe(40000);
  });

  it('管理员队列与检查成功路径统一信封', async () => {
    const id = await newSubmittedRecord({ author: doctorChen, department: '心血管内科' });

    const queueRes = await findRoute('GET', '/api/v1/medical-qc/queue').handle(makeCtx(admin));
    expect(queueRes.status).toBe(200);
    expect((await queueRes.json()).code).toBe(0);

    const checkRes = await findRoute('POST', '/api/v1/medical-qc/records/:id/check').handle(
      makeCtx(admin, { params: { id }, body: { useAi: false } }),
    );
    expect(checkRes.status).toBe(200);
    const checkBody = await checkRes.json();
    expect(checkBody.code).toBe(0);
    expect(checkBody.data.rule).toBeTruthy();
  });
});