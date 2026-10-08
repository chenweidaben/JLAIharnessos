/**
 * 健澜科技 jlmedaios - LIS 检验全流程 集成测试（M11-A）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 申请 -> 生成标本 -> 采集 -> 签收 -> 建报告 -> 结果录入（危急值上报）->
 *    提交 -> 自审被拒（职责分离）-> 他人审核 -> 发布 -> 申请 completed；
 *  - 退回流程：提交 -> 退回 -> 重录修正 -> 重提 -> 审核 -> 发布；
 *  - 标本拒收流程；
 *  - 权限：护士录入 403、医生签收 403；路由未认证 401、不存在 404；
 *  - 申请号幂等。
 *
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 仅删除 M11A_TEST 前缀夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import {
  listPanelsView,
  listItemsView,
  createLabRequest,
  getLabRequestDetail,
  generateSpecimens,
  collectSpecimen,
  receiveSpecimen,
  rejectSpecimen,
  createLabReport,
  enterResults,
  submitReport,
  approveReport,
  returnReport,
  publishReport,
  getReportDetail,
} from '../../src/bff/aggregators/lisAggregator.js';
import { lisRoutes } from '../../src/bff/routes/lis.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorChen: AuthView;
let nurseMa: AuthView;
let techLab: AuthView;
let techLab2: AuthView;

const TAG = 'M11A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const patientIds: string[] = [];

async function panelIdByCode(code: string): Promise<string> {
  const rows = await getDb()`SELECT id FROM clinical.lab_panels WHERE code = ${code}`;
  if (rows.length === 0) throw new Error(`缺少种子面板 ${code}`);
  return String(rows[0].id);
}

async function itemIdByCode(code: string): Promise<string> {
  const rows = await getDb()`SELECT id FROM clinical.lab_items WHERE code = ${code}`;
  if (rows.length === 0) throw new Error(`缺少种子项目 ${code}`);
  return String(rows[0].id);
}

async function newPatientVisit() {
  const patient = await createPatient({
    mrn: `M11A${seq()}`,
    nameMasked: `检*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1975-01-01',
    tags: [TAG],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: '检验科',
    chiefComplaint: 'LIS 全流程测试',
  });
  return { patient, visit };
}

/** 申请 -> 生成标本 -> 采集 -> 签收，返回 req/specimen，供录入报告使用。 */
async function setupReceived(panelCode: string) {
  const { patient, visit } = await newPatientVisit();
  const panelId = await panelIdByCode(panelCode);
  const { req } = await createLabRequest(doctorChen, {
    requestNo: `M11A_TEST-LR${seq()}`,
    visitId: visit.id,
    urgency: 'routine',
    diagnosis: 'LIS 流程测试',
    items: [{ panelId }],
  });
  const gen = await generateSpecimens(techLab, req.id);
  expect(gen.specimens.length).toBe(1);
  await collectSpecimen(nurseMa, gen.specimens[0].id, { collectionSite: '静脉' });
  const received = await receiveSpecimen(techLab, gen.specimens[0].id);
  return { patient, visit, req, specimen: received, panelId };
}

