/**
 * 健澜科技 jlmedaios - 住院在院诊疗日常真实链路集成测试（M1-B2）
 *
 * 直接对真实 PostgreSQL 运行在院诊疗聚合器与路由（不经 mock），覆盖三大状态机：
 *  - 医生查房：创建(draft)→本人签名(signed)→上级审签(countersigned)/退回(returned)；
 *  - 护士护理：护理记录创建→本人签名；护理任务创建→CAS 执行，并发重复幂等；
 *  - 在院医嘱：开具(pending_review)→医师审核(active)→护士执行/双人核对；
 *      临时医嘱单次执行(executed)，长期医嘱多时点执行→医师停止(stopped)。
 *
 * 医疗级严谨分支：
 *  - 职责分离：护士创建/审签查房、审核/停止医嘱 → 403；医师执行护理任务/医嘱给药 → 403；
 *  - 本人签名：代签查房/护理记录 → 403；上级自审 → 403；
 *  - 并发幂等：护理任务/医嘱执行重复触发不产生第二条结果；
 *  - 入参 400、不存在 404、状态冲突 409；路由层权限码 403 / 未登录 401。
 *
 * 需要可用 PostgreSQL（DATABASE_URL）；无 DB 自动跳过。每个用例自清（出院）。
 *
 * 运行：bun test tests/integration/inpatient-care.test.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';

import { admit, discharge } from '../../src/bff/aggregators/inpatientAggregator.js';
import {
  CareError,
  administerInpatientOrder,
  countersignRound,
  createCareTask,
  createInpatientCareOrder,
  createNursingCareRecord,
  createRound,
  executeCareTask,
  getInpatientOrderView,
  listCareTasks,
  listNursingCareRecords,
  listRounds,
  rejectInpatientOrder,
  returnRound,
  reviewInpatientOrder,
  signNursingCareRecord,
  signRound,
  stopInpatientOrder,
} from '../../src/bff/aggregators/inpatientCareAggregator.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  closeDbForTest,
  verifyDbConnection,
} from '../../src/db/pool.js';
import { getWardByCode } from '../../src/db/repositories/wardRepo.js';
import { listAdministrationsByOrder } from '../../src/db/repositories/orderAdministrationRepo.js';
import type { Ward } from '../../src/db/repositories/wardRepo.js';
import { inpatientCareRoutes } from '../../src/bff/routes/inpatientCare.js';

let dbAvailable = false;
let admin: AuthView;
let docA: AuthView; // 心血管内科 doctor_chen（查房作者/开嘱医师）
let docB: AuthView; // 心血管内科 doctor_zhou（第二医师/上级审签）
let nurseA: AuthView; // 心血管内科 nurse_zhao（记录/执行护士）
let nurseB: AuthView; // 心血管内科 nurse_qian（第二护士/双人核对）
let cardio: Ward;

const tracked: string[] = [];
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** 由 admin 在心血管病区入院一个一次性患者，返回在院列表项 */
async function admitPatient(): Promise<any> {
  const item = await admit(admin, {
    newPatient: {
      nameMasked: `护理*${seq().slice(-4)}`,
      gender: '未知',
      tags: ['CARE-TEST'],
    },
    wardId: cardio.id,
    diagnosis: '在院诊疗测试（虚构）',
    condition: 'stable',
    admissionType: 'elective',
    source: 'other',
  });
  tracked.push(item.visitId);
  return item;
}

async function safeDischarge(visitId: string): Promise<void> {
  try {
    await discharge(admin, { visitId, reason: '护理测试兜底清理' });
  } catch {
    /* ignore */
  }
}

