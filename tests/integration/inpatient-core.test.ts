/**
 * 健澜科技 jlmedaios - 住院核心事务真实链路集成测试（M1-A）
 *
 * 直接对真实 PostgreSQL 运行住院聚合器（不经 mock），覆盖：
 *  - 读模型：床位图 / 在院列表 / 数据范围收敛；
 *  - 状态机：入院(分配) / 换床 / 转科 / 出院(释放) 的正常路径与全部错误分支
 *      （400 入参、403 数据范围越权、404 不存在、409 冲突）；
 *  - 床位维护：空闲/维护/隔离切换与占用床拒绝；
 *  - ADT 移动史：在院详情 movements 序列与出院后 404。
 *
 * 需要可用 PostgreSQL（DATABASE_URL）；无 DB 自动跳过（与 real-persistence 一致）。
 * 每个用例自清床位（出院），afterAll 兜底，保证在院/占用数回到运行前。
 *
 * 运行：bun test tests/integration/inpatient-core.test.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';

import {
  admit,
  changeBed,
  changeBedMaintenance,
  discharge,
  getBedMap,
  getInpatientDetail,
  listInpatients,
  transfer,
  type AdmitInput,
} from '../../src/bff/aggregators/inpatientAggregator.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  closeDbForTest,
  getDb,
  verifyDbConnection,
} from '../../src/db/pool.js';
import {
  getWardByCode,
} from '../../src/db/repositories/wardRepo.js';
import {
  getBedById,
  listBedsByWard,
} from '../../src/db/repositories/bedRepo.js';
import {
  createPatient,
} from '../../src/db/repositories/patientRepo.js';
import type { Ward } from '../../src/db/repositories/wardRepo.js';

let dbAvailable = false;
let admin: AuthView;
let cardioDoctor: AuthView; // 心血管内科 dept（doctor_chen）
let respDoctor: AuthView; // 呼吸内科 dept（doctor_lin）
let cardio: Ward;
let resp: Ward;

const tracked: string[] = [];
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** 经指定视图入院一个“一次性”患者（默认自动分床），返回在院列表项 */
async function admitPatient(
  view: AuthView,
  ward: Ward,
  opts: { bedId?: string; condition?: 'critical' | 'serious' | 'stable'; mrn?: string; tag?: string } = {},
): Promise<any> {
  const tag = opts.tag ?? 'UNIT';
  const input: AdmitInput = opts.mrn
    ? {
        mrn: opts.mrn,
        wardId: ward.id,
        ...(opts.bedId ? { bedId: opts.bedId } : {}),
        diagnosis: '单元测试住院（虚构）',
        condition: opts.condition ?? 'stable',
        admissionType: 'elective',
        source: 'other',
      }
    : {
        newPatient: {
          nameMasked: `单元*${seq().slice(-4)}`,
          gender: '未知',
          birthDate: null,
          tags: [tag],
        },
        wardId: ward.id,
        ...(opts.bedId ? { bedId: opts.bedId } : {}),
        diagnosis: '单元测试住院（虚构）',
        condition: opts.condition ?? 'stable',
        admissionType: 'elective',
        source: 'other',
      };
  const item = await admit(view, input);
  tracked.push(item.visitId);
  return item;
}

/** 兜底：出院仍在院的跟踪就诊（忽略错误） */
async function safeDischarge(view: AuthView, visitId: string): Promise<void> {
  try {
    await discharge(view, { visitId, reason: '单元测试兜底清理' });
  } catch {
    /* 已出院/不存在，忽略 */
  }
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
    cardioDoctor = await load('doctor_chen');
    respDoctor = await load('doctor_lin');
    cardio = (await getWardByCode('WARD-CARDIO-1'))!;
    resp = (await getWardByCode('WARD-RESP-1'))!;
    console.log('[test] PostgreSQL 可用，执行住院核心真实链路测试');
  } catch (e) {
    dbAvailable = false;
    console.log('[test] PostgreSQL 不可用，跳过住院核心测试', String(e));
  }
});

