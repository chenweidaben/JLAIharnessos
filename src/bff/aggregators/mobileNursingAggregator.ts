/**
 * 健澜科技 jlmedaios - 移动护理 PDA 执行端聚合器（M16-A）
 *
 * 床旁执行闭环，最大化复用既有住院护理/医嘱聚合器，不另起写路径：
 *  - 床位看板 getBedBoard            复用 listInpatients + 批量待办/最新风险；
 *  - 扫码 scanCode                   parseBarcode + 腕带/标本解析（DataScope 收敛）；
 *  - 核对 verifyMedication          五重核对 dry-run（不写）；
 *  - 给药 scanAndAdminister          五重核对不通过 409，通过复用 administerInpatientOrder；
 *  - 体征 captureVitals              复用 createNursingCareRecord（vitals）；
 *  - 任务执行 executeBedsideTask     复用 executeCareTask；
 *  - 评估 saveAssessment             纯评分 -> createNursingCareRecord（风险标记）；
 *  - 记录 createBedsideRecord        复用 createNursingCareRecord（措施/语音/模板）；
 *  - 交班 buildSbar / signSbar       聚合草稿（不签）-> 护理记录落库本人签名。
 *
 * 医疗安全：AI 仅辅助、不自主开医嘱/护理措施；所有写操作经护士本人；
 * 给药五重核对不通过即 409；高风险药双人核对由 administerInpatientOrder 强制。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getVisitById, type Visit } from '../../db/repositories/visitRepo.js';
import { getPatientById } from '../../db/repositories/patientRepo.js';
import { getOrderById } from '../../db/repositories/orderRepo.js';
import { listInpatients, type InpatientListItem } from './inpatientAggregator.js';
import {
  CareError,
  canAccessVisit,
  createCareTask,
  createNursingCareRecord,
  signNursingCareRecord,
  executeCareTask,
  administerInpatientOrder,
  type AdministerInput,
} from './inpatientCareAggregator.js';
import {
  countPendingTasksByVisits,
  getActiveDrugOrderByVisitAndCode,
  getInpatientVisitByNo,
  getLatestRiskByVisits,
  getSpecimenByNo,
  listSbarDeptRows,
} from '../../db/repositories/mobileNursingRepo.js';
import type { RiskLevel } from '../../db/repositories/nursingRepo.js';
import {
  buildSbarSections,
  painLevel,
  nutritionRisk,
  parseBarcode,
  scoreBarthel,
  scoreBraden,
  scoreMorse,
  verifyFiveRights,
  type FiveRightsInput,
  type FiveRightsResult,
} from '../../medical-tools/nursing/mobileNursing.js';

/* ------------------------------ 错误类型 ------------------------------ */

const badRequest = (m: string) => new CareError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new CareError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new CareError(403, 'FORBIDDEN', m);

/** 五重核对未通过：409，携带结构化 mismatches 供 PDA 提示 */
export class MobileVerifyError extends CareError {
  constructor(public checks: FiveRightsResult) {
    super(409, 'CONFLICT', `五重核对未通过：${checks.mismatches.join('；')}`);
    this.name = 'MobileVerifyError';
  }
}

/** 加载并校验在院住院就诊（含数据范围）；等价于住院护理聚合器内私有 loadInpatientVisit。 */
async function loadInpatientVisit(auth: AuthView, visitId: string): Promise<Visit> {
  const visit = await getVisitById(visitId);
  if (!visit || visit.visitType !== 'inpatient' || visit.status !== 'ongoing') {
    throw notFound('在院住院就诊不存在或已结束');
  }
  if (!canAccessVisit(auth, visit)) {
    throw forbidden('超出数据权限范围，无法操作该患者');
  }
  return visit;
}

/* ============================= 床位看板 =============================== */

export interface BedBoardItem extends InpatientListItem {
  pendingTaskCount: number;
  pressureSoreRisk: string;
  fallRisk: string;
}