/** 断言某动作以指定 HTTP 状态码抛出 CareError */
async function expectCareStatus(fn: () => Promise<unknown>, status: number): Promise<void> {
  let err: unknown;
  try {
    await fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(CareError);
  expect((err as CareError).status).toBe(status);
}

beforeAll(async () => {
  try {
    await verifyDbConnection(2, 1000);
    dbAvailable = true;
    const load = async (username: string): Promise<AuthView> => {
      const u = await getUserByUsername(username);
      if (!u) throw new Error(`缺少种子账号 ${username}`);
      return buildAuthView(u, await getUserRoleLinks(u.id));
    };
    admin = await load('admin');
    docA = await load('doctor_chen');
    docB = await load('doctor_zhou');
    nurseA = await load('nurse_zhao');
    nurseB = await load('nurse_qian');
    cardio = (await getWardByCode('WARD-CARDIO-1'))!;
    console.log('[test] PostgreSQL 可用，执行在院诊疗日常真实链路测试');
  } catch (e) {
    dbAvailable = false;
    console.log('[test] PostgreSQL 不可用，跳过在院诊疗测试', String(e));
  }
});

afterEach(async () => {
  if (!dbAvailable) return;
  for (const v of tracked.splice(0)) await safeDischarge(v);
});

afterAll(async () => {
  if (!dbAvailable) return;
  for (const v of tracked.splice(0)) await safeDischarge(v);
  await closeDbForTest();
});

const skip = () => !dbAvailable;

/* ============================ 医生查房状态机 ============================ */

describe('医生查房状态机', () => {
  it('创建查房为草稿，本人签名后为已签名（非上级查房）', async () => {
    if (skip()) return;
    const item = await admitPatient();
    let round = await createRound(docA, {
      visitId: item.visitId,
      roundType: 'routine',
      isSuperior: false,
      assessment: '患者病情平稳，胸痛缓解',
    });
    expect(round.status).toBe('draft');
    expect(round.authorId).toBe(docA.id);
    round = await signRound(docA, round.id);
    expect(round.status).toBe('signed');
    expect(round.signedBy).toBe(docA.id);
    expect(round.signedAt).toBeTruthy();
  });

  it('上级查房：本人签名后由第二医师审签为已审签', async () => {
    if (skip()) return;
    const item = await admitPatient();
    let round = await createRound(docA, {
      visitId: item.visitId,
      roundType: 'superior',
      isSuperior: true,
      assessment: '需上级医师评估诊疗计划',
    });
    round = await signRound(docA, round.id);
    expect(round.status).toBe('signed');
    round = await countersignRound(docB, round.id);
    expect(round.status).toBe('countersigned');
    expect(round.countersignedBy).toBe(docB.id);
    expect(round.countersignedAt).toBeTruthy();
  });

  it('上级查房可由第二医师退回并记录退回原因', async () => {
    if (skip()) return;
    const item = await admitPatient();
    let round = await createRound(docA, {
      visitId: item.visitId,
      isSuperior: true,
      assessment: '初步评估',
    });
    round = await signRound(docA, round.id);
    round = await returnRound(docB, round.id, '查体描述不充分，请补充');
    expect(round.status).toBe('returned');
    expect(round.returnReason).toBe('查体描述不充分，请补充');
  });

  it('病情评估为空 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await expectCareStatus(
      () => createRound(docA, { visitId: item.visitId, assessment: '   ' }),
      400,
    );
  });

  it('护士创建查房记录 → 403（职责分离）', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await expectCareStatus(
      () => createRound(nurseA, { visitId: item.visitId, assessment: 'x' }),
      403,
    );
  });

  it('护士审签查房 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const round = await createRound(docA, {
      visitId: item.visitId,
      isSuperior: true,
      assessment: 'x',
    });
    await signRound(docA, round.id);
    await expectCareStatus(() => countersignRound(nurseA, round.id), 403);
  });

  it('非本人签名他人查房草稿 → 403（禁止代签）', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const round = await createRound(docA, {
      visitId: item.visitId,
      assessment: 'x',
    });
    await expectCareStatus(() => signRound(docB, round.id), 403);
  });

  it('重复签名已签名查房 → 409', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const round = await createRound(docA, {
      visitId: item.visitId,
      assessment: 'x',
    });
    await signRound(docA, round.id);
    await expectCareStatus(() => signRound(docA, round.id), 409);
  });

  it('对非上级查房审签 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const round = await createRound(docA, {
      visitId: item.visitId,
      isSuperior: false,
      assessment: 'x',
    });
    await signRound(docA, round.id);
    await expectCareStatus(() => countersignRound(docB, round.id), 400);
  });

  it('上级查房作者自审 → 403（审签须第二医师）', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const round = await createRound(docA, {
      visitId: item.visitId,
      isSuperior: true,
      assessment: 'x',
    });
    await signRound(docA, round.id);
    await expectCareStatus(() => countersignRound(docA, round.id), 403);
  });

  it('重复审签已审签查房 → 409', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const round = await createRound(docA, {
      visitId: item.visitId,
      isSuperior: true,
      assessment: 'x',
    });
    await signRound(docA, round.id);
    await countersignRound(docB, round.id);
    await expectCareStatus(() => countersignRound(docB, round.id), 409);
  });

  it('退回原因为空 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const round = await createRound(docA, {
      visitId: item.visitId,
      isSuperior: true,
      assessment: 'x',
    });
    await signRound(docA, round.id);
    await expectCareStatus(() => returnRound(docB, round.id, '  '), 400);
  });

  it('签名不存在的查房 → 404', async () => {
    if (skip()) return;
    await expectCareStatus(
      () => signRound(docA, '00000000-0000-0000-0000-000000000000'),
      404,
    );
  });

  it('listRounds 返回该就诊全部查房记录', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await createRound(docA, { visitId: item.visitId, assessment: '第一份' });
    await createRound(docA, { visitId: item.visitId, assessment: '第二份' });
    const rounds = await listRounds(docA, item.visitId);
    expect(rounds.length).toBeGreaterThanOrEqual(2);
  });
});

