/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引 集成测试（M5-C）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock），覆盖：
 *  - 标识登记（哈希存储，仅留末四位，无明文）；重复登记幂等（返回 null）；
 *  - 扫描患者生成候选（姓名+性别+生日 80 分，当前唯一约束下自然产生）；
 *  - 确认候选建立逻辑链接（master 选择）；拒绝候选；
 *  - 重复确认已审核 → 409；已链接患者再确认 → 409；
 *  - 候选不存在 → 404；登记空值 → 400；
 *  - BFF 路由信封 401/403。
 *
 * 说明：patients.id_card_hash 与 patient_identifiers(domain,hash) 均有唯一
 * 约束，标识型重复（手机/身份证一致）在正常登记时即被拦截，属录入层防重；
 * 匹配引擎的标识评分逻辑由单测覆盖，本集成测试聚焦在约束下可自然产生的
 * 「姓名+性别+生日」候选及完整审核/链接流程。
 *
 * 隔离：记录全部患者，afterAll 删除（CASCADE 清理标识/候选/链接）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { afterAll, describe, expect, it } from 'bun:test';

import { verifyDbConnection } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { insertCandidate } from '../../src/db/repositories/empiRepo.js';
import {
  EmpiAggregatorError,
  confirmMatchCandidate,
  getPatientIdentifiers,
  listMatchCandidates,
  rejectMatchCandidate,
  registerPatientIdentifier,
  runEmpiScan,
} from '../../src/bff/aggregators/empiAggregator.js';
import { empiRoutes } from '../../src/bff/routes/empi.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let pharmacist: AuthView;

const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

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
  pharmacist = await load('pharmacist_wang');
}

async function mkPatient(
  idx: number,
  over: { nameMasked?: string; birthDate?: string } = {},
): Promise<string> {
  const p = await createPatient({
    mrn: `M5C${runId.slice(-4)}${idx}`,
    nameMasked: over.nameMasked ?? `M5C患者${idx}**`,
    gender: '男',
    birthDate: over.birthDate ?? '1980-06-15',
  });
  patientIds.push(p.id);
  return p.id;
}

/** 判断候选/链接的患者对是否等于 (x, y)（顺序无关）。 */
function samePair(
  c: { patientAId: string; patientBId: string },
  x: string,
  y: string,
): boolean {
  const pair = [c.patientAId, c.patientBId].sort().join('|');
  return pair === [x, y].sort().join('|');
}

afterAll(async () => {
  if (!dbAvailable) return;
  const { getDb } = await import('../../src/db/pool.js');
  const db = getDb();
  for (const id of patientIds) {
    await db`DELETE FROM clinical.patients WHERE id = ${id}`;
  }
  // runEmpiScan 为全库种子数据中的同名患者产生候选（集成测试副作用）。
  // 本测试是唯一调用 runEmpiScan 的地方，故在此清空候选表，避免跨运行累积
  // （empi_links 已随患者 CASCADE 删除，无候选被链接引用）。
  await db`DELETE FROM clinical.empi_match_candidates`;
});