/** 我的患者/床位看板：在院列表 + 待办任务数 + 最新压疮/跌倒风险标记。 */
export async function getBedBoard(
  auth: AuthView, dept?: string | null,
): Promise<{ items: BedBoardItem[]; total: number }> {
  const { items } = await listInpatients(auth, { department: dept ?? undefined });
  const visitIds = items.map((i) => i.visitId);
  const [pendingMap, riskMap] = await Promise.all([
    countPendingTasksByVisits(visitIds),
    getLatestRiskByVisits(visitIds),
  ]);
  const enriched: BedBoardItem[] = items.map((i) => ({
    ...i,
    pendingTaskCount: pendingMap.get(i.visitId) ?? 0,
    pressureSoreRisk: riskMap.get(i.visitId)?.pressureSoreRisk ?? 'none',
    fallRisk: riskMap.get(i.visitId)?.fallRisk ?? 'none',
  }));
  return { items: enriched, total: enriched.length };
}

/* ============================== 扫码 ================================= */

export interface ScanResult {
  kind: string;
  raw: string;
  visitId?: string;
  visitNo?: string;
  patientName?: string;
  bedNo?: string | null;
  department?: string;
  specimenNo?: string;
  specimenType?: string;
  specimenStatus?: string;
  drugCode?: string;
  resolvable?: boolean;
  order?: { orderId: string; orderNo: string; content: string; requiresDoubleCheck: boolean };
  hint?: string;
}

/** 扫码解析：腕带定位患者 / 标本定位 / 药品结合当前就诊定位 active 医嘱。 */
export async function scanCode(
  auth: AuthView, rawCode: string, visitId?: string | null,
): Promise<ScanResult> {
  const parsed = parseBarcode(rawCode);
  if (parsed.kind === 'wristband') {
    const wv = await getInpatientVisitByNo(parsed.value);
    if (!wv) throw notFound('腕带就诊不存在或已出院');
    if (!canAccessVisit(auth, { department: wv.department, attendingDoctorId: wv.attendingDoctorId })) {
      throw forbidden('超出数据权限范围，无法操作该患者');
    }
    return {
      kind: 'wristband', raw: parsed.raw, visitId: wv.visitId, visitNo: wv.visitNo,
      patientName: wv.patientName, bedNo: wv.bedNo, department: wv.department,
    };
  }
  if (parsed.kind === 'specimen') {
    const sp = await getSpecimenByNo(parsed.value);
    if (!sp) throw notFound('标本条码不存在');
    const visit = await getVisitById(sp.visitId);
    if (!visit || !canAccessVisit(auth, visit)) throw forbidden('超出数据权限范围');
    return {
      kind: 'specimen', raw: parsed.raw, visitId: sp.visitId, specimenNo: sp.specimenNo,
      specimenType: sp.specimenType, specimenStatus: sp.status,
    };
  }
  if (parsed.kind === 'drug') {
    if (visitId) {
      const ref = await getActiveDrugOrderByVisitAndCode(visitId, parsed.value);
      if (!ref) {
        return { kind: 'drug', raw: parsed.raw, drugCode: parsed.value, resolvable: false, hint: '该患者当前无此药品的 active 医嘱' };
      }
      return {
        kind: 'drug', raw: parsed.raw, drugCode: parsed.value, resolvable: true, visitId,
        order: { orderId: ref.orderId, orderNo: ref.orderNo, content: ref.content, requiresDoubleCheck: ref.requiresDoubleCheck },
      };
    }
    return { kind: 'drug', raw: parsed.raw, drugCode: parsed.value, resolvable: false, hint: '药品条码须结合当前在院就诊定位医嘱' };
  }
  throw badRequest('无法识别的条码，请核对后重试');
}

/* ============================ 五重核对 ================================= */

/** 由医嘱 + 现场扫码结果构建五重核对输入。 */
async function buildFiveRightsInput(
  auth: AuthView, orderId: string, scanned: FiveRightsInput['scanned'],
): Promise<{ result: FiveRightsResult; orderId: string }> {
  const order = await getOrderById(orderId);
  if (!order) throw notFound('医嘱不存在');
  const visit = await loadInpatientVisit(auth, order.visitId);
  const patient = await getPatientById(visit.patientId);
  const orderDrugCode = (order.detail?.drugCode as string | undefined) ?? null;
  const orderDose = (order.detail?.dose as string | undefined) ?? null;
  const result = verifyFiveRights({
    visit: { bedNo: visit.bedNo, patientName: patient?.nameMasked ?? null },
    order: { content: order.content, dose: orderDose, drugCode: orderDrugCode },
    scanned,
    now: new Date(),
  });
  return { result, orderId };
}