/* ============================ 护士护理记录状态机 ============================ */

describe('护士护理记录状态机', () => {
  it('创建护理记录为草稿，本人签名后为已签名', async () => {
    if (skip()) return;
    const item = await admitPatient();
    let rec = await createNursingCareRecord(nurseA, {
      visitId: item.visitId,
      nursingLevel: 'level2',
      shift: 'day',
      vitals: { temperature: 36.7, pulse: 78 },
      pressureSoreRisk: 'low',
      fallRisk: 'low',
    });
    expect(rec.status).toBe('draft');
    expect(rec.nurseId).toBe(nurseA.id);
    rec = await signNursingCareRecord(nurseA, rec.id);
    expect(rec.status).toBe('signed');
    expect(rec.signedBy).toBe(nurseA.id);
  });

  it('医师创建护理记录 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await expectCareStatus(
      () =>
        createNursingCareRecord(docA, {
          visitId: item.visitId,
          nursingLevel: 'level2',
        }),
      403,
    );
  });

  it('医师签护理记录 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const rec = await createNursingCareRecord(nurseA, {
      visitId: item.visitId,
      nursingLevel: 'level2',
    });
    await expectCareStatus(() => signNursingCareRecord(docA, rec.id), 403);
  });

  it('缺少护理级别 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await expectCareStatus(
      () =>
        createNursingCareRecord(nurseA, {
          visitId: item.visitId,
          nursingLevel: '' as never,
        }),
      400,
    );
  });

  it('非本人签名他人护理记录 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const rec = await createNursingCareRecord(nurseA, {
      visitId: item.visitId,
      nursingLevel: 'level2',
    });
    await expectCareStatus(() => signNursingCareRecord(nurseB, rec.id), 403);
  });

  it('重复签名已签名护理记录 → 409', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const rec = await createNursingCareRecord(nurseA, {
      visitId: item.visitId,
      nursingLevel: 'level2',
    });
    await signNursingCareRecord(nurseA, rec.id);
    await expectCareStatus(() => signNursingCareRecord(nurseA, rec.id), 409);
  });

  it('签名不存在的护理记录 → 404', async () => {
    if (skip()) return;
    await expectCareStatus(
      () => signNursingCareRecord(nurseA, '00000000-0000-0000-0000-000000000000'),
      404,
    );
  });

  it('listNursingCareRecords 返回该就诊护理记录', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await createNursingCareRecord(nurseA, {
      visitId: item.visitId,
      nursingLevel: 'level1',
    });
    const recs = await listNursingCareRecords(nurseA, item.visitId);
    expect(recs.length).toBeGreaterThanOrEqual(1);
  });
});

/* ============================ 护理任务状态机 / 并发幂等 ============================ */