if (!dbAvailable) {
  describe('EMPI 集成测试（数据库不可用，跳过）', () => {
    it('skip', () => expect(true).toBe(true));
  });
} else {
  describe('EMPI 全闭环', () => {
    let idA: string;
    let idB: string;
    let idC: string;
    let idE: string;
    let abCandidate: string;
    let rejectCandidateId: string;

    it('准备患者：A/B 姓名+性别+生日相同，C 独立', async () => {
      idA = await mkPatient(0, { nameMasked: 'M5C同**' });
      idB = await mkPatient(1, { nameMasked: 'M5C同**' });
      idC = await mkPatient(2, { nameMasked: 'M5C独**' });
      expect(idA).not.toBe(idB);
    });

    it('登记手机标识：哈希存储，仅留末四位', async () => {
      const created = await registerPatientIdentifier(admin, {
        patientId: idC, domain: 'phone', rawValue: `139${runId.slice(-8)}`,
      });
      expect(created).not.toBeNull();
      const idents = await getPatientIdentifiers(admin, idC);
      expect(idents.length).toBeGreaterThanOrEqual(1);
      for (const i of idents) {
        expect(i.identifierHash).toMatch(/^[0-9a-f]{64}$/);
        expect(i.identifierLast4).toHaveLength(4);
      }
    });

    it('同一患者重复登记同一手机 → 幂等返回 null', async () => {
      const again = await registerPatientIdentifier(admin, {
        patientId: idC, domain: 'phone', rawValue: `139${runId.slice(-8)}`,
      });
      expect(again).toBeNull();
    });

    it('扫描患者生成 A/B 候选（80 分）', async () => {
      const summary = await runEmpiScan(admin);
      expect(summary.scanned).toBeGreaterThanOrEqual(3);
      const pending = await listMatchCandidates(admin, { status: 'pending', patientId: idA });
      const mine = pending.filter((c) => samePair(c, idA, idB));
      expect(mine.length).toBe(1);
      abCandidate = mine[0].id;
      expect(mine[0].matchScore).toBe(80);
    }, 30000);

    it('重复扫描不重复生成候选', async () => {
      const before = await listMatchCandidates(admin, { status: 'pending', patientId: idA });
      await runEmpiScan(admin);
      const after = await listMatchCandidates(admin, { status: 'pending', patientId: idA });
      expect(after.length).toBe(before.length);
      // 全库 EMPI 扫描在真实数据量（数千患者、O(n²) 比对）下是重操作，给足时间。
    }, 30000);

    it('确认 A/B 候选，建立逻辑链接', async () => {
      const link = await confirmMatchCandidate(admin, abCandidate);
      const got = [link.masterPatientId, link.linkedPatientId].sort().join('|');
      expect(got).toBe([idA, idB].sort().join('|'));
    });

    it('已确认候选再次确认 → 409', async () => {
      await expect(
        confirmMatchCandidate(admin, abCandidate),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('与已 linked 患者确认候选 → 409（防链接冲突）', async () => {
      idE = await mkPatient(4, { nameMasked: 'M5C同**' });
      await runEmpiScan(admin);
      const pending = await listMatchCandidates(admin, { status: 'pending', patientId: idE });
      // A 是 master、B 是 linked；idE 与 B 的候选确认时，B 已存在链接 → 409
      const toLinked = pending.filter((c) => samePair(c, idE, idB));
      expect(toLinked).toHaveLength(1);
      await expect(
        confirmMatchCandidate(admin, toLinked[0].id),
      ).rejects.toMatchObject({ status: 409 });
    }, 30000);

    it('拒绝一个候选（C 与新患者 F，直接插入候选模拟）', async () => {
      const idF = await mkPatient(5, { nameMasked: 'M5C独**' });
      const inserted = await insertCandidate({
        patientAId: idC, patientBId: idF,
        matchScore: 75, matchReasons: ['测试拒绝'],
      });
      expect(inserted).not.toBeNull();
      rejectCandidateId = inserted!.id;
      const reviewed = await rejectMatchCandidate(admin, rejectCandidateId);
      expect(reviewed.status).toBe('rejected');
    });

    it('已拒绝候选再操作 → 409', async () => {
      await expect(
        rejectMatchCandidate(admin, rejectCandidateId),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('确认不存在的候选 → 404', async () => {
      await expect(
        confirmMatchCandidate(admin, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('错误类型为 EmpiAggregatorError', async () => {
      let caught: unknown = null;
      try {
        await confirmMatchCandidate(admin, '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(EmpiAggregatorError);
    });

    it('登记空标识值 → 400', async () => {
      await expect(
        registerPatientIdentifier(admin, {
          patientId: idC, domain: 'phone', rawValue: '   ',
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('BFF 路由信封：未认证 → 401', async () => {
      const route = empiRoutes.find(
        (r) => r.method === 'GET' && r.path === '/api/v1/empi/candidates',
      )!;
      const res = await route.handle({
        user: null,
        query: new URLSearchParams(),
        params: {},
      } as unknown as Ctx);
      expect(res.status).toBe(401);
    });

    it('BFF 路由：药师无 empi:write → 403', async () => {
      const route = empiRoutes.find(
        (r) => r.method === 'POST' && r.path === '/api/v1/empi/scan',
      )!;
      const res = await route.handle({
        user: { id: pharmacist.id, roles: pharmacist.rawRoles },
        params: {},
        body: async () => ({}),
      } as unknown as Ctx);
      expect(res.status).toBe(403);
    });
  });
}