/** 核对 dry-run（不写库）。 */
export async function verifyMedication(
  auth: AuthView, orderId: string, scanned: FiveRightsInput['scanned'],
): Promise<FiveRightsResult & { orderId: string }> {
  const { result, orderId: oid } = await buildFiveRightsInput(auth, orderId, scanned);
  return { orderId: oid, ...result };
}

/** 扫码给药：先五重核对，不通过 409；通过则复用 administerInpatientOrder（双人核对/幂等/审计）。 */
export async function scanAndAdminister(
  auth: AuthView, orderId: string,
  body: FiveRightsInput['scanned'] & { slot?: string; checkedBy?: string | null; note?: string },
) {
  const { result } = await buildFiveRightsInput(auth, orderId, body);
  if (!result.allOk) throw new MobileVerifyError(result);
  const input: AdministerInput = {
    slot: body.slot,
    dose: body.dose ?? undefined,
    checkedBy: body.checkedBy ?? null,
    note: body.note,
  };
  return administerInpatientOrder(auth, orderId, input);
}

/* ============================= 体征采集 =============================== */

export interface VitalsInput {
  visitId: string;
  vitals: Record<string, unknown>;
  nursingLevel?: 'special' | 'level1' | 'level2' | 'level3';
  shift?: 'day' | 'night';
}

/** 床旁体征采集：体温/脉搏/呼吸/血压/血氧/血糖 -> 护理记录（vitals jsonb）。 */
export async function captureVitals(auth: AuthView, body: VitalsInput) {
  if (!body.visitId) throw badRequest('缺少 visitId');
  if (!body.vitals || Object.keys(body.vitals).length === 0) throw badRequest('体征数据不能为空');
  return createNursingCareRecord(auth, {
    visitId: body.visitId,
    nursingLevel: body.nursingLevel ?? 'level2',
    vitals: body.vitals,
    shift: body.shift ?? 'day',
  });
}

/* ============================ 护理任务执行 ============================ */

/** 床旁执行待办护理任务（复用 executeCareTask：CAS + 幂等 + 审计）。 */
export async function executeBedsideTask(auth: AuthView, taskId: string, resultText?: string) {
  if (!taskId) throw badRequest('缺少 taskId');
  return executeCareTask(auth, taskId, resultText);
}

/* ============================= 评估量表 ============================== */

export type AssessmentType = 'braden' | 'morse' | 'barthel' | 'pain' | 'nutrition';

export interface SaveAssessmentInput {
  visitId: string;
  type: AssessmentType;
  answers: Record<string, number | boolean | null>;
  nursingLevel?: 'special' | 'level1' | 'level2' | 'level3';
  shift?: 'day' | 'night';
}

/** 确定性评分 -> 护理记录（riskAssessment + 压疮/跌倒风险标记）。 */
export async function saveAssessment(auth: AuthView, body: SaveAssessmentInput) {
  if (!body.visitId) throw badRequest('缺少 visitId');
  let riskAssessment: Record<string, unknown> = {};
  let pressureSoreRisk: RiskLevel = 'none';
  let fallRisk: RiskLevel = 'none';

  switch (body.type) {
    case 'braden': {
      const r = scoreBraden(body.answers as never);
      pressureSoreRisk = r.band;
      riskAssessment = { braden: { score: r.score, level: r.level } };
      break;
    }
    case 'morse': {
      const r = scoreMorse(body.answers as never);
      fallRisk = r.band;
      riskAssessment = { morse: { score: r.score, level: r.level } };
      break;
    }
    case 'barthel': {
      const r = scoreBarthel(body.answers as never);
      riskAssessment = { barthel: { score: r.score, level: r.level } };
      break;
    }
    case 'pain': {
      const r = painLevel(Number(body.answers.score ?? 0));
      riskAssessment = { pain: { score: r.score, level: r.level } };
      break;
    }
    case 'nutrition': {
      const r = nutritionRisk(body.answers as never);
      riskAssessment = { nutrition: { score: r.score, highRisk: r.highRisk } };
      break;
    }
    default:
      throw badRequest(`未知评估类型：${String(body.type)}`);
  }

  return createNursingCareRecord(auth, {
    visitId: body.visitId,
    nursingLevel: body.nursingLevel ?? 'level2',
    riskAssessment,
    pressureSoreRisk,
    fallRisk,
    shift: body.shift ?? 'day',
  });
}

