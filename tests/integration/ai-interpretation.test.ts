/**
 * 健澜科技 jlmedaios - AI 智能解读集成测试（M12-A，真实 PostgreSQL）
 *
 * 直连真实库（TEST_REAL=1），自包含 M12A_TEST 夹具，afterAll 只删自己：
 *  - 检验：auto 生成 doctor/patient（未配置 LLM -> llm_not_configured 降级标注）、
 *    rule 强制（rule_only）、llm 强制未配置报 503、确定性趋势 rising、签名/退回、视角隔离；
 *  - 影像：未发布报告 409、已发布生成 200、签名/退回；
 *  - 越权 403 / 不存在 404 / 路由未认证 401。
 *
 * 医疗安全：测试中显式清空 LLM_API_KEY，验证"未配置即明确降级、绝不冒充 LLM"。
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
  generateForVisit,
  getForVisit,
  signInterpretation as signLab,
  rejectInterpretation as rejectLab,
} from '../../src/bff/aggregators/labInterpretAggregator.js';
import {
  generateForReport,
  signInterpretation as signImg,
  rejectInterpretation as rejectImg,
} from '../../src/bff/aggregators/imagingInterpretAggregator.js';
import { imagingInterpretRoutes } from '../../src/bff/routes/imagingInterpret.js';
import type { Ctx } from '../../src/bff/types.js';

const TAG = 'M12A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctorChen: AuthView;
let radDoc: AuthView;

// 夹具 ID
let patient1Id = '';
let visitOldId = '';
let visitCurId = '';
let patient2Id = '';
let visitRadId = '';
let reportDraftId = '';
let reportPublishedId = '';

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
  // 测试确定性：未配置 LLM，验证降级路径
  delete process.env.LLM_API_KEY;

  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  doctorChen = await load('doctor_chen');
  radDoc = await load('rad_doc');

  const db = getDb();
  // 患者 1：含历史批次（检验趋势用）
  const p1 = await createPatient({
    mrn: `M12A-${seq()}`, nameMasked: `解*${seq().slice(-4)}`, gender: '男',
    birthDate: '1980-01-01', tags: [TAG],
  });
  patient1Id = p1.id;
  const vOld = await createVisit({ patientId: p1.id, visitType: 'outpatient', department: '心血管内科' });
  visitOldId = vOld.id;
  const vCur = await createVisit({ patientId: p1.id, visitType: 'outpatient', department: '心血管内科' });
  visitCurId = vCur.id;

  // 历史批次：30 天前 WBC=9.0
  await db`
    INSERT INTO clinical.lab_results
      (visit_id, patient_id, item_name, item_code, value, numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time)
    VALUES
      (${visitOldId}, ${patient1Id}, '白细胞', 'WBC', '9.0', 9.0, '10^9/L', 3.5, 9.5, 'N', false, now() - interval '30 days')
  `;
  // 当前批次：WBC=12(H)、HGB=130(正常)、钾=6.5(HH 危急)
  await db`
    INSERT INTO clinical.lab_results
      (visit_id, patient_id, item_name, item_code, value, numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time)
    VALUES
      (${visitCurId}, ${patient1Id}, '白细胞', 'WBC', '12.0', 12.0, '10^9/L', 3.5, 9.5, 'H', false, now()),
      (${visitCurId}, ${patient1Id}, '血红蛋白', 'HGB', '130', 130, 'g/L', 120, 160, 'N', false, now()),
      (${visitCurId}, ${patient1Id}, '钾', 'K', '6.5', 6.5, 'mmol/L', 3.5, 5.0, 'HH', true, now())
  `;

  // 患者 2：放射科，含 draft + published 两份影像报告
  const p2 = await createPatient({
    mrn: `M12A-${seq()}`, nameMasked: `影*${seq().slice(-4)}`, gender: '女',
    birthDate: '1990-01-01', tags: [TAG],
  });
  patient2Id = p2.id;
  const vRad = await createVisit({ patientId: p2.id, visitType: 'outpatient', department: '放射科' });
  visitRadId = vRad.id;

  const draftRows = await db`
    INSERT INTO clinical.imaging_reports
      (visit_id, patient_id, modality, exam_name, body_part, findings, impression, status, report_time)
    VALUES
      (${visitRadId}, ${patient2Id}, 'CT', '头颅CT平扫', '头颅', '草稿所见', '草稿印象', 'draft', now())
    RETURNING id
  `;
  reportDraftId = String(draftRows[0].id);

  const pubRows = await db`
    INSERT INTO clinical.imaging_reports
      (visit_id, patient_id, modality, exam_name, body_part, findings, impression, status, report_time)
    VALUES
      (${visitRadId}, ${patient2Id}, 'CT', '胸部CT平扫', '胸部', '右肺上叶见小结节影', '考虑良性结节，建议随访', 'published', now())
    RETURNING id
  `;
  reportPublishedId = String(pubRows[0].id);
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.imaging_interpretations WHERE report_id IN (${reportDraftId}, ${reportPublishedId})`;
    await db`DELETE FROM clinical.imaging_reports WHERE id IN (${reportDraftId}, ${reportPublishedId})`;
    await db`DELETE FROM clinical.lab_interpretations WHERE visit_id IN (${visitOldId}, ${visitCurId})`;
    await db`DELETE FROM clinical.lab_results WHERE patient_id = ${patient1Id}`;
    await db`DELETE FROM clinical.visits WHERE id IN (${visitOldId}, ${visitCurId}, ${visitRadId})`;
    await db`DELETE FROM clinical.patients WHERE id IN (${patient1Id}, ${patient2Id})`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable || !realMode)('M12-A AI 智能解读（真实 PostgreSQL）', () => {
  it('环境就绪：角色权限按新契约授权', () => {
    expect(dbAvailable).toBe(true);
    expect(radDoc.permissions).toContain('imaging:interpret:view');
    expect(radDoc.permissions).toContain('imaging:interpret:sign');
    expect(doctorChen.permissions).toContain('lab:interpret:view');
    expect(doctorChen.permissions).toContain('imaging:interpret:sign');
    expect(admin.permissions).toContain('lab:interpret:sign');
  });

  it('检验 auto 生成：未配置 LLM 明确降级 + 趋势 rising', async () => {
    const row = await generateForVisit(visitCurId, 'doctor', 'auto', admin);
    expect(row.llmStatus).toBe('llm_not_configured');
    expect(row.deepSource).toBe('rule');
    expect(row.audience).toBe('doctor');
    expect(row.summary).toContain('未配置大模型');
    const wbc = row.trends.find((t) => (t as { code?: string }).code === 'WBC');
    expect(wbc).toBeDefined();
    expect((wbc as { direction: string }).direction).toBe('rising');
    expect(row.criticalCount).toBe(1);
  });

  it('视角隔离：patient 生成独立成行，doctor 行不受影响', async () => {
    const doc = await getForVisit(visitCurId, 'doctor', admin);
    expect(doc.audience).toBe('doctor');
    const pat = await generateForVisit(visitCurId, 'patient', 'rule', admin);
    expect(pat.audience).toBe('patient');
    expect(pat.llmStatus).toBe('rule_only');
    expect(pat.id).not.toBe(doc.id);
    const againDoc = await getForVisit(visitCurId, 'doctor', admin);
    expect(againDoc.status).toBe('pending_review');
  });

  it('检验 mode=llm 强制：未配置明确报 503，不假装成功', async () => {
    await expect(
      generateForVisit(visitCurId, 'doctor', 'llm', admin),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('检验签名/退回状态机', async () => {
    const doc = await getForVisit(visitCurId, 'doctor', admin);
    const signed = await signLab(doc.id, admin);
    expect(signed.status).toBe('signed');
    // 二次签名 409
    await expect(signLab(doc.id, admin)).rejects.toMatchObject({ status: 409 });

    const pat = await getForVisit(visitCurId, 'patient', admin);
    const rejected = await rejectLab(pat.id, admin, '草稿过于简略');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectReason).toBe('草稿过于简略');
  });

  it('影像：未发布(draft)报告解读 409', async () => {
    await expect(
      generateForReport(reportDraftId, 'doctor', 'auto', radDoc),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('影像：已发布报告生成 200 + 降级标注', async () => {
    const row = await generateForReport(reportPublishedId, 'doctor', 'auto', radDoc);
    expect(row.llmStatus).toBe('llm_not_configured');
    expect(row.deepSource).toBe('rule');
    expect(row.examName).toBe('胸部CT平扫');
    expect(row.overallDirection).toContain('良性结节');
  });

  it('影像：签名/退回状态机', async () => {
    const row = await generateForReport(reportPublishedId, 'patient', 'auto', radDoc);
    expect(row.audience).toBe('patient');
    const rejected = await rejectImg(row.id, radDoc, '患者端表述需复核');
    expect(rejected.status).toBe('rejected');

    const doc = await generateForReport(reportPublishedId, 'doctor', 'rule', radDoc);
    const signed = await signImg(doc.id, radDoc);
    expect(signed.status).toBe('signed');
  });

  it('越权 403 / 不存在 404', async () => {
    // 放射科技师访问心血管内科检验 -> 403
    await expect(
      generateForVisit(visitCurId, 'doctor', 'rule', radDoc),
    ).rejects.toMatchObject({ status: 403 });
    // 非放射科医生解读放射科报告 -> 403
    await expect(
      generateForReport(reportPublishedId, 'doctor', 'rule', doctorChen),
    ).rejects.toMatchObject({ status: 403 });
    // 不存在
    await expect(
      generateForVisit('00000000-0000-0000-0000-000000000000', 'doctor', 'rule', admin),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      generateForReport('00000000-0000-0000-0000-000000000000', 'doctor', 'rule', admin),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('路由：未认证 401', async () => {
    const denied = await imagingInterpretRoutes[0].handle(makeCtx(null));
    expect(denied.status).toBe(401);
  });
});