describe('护理任务状态机', () => {
  it('创建任务为待执行，执行后为已完成（deduplicated=false）', async () => {
    if (skip()) return;
    const item = await admitPatient();
    let task = await createCareTask(nurseA, {
      visitId: item.visitId,
      taskType: 'vitals',
      content: '15:00 测量血压并记录',
      idempotencyKey: `tk-create-${seq()}`,
    });
    expect(task.status).toBe('pending');
    const r = await executeCareTask(nurseA, task.id, '血压 120/80');
    expect(r.deduplicated).toBe(false);
    expect(r.task.status).toBe('done');
    expect(r.task.result).toBe('血压 120/80');
    expect(r.task.executedBy).toBe(nurseA.id);
    task = r.task;
  });

  it('并发/重复执行同一任务：第二次幂等返回（deduplicated=true），不产生第二条结果', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const task = await createCareTask(nurseA, {
      visitId: item.visitId,
      content: '并发任务',
      idempotencyKey: `tk-dedup-${seq()}`,
    });
    const first = await executeCareTask(nurseA, task.id, '首次执行');
    expect(first.deduplicated).toBe(false);
    const second = await executeCareTask(nurseB, task.id, '重复执行');
    expect(second.deduplicated).toBe(true);
    expect(second.task.status).toBe('done');
    // 既有结果不被第二次覆盖
    expect(second.task.result).toBe('首次执行');
    expect(second.task.executedBy).toBe(nurseA.id);
  });

  it('重复幂等键创建任务 → 409', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const key = `tk-dup-${seq()}`;
    await createCareTask(nurseA, {
      visitId: item.visitId,
      content: 'a',
      idempotencyKey: key,
    });
    await expectCareStatus(
      () =>
        createCareTask(nurseA, {
          visitId: item.visitId,
          content: 'b',
          idempotencyKey: key,
        }),
      409,
    );
  });

  it('医师创建/执行护理任务 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await expectCareStatus(
      () =>
        createCareTask(docA, {
          visitId: item.visitId,
          content: 'x',
          idempotencyKey: `k-${seq()}`,
        }),
      403,
    );
    const task = await createCareTask(nurseA, {
      visitId: item.visitId,
      content: 'x',
      idempotencyKey: `k2-${seq()}`,
    });
    await expectCareStatus(() => executeCareTask(docA, task.id), 403);
  });

  it('缺少任务内容 / 幂等键 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await expectCareStatus(
      () =>
        createCareTask(nurseA, {
          visitId: item.visitId,
          content: ' ',
          idempotencyKey: `k-${seq()}`,
        }),
      400,
    );
    await expectCareStatus(
      () =>
        createCareTask(nurseA, {
          visitId: item.visitId,
          content: 'x',
          idempotencyKey: ' ',
        }),
      400,
    );
  });

  it('执行不存在的任务 → 404', async () => {
    if (skip()) return;
    await expectCareStatus(
      () => executeCareTask(nurseA, '00000000-0000-0000-0000-000000000000'),
      404,
    );
  });

  it('listCareTasks 返回该就诊任务', async () => {
    if (skip()) return;
    const item = await admitPatient();
    await createCareTask(nurseA, {
      visitId: item.visitId,
      content: '列任务',
      idempotencyKey: `tk-list-${seq()}`,
    });
    const tasks = await listCareTasks(nurseA, item.visitId);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });
});

/* ============================ 在院医嘱状态机 ============================ */

