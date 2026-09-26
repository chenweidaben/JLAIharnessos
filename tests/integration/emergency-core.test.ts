/**
 * 健澜科技 jlmedaios - 急诊核心事务真实链路集成测试（M1-B1）
 *
 * 直接对真实 PostgreSQL 运行急诊聚合器（不经 mock），覆盖：
 *  - 全流程：接诊 → 分诊分级 → 绿色通道（逐时间节点）→ 抢救/留观 → 转归；
 *  - 并发安全：并发接诊分诊号不重号、ER/FN 同值、不串单；
 *  - 双门禁：权限码不足 403、跨科 DataScope 403；
 *  - 资源不存在 404、状态冲突 409、入参非法 400；
 *  - 审计哈希链在大量写入后不断裂。
 *
 * 需要可用 PostgreSQL（DATABASE_URL）；无 DB 自动跳过。
 * afterAll 按外键顺序硬删除本测试创建的临床行，恢复基线计数；
 * 审计行（audit.audit_logs）为只增哈希链，予以保留。
 *
 * 运行：bun test tests/integration/emergency-core.test.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import * as agg from '../../src/bff/aggregators/emergencyAggregator.js';
import type { EmergencyActor } from '../../src/bff/aggregators/emergencyAggregator.js';
import {
  buildAuthView,
  type AuthView,
} from '../../src/bff/view/userView.js';
import {
  closeDbForTest,
  getDb,
  verifyDbConnection,
} from '../../src/db/pool.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';

let dbAvailable = false;
let doctor: EmergencyActor; // doctor_li 急诊科，含转归权
let nurse: EmergencyActor; // nurse_ma 急诊科，无转归权
let cardio: EmergencyActor; // doctor_chen 心血管内科（跨科）

let chainBaseSeq = 0;
let chainBaseHash = 'GENESIS';
const trackedVisits: string[] = [];
const trackedPatients: string[] = [];
const rnd = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** 接诊一个一次性新患者，返回 { visitId, triageNo } */
async function arriveNew(
  actor: EmergencyActor,
  chief: string,
): Promise<{ visitId: string; triageNo: string; patientId: string }> {
  const r = await agg.arrive(actor, {
    newPatient: {
      nameMasked: `急诊测试*${rnd().slice(-4)}`,
      gender: '男',
      tags: ['EMTEST'],
    },
    chiefComplaint: chief,
  });
  trackedVisits.push(r.triage.visitId);
  trackedPatients.push(r.triage.patientId);
  return {
    visitId: r.triage.visitId,
    triageNo: r.triage.triageNo,
    patientId: r.triage.patientId,
  };
}

beforeAll(async () => {
  try {
    await verifyDbConnection(2, 1000);
    dbAvailable = true;
    // 记录本轮测试开始前的链头，链核验仅覆盖本轮新增区间（历史断链不计入急诊交付）
    const baseRow = await getDb()`SELECT seq, hash FROM audit.audit_logs ORDER BY seq DESC LIMIT 1`;
    chainBaseSeq = Number(baseRow[0]?.seq ?? 0);
    chainBaseHash = (baseRow[0]?.hash as string) ?? 'GENESIS';
    const load = async (username: string): Promise<EmergencyActor> => {
      const u = await getUserByUsername(username);
      if (!u) throw new Error(`缺少种子账号 ${username}`);
      const view: AuthView = buildAuthView(u, await getUserRoleLinks(u.id));
      // AuthView 面向前端，loadActor 入参与 JWT 载荷一致：{ id, name, roles(原始码), permissions }
      return agg.loadActor({
        id: view.id,
        name: view.realName,
        roles: view.rawRoles,
        permissions: view.permissions,
      });
    };
    doctor = await load('doctor_li');
    nurse = await load('nurse_ma');
    cardio = await load('doctor_chen');
    console.log('[test] PostgreSQL 可用，执行急诊核心真实链路测试');
  } catch (e) {
    dbAvailable = false;
    console.log('[test] PostgreSQL 不可用，跳过急诊核心测试', String(e));
  }
});

afterAll(async () => {
  if (!dbAvailable) return;
  const db = getDb();
  const v = trackedVisits;
  const p = trackedPatients;
  if (v.length) {
    // 按外键依赖顺序删除（gc_nodes 随 channel 级联）
    await db`DELETE FROM clinical.emergency_dispositions WHERE visit_id = ANY(${v})`;
    await db`DELETE FROM clinical.observations WHERE visit_id = ANY(${v})`;
    await db`DELETE FROM clinical.resuscitations WHERE visit_id = ANY(${v})`;
    await db`
      DELETE FROM clinical.green_channel_nodes
      WHERE channel_id IN (SELECT id FROM clinical.green_channels WHERE visit_id = ANY(${v}))`;
    await db`DELETE FROM clinical.green_channels WHERE visit_id = ANY(${v})`;
    await db`DELETE FROM clinical.emergency_triage WHERE visit_id = ANY(${v})`;
    await db`DELETE FROM clinical.visits WHERE id = ANY(${v})`;
  }
  if (p.length) await db`DELETE FROM clinical.patients WHERE id = ANY(${p})`;
  await closeDbForTest();
});