/* ============================ 护理记录录入 ============================ */

export interface BedsideRecordInput {
  visitId: string;
  measures?: string | null;
  voiceText?: string | null;
  template?: string | null;
  aiAssisted?: boolean;
  nursingLevel?: 'special' | 'level1' | 'level2' | 'level3';
  shift?: 'day' | 'night';
}

/** 床旁护理记录：快捷模板 + 语音录入（AI 仅辅助，护士签名生效）。 */
export async function createBedsideRecord(auth: AuthView, body: BedsideRecordInput) {
  if (!body.visitId) throw badRequest('缺少 visitId');
  const measures = body.measures ?? body.voiceText ?? body.template ?? null;
  if (!measures || !String(measures).trim()) throw badRequest('护理记录内容不能为空');
  return createNursingCareRecord(auth, {
    visitId: body.visitId,
    nursingLevel: body.nursingLevel ?? 'level2',
    measures: String(measures),
    aiAssisted: body.aiAssisted ?? false,
    shift: body.shift ?? 'day',
  });
}

/* ============================== 交接班 SBAR =========================== */

/** 聚合本班交班草稿（不签名、不落库）。 */
export async function buildSbar(
  auth: AuthView, query: { dept?: string | null; shift?: 'day' | 'night' },
) {
  // 数据范围收敛：非 all 强制本科室
  const dept = auth.dataScope === 'all' ? (query.dept ?? auth.deptName) : auth.deptName;
  const shift = query.shift ?? 'day';
  const rows = await listSbarDeptRows(dept);

  const highRiskPatients = rows.filter(
    (r) => (r.latestVitals.temp as number) >= 38 || r.pendingTasks > 0,
  );
  const S = `本班在院 ${rows.length} 人（${dept}，${shift === 'day' ? '白班' : '夜班'}）。`;
  const B = rows.slice(0, 20).map((r) => `${r.bedNo ?? '无床号'} ${r.patientName}`).join('、');
  const A = highRiskPatients.length > 0
    ? `需关注 ${highRiskPatients.length} 人：` + highRiskPatients.map((r) => `${r.bedNo ?? ''}${r.patientName}(待办${r.pendingTasks})`).join('、')
    : '本班暂无明显高危关注项。';
  const R = `待办护理任务合计 ${rows.reduce((s, r) => s + r.pendingTasks, 0)} 项；active 药品医嘱合计 ${rows.reduce((s, r) => s + r.activeDrugOrders, 0)} 条。`;

  return { dept, shift, sections: buildSbarSections({ situation: S, background: B, assessment: A, recommendation: R }), patients: rows };
}

export interface SignSbarInput {
  visitId: string;
  shift?: 'day' | 'night';
  sections: { S?: string; B?: string; A?: string; R?: string };
}

/** 以护理记录形式落 SBAR 并本人签名（signed）。 */
export async function signSbar(auth: AuthView, body: SignSbarInput) {
  if (!body.visitId) throw badRequest('缺少 visitId');
  const sections = buildSbarSections({
    situation: body.sections?.S, background: body.sections?.B,
    assessment: body.sections?.A, recommendation: body.sections?.R,
  });
  const record = await createNursingCareRecord(auth, {
    visitId: body.visitId,
    nursingLevel: 'level2',
    measures: `【SBAR交班】S：${sections.S} B：${sections.B} A：${sections.A} R：${sections.R}`,
    riskAssessment: { sbar: sections, shift: body.shift ?? 'day' },
    shift: body.shift ?? 'day',
  });
  const signed = await signNursingCareRecord(auth, record.id);
  if (!signed) throw forbidden('SBAR 交班须本人签名，不得代签');
  return signed;
}

/** 供路由层创建护理任务（PDA 床旁新增待办，可选）。 */
export async function createBedsideCareTask(
  auth: AuthView, input: Parameters<typeof createCareTask>[1],
) {
  return createCareTask(auth, input);
}