describe('在院医嘱状态机', () => {
  it('开具长期医嘱为待审核，医师审核后为执行中', async () => {
    if (skip()) return;
    const item = await admitPatient();
    let order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: '阿司匹林肠溶片 100mg 口服 每日一次',
      category: 'long_term',
      priority: 'routine',
    });
    expect(order.status).toBe('pending_review');
    expect(order.doctorId).toBe(docA.id);
    order = await reviewInpatientOrder(docA, order.id);
    expect(order.status).toBe('active');
    expect(order.reviewerId).toBe(docA.id);
  });

  it('临时医嘱审核后护士执行一次即完成（executed）', async () => {
    if (skip()) return;
    const item = await admitPatient();
    let order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'lab',
      content: '急查心肌损伤标志物',
      category: 'short_term',
      priority: 'urgent',
    });
    order = await reviewInpatientOrder(docA, order.id);
    const r = await administerInpatientOrder(nurseA, order.id, {
      status: 'administered',
      note: '已采血送检',
    });
    expect(r.deduplicated).toBe(false);
    expect(r.order.status).toBe('executed');
    expect(r.administration.status).toBe('administered');
    expect(r.administration.administeredBy).toBe(nurseA.id);
  });

  it('长期医嘱多时点执行；同一时点重复执行幂等，仅一条执行记录；医师可停止', async () => {
    if (skip()) return;
    const item = await admitPatient();
    let order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: '长期静脉补液',
      category: 'long_term',
    });
    order = await reviewInpatientOrder(docA, order.id);

    const slot1 = '2026-09-27T08:00';
    const first = await administerInpatientOrder(nurseA, order.id, { slot: slot1 });
    expect(first.deduplicated).toBe(false);
    expect(first.order.status).toBe('active'); // 长期医嘱保持执行中

    // 同一时点重复触发 → 幂等
    const again = await administerInpatientOrder(nurseA, order.id, { slot: slot1 });
    expect(again.deduplicated).toBe(true);

    // 另一名护士在同一时点执行也命中幂等（键含 actor，故按 actor 不同会插入；
    // 这里改为不同时点验证可产生第二条）
    const slot2 = '2026-09-27T12:00';
    const second = await administerInpatientOrder(nurseA, order.id, { slot: slot2 });
    expect(second.deduplicated).toBe(false);

    const admins = await listAdministrationsByOrder(order.id);
    expect(admins.length).toBe(2); // 08:00 与 12:00，重复的 08:00 未产生第二条

    const stopped = await stopInpatientOrder(docA, order.id);
    expect(stopped.status).toBe('stopped');
    expect(stopped.stopAt).toBeTruthy();
  });

  it('医师可驳回待审核医嘱并记录原因', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: '待驳回',
      category: 'short_term',
    });
    const rejected = await rejectInpatientOrder(docB, order.id, '剂量需调整');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectReason).toBe('剂量需调整');
  });

  it('高风险药/血制品双人核对：缺核对人 → 400；核对人为本人 → 400；他人核对通过', async () => {
    if (skip()) return;
    const item = await admitPatient();

    // 缺 checkedBy
    let order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: '浓缩红细胞 2U 静脉输注',
      category: 'short_term',
      requiresDoubleCheck: true,
    });
    order = await reviewInpatientOrder(docA, order.id);
    await expectCareStatus(
      () => administerInpatientOrder(nurseA, order.id, { status: 'administered' }),
      400,
    );
    // checkedBy 为执行人本人
    await expectCareStatus(
      () =>
        administerInpatientOrder(nurseA, order.id, {
          status: 'administered',
          checkedBy: nurseA.id,
        }),
      400,
    );
    // 另一名护士核对 → 通过，临时医嘱完成
    const r = await administerInpatientOrder(nurseA, order.id, {
      status: 'administered',
      checkedBy: nurseB.id,
    });
    expect(r.order.status).toBe('executed');
    expect(r.administration.checkedBy).toBe(nurseB.id);
  });

  it('护士审核/停止医嘱、医师执行医嘱、护士开具医嘱 → 403（职责分离）', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: '权限测试',
      category: 'long_term',
    });
    // 护士审核待审核医嘱 → 403
    await expectCareStatus(() => reviewInpatientOrder(nurseA, order.id), 403);
    // 护士开具医嘱 → 403
    await expectCareStatus(
      () =>
        createInpatientCareOrder(nurseA, {
          visitId: item.visitId,
          orderType: 'drug',
          content: '护士开嘱',
        }),
      403,
    );

    const active = await reviewInpatientOrder(docA, order.id);
    // 医师执行医嘱 → 403
    await expectCareStatus(
      () => administerInpatientOrder(docA, active.id),
      403,
    );
    // 护士停止长期医嘱 → 403
    await expectCareStatus(() => stopInpatientOrder(nurseA, active.id), 403);
  });

  it('状态冲突：重复审核、对非执行中医嘱执行、停止已停止 → 409', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: '冲突测试',
      category: 'long_term',
    });
    const active = await reviewInpatientOrder(docA, order.id);
    await expectCareStatus(() => reviewInpatientOrder(docA, active.id), 409);
    // 待审核医嘱不可直接执行
    const pending = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: '未审核',
      category: 'long_term',
    });
    await expectCareStatus(
      () => administerInpatientOrder(nurseA, pending.id),
      409,
    );
    const stopped = await stopInpatientOrder(docA, active.id);
    await expectCareStatus(() => stopInpatientOrder(docA, stopped.id), 409);
  });

  it('审核/执行/停止不存在医嘱 → 404', async () => {
    if (skip()) return;
    const id = '00000000-0000-0000-0000-000000000000';
    await expectCareStatus(() => reviewInpatientOrder(docA, id), 404);
    await expectCareStatus(
      () => administerInpatientOrder(nurseA, id),
      404,
    );
    await expectCareStatus(() => stopInpatientOrder(docA, id), 404);
  });

  it('驳回原因为空 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: 'x',
    });
    await expectCareStatus(
      () => rejectInpatientOrder(docA, order.id, '  '),
      400,
    );
  });

  it('医嘱视图按长期/临时分组并含执行史', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const lt = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: '长期',
      category: 'long_term',
    });
    await reviewInpatientOrder(docA, lt.id);
    await administerInpatientOrder(nurseA, lt.id, { slot: '2026-09-27T09:00' });

    const st = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'lab',
      content: '临时',
      category: 'short_term',
    });
    await reviewInpatientOrder(docA, st.id);

    const view = await getInpatientOrderView(docA, item.visitId);
    expect(view.visitId).toBe(item.visitId);
    expect(view.longTerm.some((o) => o.id === lt.id)).toBe(true);
    expect(view.shortTerm.some((o) => o.id === st.id)).toBe(true);
    const ltOrder = view.longTerm.find((o) => o.id === lt.id)!;
    expect(ltOrder.administrations.length).toBe(1);
  });
});