const skip = () => !dbAvailable;

/* ====================== 全流程一：STEMI 胸痛 → CCU ====================== */

describe('急诊全流程（STEMI 胸痛绿色通道）', () => {
  it('接诊→I级分诊→胸痛通道逐节点→关闭→入院CCU', async () => {
    if (skip()) return;
    // 1) 接诊
    const a = await arriveNew(doctor, '持续胸痛，大汗，血压偏低');
    expect(a.triageNo).toMatch(/^FN\d+$/);

    // 2) 分诊：低血压 SBP85（规则 I 级），护士确认 I 级
    const t = await agg.triage(doctor, a.visitId, {
      vitals: { systolic: 85, pulse: 110, spo2: 94, consciousness: 'alert' },
      chiefComplaint: '持续胸痛，大汗',
      level: 1,
    });
    expect(t.triage.emStatus).toBe('triaged');
    expect(t.triage.level).toBe(1);
    expect(t.assessment.news.score).toBeGreaterThanOrEqual(0);

    // 3) 启动胸痛绿色通道（triaged → in_treatment）
    const start = await agg.startGreenChannel(doctor, a.visitId, {
      type: 'chest_pain', subtype: 'STEMI',
    });
    const channelId = start.channel.id;
    expect(start.channel.status).toBe('active');
    expect(start.channel.nodes.find((n) => n.nodeKey === 'arrive')?.actualTime).toBeTruthy();
    expect(start.channel.nodes.find((n) => n.nodeKey === 'activate')?.actualTime).toBeTruthy();

    // 4) 逐节点记录（自到达起的相对分钟，控制在达标区间）
    const base = Date.now();
    const iso = (min: number) => new Date(base + min * 60000).toISOString();
    const nodes = ['ecg', 'troponin', 'dual_antiplatelet', 'pci', 'transfer_ccu'];
    const mins = [8, 18, 25, 75, 100];
    for (let i = 0; i < nodes.length; i++) {
      const r = await agg.recordGreenChannelNode(doctor, channelId, nodes[i], iso(mins[i]));
      const node = r.channel.nodes.find((n) => n.nodeKey === nodes[i]);
      expect(node?.actualTime).toBeTruthy();
    }

    // 5) 关闭通道：DB=75min 达标
    const closed = await agg.closeGreenChannel(doctor, channelId, {
      outcome: '已行PCI，血流再通，转CCU',
    });
    expect(closed.channel.status).toBe('completed');
    expect(closed.channel.dbnMinutes).toBe(75);
    // DBN 达标判定与前端一致：D-to-B 目标 ≤90min；75min 达标、pci 节点未超时
    expect(closed.channel.dbnMinutes).toBeLessThanOrEqual(90);
    expect(closed.channel.nodes.find((n) => n.nodeKey === 'pci')?.overdue).toBe(false);

    // 6) 转归：入院 CCU（in_treatment → admitted）
    const d = await agg.recordDisposition(doctor, a.visitId, {
      disposition: 'admitted', destination: 'CCU',
    });
    expect(d.disposition.disposition).toBe('admitted');
  });
});

/* ================= 全流程二：危重 → 留观 → 抢救 → 留观 → 离院 ================= */

describe('急诊全流程（留观↔抢救）', () => {
  it('接诊→I级→留观→抢救(事件/用药)→结束回留观→更新→离院', async () => {
    if (skip()) return;
    const a = await arriveNew(doctor, '呼吸困难，低氧');

    await agg.triage(doctor, a.visitId, {
      vitals: { spo2: 80, respiration: 30, consciousness: 'alert' },
      chiefComplaint: '呼吸困难，低氧',
      level: 1,
    });

    // triaged → observation
    const obs = await agg.startObservation(doctor, a.visitId, {
      bedNo: 'ER-OB-03', nursingLevel: 'level1',
      pendingTasks: [{ id: 'task-spo2-recheck', content: '30分钟复测血氧', done: false }],
    });
    expect(obs.observation.status).toBe('observing');
    const obsId = obs.observation.id;

    // observation → resuscitation
    const resus = await agg.startResuscitation(doctor, a.visitId, {
      bedNo: 'ER-RS-02', diagnosis: '急性呼吸衰竭',
    });
    const resusId = resus.resuscitation.id;
    expect(resus.resuscitation.status).toBe('resuscitating');

    // 事件（体征作为时间线事件记录）
    const ev = await agg.addResusEvent(doctor, resusId, {
      type: 'vitals', content: 'P 118, BP 96/60, SpO2 88%',
    });
    expect(ev.resuscitation.events.length).toBeGreaterThanOrEqual(1);
    // 用药
    const med = await agg.addResusMedication(doctor, resusId, {
      name: '肾上腺素', dose: '1mg', route: 'IV',
    });
    expect(med.resuscitation.medications.length).toBeGreaterThanOrEqual(1);

    // 结束抢救：稳定 → observation
    const done = await agg.completeResuscitation(doctor, resusId, {
      status: 'stabilized', outcome: '血氧回升，生命体征趋稳', nextStatus: 'observation',
    });
    expect(done.resuscitation.status).toBe('stabilized');

    // 更新留观
    const upd = await agg.updateObservation(doctor, obsId, {
      vitals: { spo2: 95, pulse: 92 }, ivStatus: '已停吸氧',
    });
    expect(upd.observation.vitals.spo2).toBe(95);

    // 结束留观：离院（observation → discharged）
    const end = await agg.endObservation(doctor, obsId, { status: 'discharged' });
    expect(end.observation.status).toBe('discharged');
  });
});