// 逐用例清床：每个用例结束即出院其创建的患者，使床位回到基线，避免病区空闲床被累积占满
afterEach(async () => {
  if (!dbAvailable) return;
  for (const v of tracked.splice(0)) await safeDischarge(admin, v);
});

afterAll(async () => {
  if (!dbAvailable) return;
  for (const v of tracked.splice(0)) await safeDischarge(admin, v);
  await closeDbForTest();
});

const skip = () => !dbAvailable;

/* ============================ 读模型 ============================ */

describe('住院读模型', () => {
  it('床位图返回院区/病区/床位且统计自洽', async () => {
    if (skip()) return;
    const map = await getBedMap(admin);
    expect(map.campuses.length).toBeGreaterThanOrEqual(2);
    expect(map.wards.length).toBeGreaterThanOrEqual(3);
    for (const w of map.wards) {
      const occ = w.beds.filter((b) => b.status === 'occupied').length;
      expect(w.stats.occupied).toBe(occ);
      expect(w.stats.total).toBe(w.beds.length);
    }
  });

  it('在院列表返回条目且 total 一致', async () => {
    if (skip()) return;
    const r = await listInpatients(admin);
    expect(Array.isArray(r.items)).toBe(true);
    expect(r.total).toBe(r.items.length);
  });

  it('数据范围收敛：dept 视图床位图仅含本科室病区', async () => {
    if (skip()) return;
    const map = await getBedMap(respDoctor);
    expect(map.wards.every((w) => w.department === '呼吸内科')).toBe(true);
    const r = await listInpatients(respDoctor);
    expect(r.items.every((p) => p.department === '呼吸内科')).toBe(true);
  });
});

/* ============================ 入院 admit ============================ */