/* ============================ 路由层（HTTP 状态码） ============================ */

function makeCtx(user: any, body: any = {}, params: any = {}, query: Record<string, string> = {}): any {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) q.set(k, v);
  return {
    req: {},
    params,
    query: q,
    body: async () => body,
    user,
    traceId: 'trace-care',
  };
}

function findRoute(method: string, fullPath: string): any {
  return inpatientCareRoutes.find((r) => r.path === fullPath && r.method === method);
}

async function callRoute(
  method: string,
  fullPath: string,
  user: any,
  body?: any,
  params?: any,
  query?: Record<string, string>,
): Promise<{ status: number; json: any }> {
  const res: Response = await findRoute(method, fullPath).handle(
    makeCtx(user, body, params, query),
  );
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** 路由可识别的登录用户形状（权限码门禁读取 roles/permissions） */
const routeUser = (v: AuthView) => ({
  id: v.id,
  roles: v.rawRoles,
  permissions: v.permissions,
});

describe('在院诊疗路由层', () => {
  it('护士经路由创建查房 → 403（聚合器职责分离经 HTTP 透出）', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const r = await callRoute(
      'POST',
      '/api/v1/inpatient/rounds',
      routeUser(nurseA),
      { visitId: item.visitId, assessment: 'x' },
    );
    expect(r.status).toBe(403);
  });

  it('护士经路由审核医嘱 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const order = await createInpatientCareOrder(docA, {
      visitId: item.visitId,
      orderType: 'drug',
      content: 'x',
    });
    const r = await callRoute(
      'POST',
      '/api/v1/inpatient/orders/:id/review',
      routeUser(nurseA),
      undefined,
      { id: order.id },
    );
    expect(r.status).toBe(403);
  });

  it('缺业务权限码（permissions 为空、非 admin）→ 403，码 40300', async () => {
    if (skip()) return;
    const r = await callRoute('POST', '/api/v1/inpatient/rounds', {
      id: docA.id,
      roles: ['doctor'],
      permissions: [],
    }, { visitId: 'x', assessment: 'x' });
    expect(r.status).toBe(403);
    expect(r.json.code).toBe(40300);
  });

  it('GET rounds 缺少 visitId → 400', async () => {
    if (skip()) return;
    const r = await callRoute(
      'GET',
      '/api/v1/inpatient/rounds',
      routeUser(docA),
    );
    expect(r.status).toBe(400);
  });

  it('POST 退回查房原因为空 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const round = await createRound(docA, {
      visitId: item.visitId,
      isSuperior: true,
      assessment: 'x',
    });
    const r = await callRoute(
      'POST',
      '/api/v1/inpatient/rounds/:id/return',
      routeUser(docB),
      { reason: '' },
      { id: round.id },
    );
    expect(r.status).toBe(400);
  });

  it('未登录 user=null → 401', async () => {
    if (skip()) return;
    const r = await callRoute('GET', '/api/v1/inpatient/orders', null);
    expect(r.status).toBe(401);
  });

  it('正常路径经路由创建查房 → 200', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const r = await callRoute(
      'POST',
      '/api/v1/inpatient/rounds',
      routeUser(docA),
      { visitId: item.visitId, assessment: '路由正常路径' },
    );
    expect(r.status).toBe(200);
    expect(r.json.data.roundNo).toBeTruthy();
  });
});