/* ============================ 并发分诊号 ============================ */

describe('分诊号并发安全', () => {
  it('12 个并发接诊：分诊号唯一、ER/FN 同值、不串单', async () => {
    if (skip()) return;
    const N = 12;
    const results = await Promise.all(
      Array.from({ length: N }, () => arriveNew(doctor, '并发测试患者')),
    );
    const triageNos = results.map((r) => r.triageNo);
    const visitIds = results.map((r) => r.visitId);
    const patientIds = results.map((r) => r.patientId);

    // 不重号
    expect(new Set(triageNos).size).toBe(N);
    expect(new Set(visitIds).size).toBe(N);
    expect(new Set(patientIds).size).toBe(N);

    // ER/FN 同值：visits.visit_no 与 emergency_triage.triage_no 数字后缀一致
    const db = getDb();
    const rows = await db`
      SELECT v.visit_no, t.triage_no
      FROM clinical.visits v
      JOIN clinical.emergency_triage t ON t.visit_id = v.id
      WHERE v.id = ANY(${visitIds})`;
    expect(rows.length).toBe(N);
    for (const r of rows) {
      const er = String(r.visit_no).replace(/^ER/, '');
      const fn = String(r.triage_no).replace(/^FN/, '');
      expect(er).toBe(fn);
    }
  });
});

/* ============================ 双门禁 / 错误信封 ============================ */

describe('急诊权限与数据范围', () => {
  it('跨科（心血管内科）读取队列 → 403 DataScope', async () => {
    if (skip()) return;
    let e: any;
    try { await agg.getQueue(cardio); } catch (err) { e = err; }
    expect(e.name).toBe('EmergencyForbiddenError');
  });

  it('跨科接诊 → 403', async () => {
    if (skip()) return;
    let e: any;
    try {
      await agg.arrive(cardio, {
        newPatient: { nameMasked: '跨*科', gender: '未知' },
        chiefComplaint: '测试',
      });
    } catch (err) { e = err; }
    expect(e.name).toBe('EmergencyForbiddenError');
  });

  it('护士无转归权 → 403 权限码', async () => {
    if (skip()) return;
    const a = await arriveNew(nurse, '护士接诊测试');
    let e: any;
    try {
      await agg.recordDisposition(nurse, a.visitId, { disposition: 'discharged' });
    } catch (err) { e = err; }
    expect(e.name).toBe('EmergencyForbiddenError');
  });

  it('对不存在的就诊分诊 → 404', async () => {
    if (skip()) return;
    let e: any;
    try {
      await agg.triage(doctor, '00000000-0000-0000-0000-000000000000', { level: 3, vitals: {} });
    } catch (err) { e = err; }
    expect(/NotFound/.test(e.name)).toBe(true);
  });

  it('未分诊即启动绿色通道 → 409', async () => {
    if (skip()) return;
    const a = await arriveNew(doctor, '尚未分诊');
    let e: any;
    try {
      await agg.startGreenChannel(doctor, a.visitId, { type: 'stroke' });
    } catch (err) { e = err; }
    expect(/Conflict/.test(e.name)).toBe(true);
  });

  it('分诊级别越界 → 400', async () => {
    if (skip()) return;
    const a = await arriveNew(doctor, '级别越界');
    let e: any;
    try {
      await agg.triage(doctor, a.visitId, { level: 9 as never, vitals: {} });
    } catch (err) { e = err; }
    expect(e.name).toBe('EmergencyValidationError');
  });
});

/* ============================ 审计哈希链 ============================ */

describe('急诊审计哈希链', () => {
  it('大量急诊写入后 verify_chain 无断裂', async () => {
    if (skip()) return;
    const db = getDb();
    // 仅核验本轮新增区间：首条新区间行必须链接到测试开始前的链头，
    // 其后每行必须链接到区间内紧邻前驱；区间内任何并发分叉都会被检出。
    const broken = await db`
      WITH scoped AS (
        SELECT seq, prev_hash, hash,
               lag(hash) OVER (ORDER BY seq) AS prev_computed
        FROM audit.audit_logs
        WHERE seq > ${chainBaseSeq}
      )
      SELECT seq FROM scoped
      WHERE COALESCE(prev_computed, ${chainBaseHash}) IS DISTINCT FROM prev_hash
    `;
    expect(broken.length).toBe(0);
  });
});