function makeCtx(user: { id: string; roles?: string[] } | null): Ctx {
  return {
    user: user ? { ...user, roles: user.roles ?? ['admin'], permissions: [] } : null,
    query: new URLSearchParams(),
    params: {} as Record<string, string>,
    body: async () => ({}),
    headers: new Headers(),
    method: 'GET',
    path: '/',
  } as unknown as Ctx;
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
  nurseMa = await load('nurse_ma');
  techLab = await load('tech_lab');
  techLab2 = await load('tech_lab2');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`
      DELETE FROM clinical.critical_value_alerts a
      USING clinical.lab_results l
      WHERE a.lab_result_id = l.id
        AND l.patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M11A_TEST"]'::jsonb)`;
    await db`
      DELETE FROM clinical.lab_reports r
      USING clinical.lab_requests q, clinical.visits v, clinical.patients p
      WHERE r.request_id = q.id AND q.visit_id = v.id AND v.patient_id = p.id
        AND p.tags @> '["M11A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.lab_results l
      USING clinical.patients p
      WHERE l.patient_id = p.id AND p.tags @> '["M11A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.lab_requests q
      USING clinical.visits v, clinical.patients p
      WHERE q.visit_id = v.id AND v.patient_id = p.id AND p.tags @> '["M11A_TEST"]'::jsonb`;
    await db`
      DELETE FROM clinical.visits v USING clinical.patients p
      WHERE v.patient_id = p.id AND p.tags @> '["M11A_TEST"]'::jsonb`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M11A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M11-A LIS 全流程（真实 PostgreSQL）', () => {
  it('环境就绪：目录种子与角色权限', () => {
    expect(dbAvailable).toBe(true);
    expect(techLab.permissions).toContain('lis:enter');
    expect(techLab.permissions).toContain('lis:review');
    expect(techLab.permissions).toContain('lis:publish');
    expect(doctorChen.permissions).toContain('lis:request');
    expect(doctorChen.permissions).not.toContain('lis:enter');
    expect(nurseMa.permissions).toContain('lis:collect');
    expect(nurseMa.permissions).not.toContain('lis:receive');
  });

  it('目录：面板含项目映射', async () => {
    const panels = await listPanelsView();
    const cbc = panels.find((p) => p.code === 'CBC');
    expect(cbc).toBeDefined();
    expect(cbc!.items.map((i) => i.code).sort()).toEqual(['HGB', 'PLT', 'WBC']);
    const items = await listItemsView();
    expect(items.length).toBeGreaterThanOrEqual(13);
  });

  it('全流程：申请->采集->签收->录入->危急值->自审被拒->审核->发布->completed', async () => {
    const { patient, req, specimen, panelId } = await setupReceived('CBC');

    // 申请状态随流程推进
    let detail = await getLabRequestDetail(req.id);
    expect(detail.req.status).toBe('in_progress');
    expect(detail.specimens[0].status).toBe('received');

    // 建草稿报告
    const { report } = await createLabReport(techLab, req.id, { panelId });
    expect(report.status).toBe('draft');
    expect(report.enteredBy).toBe(techLab.id);

    // 结果录入：HGB 偏高 H、WBC 0.5 危急 LL、PLT 正常 N
    const hgb = await itemIdByCode('HGB');
    const wbc = await itemIdByCode('WBC');
    const plt = await itemIdByCode('PLT');
    const entered = await enterResults(techLab, report.id, {
      results: [
        { itemId: hgb, value: '180' },
        { itemId: wbc, value: '0.5' },
        { itemId: plt, value: '150' },
      ],
    });
    expect(entered.criticalCount).toBe(1);
    expect(entered.results.find((r) => r.itemCode === 'WBC')!.abnormalFlag).toBe('LL');
    expect(entered.results.find((r) => r.itemCode === 'HGB')!.abnormalFlag).toBe('H');

    // 标本上机后 tested
    expect(specimen.id).toBeTruthy();
    const db = getDb();
    const alerts = await db`
      SELECT a.id FROM clinical.critical_value_alerts a
      JOIN clinical.lab_results l ON l.id = a.lab_result_id
      WHERE l.patient_id = ${patient.id} AND l.item_code = 'WBC'`;
    expect(alerts.length).toBe(1);

    // 提交审核
    await submitReport(techLab, report.id);

    // 录入人自审被拒（职责分离 409）
    await expect(approveReport(techLab, report.id)).rejects.toMatchObject({ status: 409 });

    // 另一技师审核通过
    const approved = await approveReport(techLab2, report.id);
    expect(approved.status).toBe('approved');

    // 发布后申请 completed
    const published = await publishReport(techLab2, report.id);
    expect(published.status).toBe('published');
    detail = await getLabRequestDetail(req.id);
    expect(detail.req.status).toBe('completed');

    // 报告明细含三项目
    const repDetail = await getReportDetail(report.id);
    expect(repDetail.results.length).toBe(3);
  });

  it('退回流程：提交->退回->重录修正->重提->审核->发布', async () => {
    const { req, panelId } = await setupReceived('BIO');
    const { report } = await createLabReport(techLab, req.id, { panelId });
    const ctni = await itemIdByCode('cTnI');

    await enterResults(techLab, report.id, { results: [{ itemId: ctni, value: '0.6' }] });
    await submitReport(techLab, report.id);
    const ret = await returnReport(techLab2, report.id, { reason: '数值存疑，复查复查' });
    expect(ret.status).toBe('returned');

    // 退回后修正重录
    await enterResults(techLab, report.id, { results: [{ itemId: ctni, value: '0.02' }] });
    await submitReport(techLab, report.id);
    await approveReport(techLab2, report.id);
    const published = await publishReport(techLab2, report.id);
    expect(published.status).toBe('published');
    const repDetail = await getReportDetail(report.id);
    // 重录覆盖：同报告同项目只留一行
    expect(repDetail.results.filter((r) => r.itemCode === 'cTnI').length).toBe(1);
    expect(repDetail.results[0].value).toBe('0.02');
  });

  it('拒收流程：registered -> rejected', async () => {
    const { patient, visit } = await newPatientVisit();
    const panelId = await panelIdByCode('CBC');
    const { req } = await createLabRequest(doctorChen, {
      requestNo: `M11A_TEST-LR${seq()}`,
      visitId: visit.id,
      items: [{ panelId }],
    });
    const gen = await generateSpecimens(techLab, req.id);
    const rejected = await rejectSpecimen(techLab, gen.specimens[0].id, { reason: '标本溶血' });
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectReason).toBe('标本溶血');
  });

  it('申请号幂等：同一 requestNo 重复提交返回同一申请', async () => {
    const { visit } = await newPatientVisit();
    const panelId = await panelIdByCode('CBC');
    const requestNo = `M11A_TEST-LR${seq()}`;
    const first = await createLabRequest(doctorChen, {
      requestNo, visitId: visit.id, items: [{ panelId }],
    });
    expect(first.created).toBe(true);
    const second = await createLabRequest(doctorChen, {
      requestNo, visitId: visit.id, items: [{ panelId }],
    });
    expect(second.created).toBe(false);
    expect(second.req.id).toBe(first.req.id);
  });

  it('医疗安全：空报告不能提交审核（无结果→409）', async () => {
    const { req, panelId } = await setupReceived('CBC');
    const { report } = await createLabReport(techLab, req.id, { panelId });
    // 未录入任何结果直接提交，应被拒绝
    await expect(submitReport(techLab, report.id)).rejects.toMatchObject({ status: 409 });
  });

  it('权限：护士建报告 403；医生签收标本 403；不存在报告 404', async () => {
    const { req, panelId } = await setupReceived('CBC');
    await expect(
      createLabReport(nurseMa, req.id, { panelId }),
    ).rejects.toMatchObject({ status: 403 });
    // doctor 无 lis:receive
    await expect(
      receiveSpecimen(doctorChen, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      getReportDetail('00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('路由：未认证 401', async () => {
    const denied = await lisRoutes[0].handle(makeCtx(null));
    expect(denied.status).toBe(401);
  });
});