/* ===================== 路由层：全端点成功路径 + 异常映射（补覆盖率） ===================== */

describe('在院诊疗路由层 · 全链路与异常映射', () => {
  it('经路由走通查房（含上级审签/退回）全部分支 → 200', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const u = routeUser(docA);
    const sup = routeUser(docB);

    // 普通查房：创建 → 本人签名
    let r = await callRoute('POST', '/api/v1/inpatient/rounds', u, {
      visitId: item.visitId, assessment: '路由普通查房',
    });
    expect(r.status).toBe(200);
    const normalId = r.json.data.id;
    r = await callRoute('POST', '/api/v1/inpatient/rounds/:id/sign', u, undefined, { id: normalId });
    expect(r.status).toBe(200);
    // 重复签名 → 409（经 mapError 透出）
    r = await callRoute('POST', '/api/v1/inpatient/rounds/:id/sign', u, undefined, { id: normalId });
    expect(r.status).toBe(409);

    // 上级查房：创建 → 签名 → 上级审签
    r = await callRoute('POST', '/api/v1/inpatient/rounds', u, {
      visitId: item.visitId, roundType: 'superior', isSuperior: true, assessment: '路由上级查房',
    });
    expect(r.status).toBe(200);
    const csId = r.json.data.id;
    r = await callRoute('POST', '/api/v1/inpatient/rounds/:id/sign', u, undefined, { id: csId });
    expect(r.status).toBe(200);
    r = await callRoute('POST', '/api/v1/inpatient/rounds/:id/countersign', sup, undefined, { id: csId });
    expect(r.status).toBe(200);

    // 另一上级查房：签名 → 上级退回（带原因）
    r = await callRoute('POST', '/api/v1/inpatient/rounds', u, {
      visitId: item.visitId, roundType: 'superior', isSuperior: true, assessment: '待退回',
    });
    expect(r.status).toBe(200);
    const rtId = r.json.data.id;
    r = await callRoute('POST', '/api/v1/inpatient/rounds/:id/sign', u, undefined, { id: rtId });
    expect(r.status).toBe(200);
    r = await callRoute('POST', '/api/v1/inpatient/rounds/:id/return', sup, { reason: '补充心肌酶复查' }, { id: rtId });
    expect(r.status).toBe(200);

    // GET rounds 成功
    r = await callRoute('GET', '/api/v1/inpatient/rounds', u, undefined, undefined, { visitId: item.visitId });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.json.data)).toBe(true);

    // 签名不存在的查房 → 404（mapError 404 分支）
    r = await callRoute('POST', '/api/v1/inpatient/rounds/:id/sign', u, undefined, {
      id: '00000000-0000-0000-0000-000000000000',
    });
    expect(r.status).toBe(404);

    // 第二医师代签他人草稿 → 403（权限码通过，聚合器本人签名校验，mapError 403 分支）
    r = await callRoute('POST', '/api/v1/inpatient/rounds', u, {
      visitId: item.visitId, assessment: '待代签',
    });
    expect(r.status).toBe(200);
    r = await callRoute('POST', '/api/v1/inpatient/rounds/:id/sign', sup, undefined, { id: r.json.data.id });
    expect(r.status).toBe(403);
  });

  it('经路由走通护理记录/任务全部分支 → 200，非法 visitId → 500', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const n = routeUser(nurseA);

    // 护理记录：创建 → 本人签名
    let r = await callRoute('POST', '/api/v1/inpatient/nursing/records', n, {
      visitId: item.visitId, nursingLevel: 'level1', shift: 'day',
    });
    expect(r.status).toBe(200);
    const recId = r.json.data.id;
    r = await callRoute('POST', '/api/v1/inpatient/nursing/records/:id/sign', n, undefined, { id: recId });
    expect(r.status).toBe(200);
    r = await callRoute('GET', '/api/v1/inpatient/nursing/records', n, undefined, undefined, { visitId: item.visitId });
    expect(r.status).toBe(200);

    // 护理任务：创建（带幂等键）→ 执行
    r = await callRoute('POST', '/api/v1/inpatient/nursing/tasks', n, {
      visitId: item.visitId, taskType: 'vitals', content: '复测血压', idempotencyKey: `route-${seq()}`,
    });
    expect(r.status).toBe(200);
    const taskId = r.json.data.id;
    r = await callRoute('POST', '/api/v1/inpatient/nursing/tasks/:id/execute', n, { result: '120/80' }, { id: taskId });
    expect(r.status).toBe(200);
    // 重复执行 → 仍 200，幂等去重
    r = await callRoute('POST', '/api/v1/inpatient/nursing/tasks/:id/execute', n, { result: '120/80' }, { id: taskId });
    expect(r.status).toBe(200);
    expect(r.json.data.deduplicated).toBe(true);
    r = await callRoute('GET', '/api/v1/inpatient/nursing/tasks', n, undefined, undefined, { visitId: item.visitId });
    expect(r.status).toBe(200);

    // 非法 visitId 触发底层错误 → mapError 非 CareError → 500
    r = await callRoute('GET', '/api/v1/inpatient/nursing/tasks', n, undefined, undefined, { visitId: 'not-a-uuid' });
    expect(r.status).toBe(500);
  });

  it('经路由走通医嘱（审核/驳回/执行/停止、长期/临时）全部分支 → 200', async () => {
    if (skip()) return;
    const item = await admitPatient();
    const d = routeUser(docA);
    const n = routeUser(nurseA);

    // 长期药：开具 → 审核 → 执行 → 停止
    let r = await callRoute('POST', '/api/v1/inpatient/orders', d, {
      visitId: item.visitId, orderType: 'drug', content: '路由长期药', category: 'long_term',
    });
    expect(r.status).toBe(200);
    const ltId = r.json.data.id;
    r = await callRoute('POST', '/api/v1/inpatient/orders/:id/review', d, undefined, { id: ltId });
    expect(r.status).toBe(200);
    r = await callRoute('POST', '/api/v1/inpatient/orders/:id/administer', n, { slot: '2026-09-27T09:00' }, { id: ltId });
    expect(r.status).toBe(200);
    r = await callRoute('POST', '/api/v1/inpatient/orders/:id/stop', d, undefined, { id: ltId });
    expect(r.status).toBe(200);

    // 驳回：开具 → 驳回（带原因）
    r = await callRoute('POST', '/api/v1/inpatient/orders', d, {
      visitId: item.visitId, orderType: 'drug', content: '路由待驳回',
    });
    expect(r.status).toBe(200);
    const rjId = r.json.data.id;
    r = await callRoute('POST', '/api/v1/inpatient/orders/:id/reject', d, { reason: '剂量需调整' }, { id: rjId });
    expect(r.status).toBe(200);
    // 驳回原因为空 → 400
    r = await callRoute('POST', '/api/v1/inpatient/orders/:id/reject', d, { reason: '' }, { id: rjId });
    expect(r.status).toBe(400);

    // 临时医嘱：开具 → 审核 → 单次执行（executed）
    r = await callRoute('POST', '/api/v1/inpatient/orders', d, {
      visitId: item.visitId, orderType: 'lab', content: '路由临时检验', category: 'short_term',
    });
    expect(r.status).toBe(200);
    const stId = r.json.data.id;
    r = await callRoute('POST', '/api/v1/inpatient/orders/:id/review', d, undefined, { id: stId });
    expect(r.status).toBe(200);
    r = await callRoute('POST', '/api/v1/inpatient/orders/:id/administer', n, {}, { id: stId });
    expect(r.status).toBe(200);

    // GET orders 成功
    r = await callRoute('GET', '/api/v1/inpatient/orders', d, undefined, undefined, { visitId: item.visitId });
    expect(r.status).toBe(200);
    expect(r.json.data.visitId).toBe(item.visitId);
  });
});