describe('住院状态机 - 入院 admit', () => {
  it('新患者自动分床入院，床位被其占用', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    expect(item.visitId).toBeTruthy();
    expect(item.bedId).toBeTruthy();
    expect(item.department).toBe('心血管内科');
    const bed = await getBedById(item.bedId);
    expect(bed?.status).toBe('occupied');
    expect(bed?.currentVisitId).toBe(item.visitId);
  });

  it('指定空闲床入院成功', async () => {
    if (skip()) return;
    const free = (await listBedsByWard(cardio.id)).find((b) => b.status === 'available');
    expect(free).toBeTruthy();
    const item = await admitPatient(admin, cardio, { bedId: free!.id });
    expect(item.bedId).toBe(free!.id);
  });

  it('入院诊断为空 → 400', async () => {
    if (skip()) return;
    let e: any;
    try {
      await admit(admin, {
        newPatient: { nameMasked: 'x', gender: '未知' },
        wardId: cardio.id,
        diagnosis: '   ',
        condition: 'stable',
        admissionType: 'elective',
        source: 'other',
      });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(400);
  });

  it('病区不存在 → 400', async () => {
    if (skip()) return;
    let e: any;
    try {
      await admitPatient(admin, { id: '00000000-0000-0000-0000-000000000000' } as Ward);
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(400);
  });

  it('既有患者 mrn 不存在 → 400', async () => {
    if (skip()) return;
    let e: any;
    try {
      await admitPatient(admin, cardio, { mrn: `NOPE_${seq()}` });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(400);
  });

  it('既有患者按 mrn 入院成功', async () => {
    if (skip()) return;
    const p = await createPatient({
      mrn: `EXIST_${seq()}`,
      nameMasked: '既*有',
      gender: '男',
      tags: ['UNIT'],
    });
    const item = await admitPatient(admin, cardio, { mrn: p.mrn });
    expect(item.patientId).toBe(p.id);
  });

  it('同一患者重复入院 → 409', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    let e: any;
    try {
      await admitPatient(admin, cardio, { mrn: item.mrn });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(409);
  });

  it('跨科收治越权：呼吸科医生向心血管病区入院 → 403', async () => {
    if (skip()) return;
    let e: any;
    try {
      await admitPatient(respDoctor, cardio);
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(403);
  });
});

/* ============================ 换床 changeBed ============================ */

describe('住院状态机 - 换床 changeBed', () => {
  it('同病区换到另一空闲床，旧床释放、新床占用', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    const target = (await listBedsByWard(cardio.id)).find(
      (b) => b.status === 'available' && b.id !== item.bedId,
    );
    expect(target).toBeTruthy();
    const r = await changeBed(admin, {
      visitId: item.visitId,
      targetBedId: target!.id,
      reason: '单元测试换床',
    });
    expect(r.bedId).toBe(target!.id);
    const oldBed = await getBedById(item.bedId);
    expect(oldBed?.status).toBe('available');
    const newBed = await getBedById(target!.id);
    expect(newBed?.status).toBe('occupied');
  });

  it('目标床位在另一病区 → 400（应走转科）', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    const otherFree = (await listBedsByWard(resp.id)).find((b) => b.status === 'available');
    let e: any;
    try {
      await changeBed(admin, { visitId: item.visitId, targetBedId: otherFree!.id });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(400);
  });

  it('目标床位与当前相同 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    let e: any;
    try {
      await changeBed(admin, { visitId: item.visitId, targetBedId: item.bedId });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(400);
  });

  it('对不存在/非住院就诊换床 → 404', async () => {
    if (skip()) return;
    const free = (await listBedsByWard(cardio.id)).find((b) => b.status === 'available');
    let e: any;
    try {
      await changeBed(admin, {
        visitId: '00000000-0000-0000-0000-000000000000',
        targetBedId: free!.id,
      });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(404);
  });

  it('跨科换床越权：呼吸科医生调整心血管患者 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    const target = (await listBedsByWard(cardio.id)).find(
      (b) => b.status === 'available' && b.id !== item.bedId,
    );
    let e: any;
    try {
      await changeBed(respDoctor, { visitId: item.visitId, targetBedId: target!.id });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(403);
  });
});

/* ============================ 转科 transfer ============================ */

describe('住院状态机 - 转科 transfer', () => {
  it('心血管 → 呼吸，跨科分床，旧科室床释放', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    const r = await transfer(admin, {
      visitId: item.visitId,
      targetWardId: resp.id,
      reason: '单元测试转科',
    });
    expect(r.department).toBe('呼吸内科');
    expect(r.wardId).toBe(resp.id);
    expect(r.bedId).toBeTruthy();
    const oldBed = await getBedById(item.bedId);
    expect(oldBed?.status).toBe('available');
    const newBed = await getBedById(r.bedId!);
    expect(newBed?.status).toBe('occupied');
  });

  it('转科到本病区 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    let e: any;
    try {
      await transfer(admin, { visitId: item.visitId, targetWardId: cardio.id });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(400);
  });

  it('目标病区不存在 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    let e: any;
    try {
      await transfer(admin, {
        visitId: item.visitId,
        targetWardId: '00000000-0000-0000-0000-000000000000',
      });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(400);
  });

  it('指定目标床不属于目标病区 → 400', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    const cardioFree = (await listBedsByWard(cardio.id)).find((b) => b.status === 'available');
    let e: any;
    try {
      await transfer(admin, {
        visitId: item.visitId,
        targetWardId: resp.id,
        targetBedId: cardioFree!.id,
      });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(400);
  });

  it('对不存在就诊转科 → 404', async () => {
    if (skip()) return;
    let e: any;
    try {
      await transfer(admin, {
        visitId: '00000000-0000-0000-0000-000000000000',
        targetWardId: resp.id,
      });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(404);
  });

  it('跨科转科越权：呼吸科医生把心血管患者转科 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    let e: any;
    try {
      await transfer(respDoctor, { visitId: item.visitId, targetWardId: resp.id });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(403);
  });
});

/* ============================ 出院 discharge ============================ */

describe('住院状态机 - 出院 discharge', () => {
  it('出院返回 {visitId,dischargedAt,bedId}（无 movements）并释放床位', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, resp);
    const r = await discharge(admin, { visitId: item.visitId, reason: '单元测试出院' });
    expect(r.visitId).toBe(item.visitId);
    expect(typeof r.dischargedAt).toBe('string');
    expect(r.bedId).toBe(item.bedId);
    expect((r as any).movements).toBeUndefined();
    const bed = await getBedById(item.bedId);
    expect(bed?.status).toBe('available');
    expect(bed?.currentPatientId).toBeNull();
  });

  it('重复出院/已出院 → 404', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, resp);
    await discharge(admin, { visitId: item.visitId });
    let e: any;
    try {
      await discharge(admin, { visitId: item.visitId });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(404);
  });

  it('对不存在就诊出院 → 404', async () => {
    if (skip()) return;
    let e: any;
    try {
      await discharge(admin, { visitId: '00000000-0000-0000-0000-000000000000' });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(404);
  });

  it('跨科出院越权：呼吸科医生为心血管患者出院 → 403', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    let e: any;
    try {
      await discharge(respDoctor, { visitId: item.visitId });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(403);
  });
});

/* ====================== 床位维护 / ADT 移动史 ====================== */

describe('床位状态维护 changeBedMaintenance', () => {
  it('空闲床 → 维护 → 恢复空闲', async () => {
    if (skip()) return;
    const free = (await listBedsByWard(resp.id)).find((b) => b.status === 'available');
    expect(free).toBeTruthy();
    const m = await changeBedMaintenance(admin, {
      bedId: free!.id,
      status: 'maintenance',
      reason: '单元测试维护',
    });
    expect(m.status).toBe('maintenance');
    const a = await changeBedMaintenance(admin, { bedId: free!.id, status: 'available' });
    expect(a.status).toBe('available');
  });

  it('空闲床 → 隔离', async () => {
    if (skip()) return;
    const free = (await listBedsByWard(resp.id)).find((b) => b.status === 'available');
    const m = await changeBedMaintenance(admin, { bedId: free!.id, status: 'isolation' });
    expect(m.status).toBe('isolation');
    await changeBedMaintenance(admin, { bedId: free!.id, status: 'available' });
  });

  it('占用中床位拒绝状态变更（需先出院）', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, resp);
    let e: any;
    try {
      await changeBedMaintenance(admin, { bedId: item.bedId, status: 'maintenance' });
    } catch (err) {
      e = err;
    }
    expect(e?.name === 'BedAllocationError' || e?.status === 409 || e?.status === 400).toBe(true);
  });

  it('跨科调整床位状态越权 → 403', async () => {
    if (skip()) return;
    const free = (await listBedsByWard(cardio.id)).find((b) => b.status === 'available');
    let e: any;
    try {
      await changeBedMaintenance(respDoctor, { bedId: free!.id, status: 'maintenance' });
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(403);
  });
});

describe('ADT 移动史 getInpatientDetail', () => {
  it('入院+换床+转科后 movements 完整有序', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    const target = (await listBedsByWard(cardio.id)).find(
      (b) => b.status === 'available' && b.id !== item.bedId,
    );
    await changeBed(admin, { visitId: item.visitId, targetBedId: target!.id });
    await transfer(admin, { visitId: item.visitId, targetWardId: resp.id });
    const detail = await getInpatientDetail(admin, item.visitId);
    const types = detail.movements.map((m) => m.eventType);
    expect(types).toEqual(expect.arrayContaining(['admit', 'bed_change', 'transfer']));
    expect(types[0]).toBe('admit');
  });

  it('出院后详情 → 404', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, resp);
    await discharge(admin, { visitId: item.visitId });
    let e: any;
    try {
      await getInpatientDetail(admin, item.visitId);
    } catch (err) {
      e = err;
    }
    expect(e?.status).toBe(404);
  });

  it('跨科查看详情：记录被数据范围过滤 → 404（不向越权方暴露存在性）', async () => {
    if (skip()) return;
    const item = await admitPatient(admin, cardio);
    let e: any;
    try {
      await getInpatientDetail(respDoctor, item.visitId);
    } catch (err) {
      e = err;
    }
    // 读路径先按 DataScope 过滤，跨科记录不可见 → 404；写路径（换床/转科/出院）才返回 403
    expect(e?.status).toBe(404);
  });
});
