/**
 * 健澜科技 jlmedaios - 满意度评价聚合器（M3-O）
 *
 * 患者对就诊/问诊进行多维度满意度评价；医护查看统计。
 * 一次就诊/问诊仅可评价一次（部分唯一索引 + 冲突回查）。
 *
 * 安全约束：
 *  - 评分 1-5；visit/consult 至少关联一个；
 *  - 患者本人归属强校验（consultation_sessions.account_id 或 patient_profiles.account_id）；
 *  - 医护可代提交（权限码 + DataScope），审计哈希链留痕；
 *  - 评价提交后不可改。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash, randomUUID } from 'node:crypto';
import { withTx, getDb } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  insertSurvey,
  findSurveyForTarget,
  getSurveyById,
  listSurveys,
  getSurveyStats,
  type SatisfactionSurvey,
  type SatisfactionSource,
  type SatisfactionStats,
} from '../../db/repositories/satisfactionRepo.js';
import type { AuthView } from '../view/userView.js';

export class SatisfactionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SatisfactionError';
  }
}
const badRequest = (m: string) => new SatisfactionError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new SatisfactionError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new SatisfactionError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new SatisfactionError(409, 'CONFLICT', m);

const genSurveyNo = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `SV${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.floor(100000 + Math.random() * 900000)}`;
};

export interface SurveyScoresInput {
  patientId: string;
  visitId?: string | null;
  consultId?: string | null;
  sourceType?: SatisfactionSource;
  overallScore: number;
  medicalScore: number;
  serviceScore: number;
  environmentScore: number;
  processScore: number;
  waitScore: number;
  comment?: string | null;
}

const SCORE_FIELDS = [
  'overallScore', 'medicalScore', 'serviceScore',
  'environmentScore', 'processScore', 'waitScore',
] as const;

function assertScoreRange(input: SurveyScoresInput) {
  for (const f of SCORE_FIELDS) {
    const v = input[f];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) {
      throw badRequest(`${f} 必须为 1-5 的整数`);
    }
  }
}

/** 校验目标就诊/问诊存在，并返回推断的 sourceType。 */
async function resolveTarget(
  input: SurveyScoresInput,
): Promise<{ sourceType: SatisfactionSource; patientId: string }> {
  const hasVisit = Boolean(input.visitId);
  const hasConsult = Boolean(input.consultId);
  if (!hasVisit && !hasConsult) throw badRequest('必须关联就诊（visitId）或问诊（consultId）');

  if (hasConsult) {
    const rows = await getDb()`
      SELECT id, patient_id, account_id FROM clinical.consultation_sessions
       WHERE id = ${input.consultId}
    `;
    const session = rows[0] as Record<string, unknown> | undefined;
    if (!session) throw notFound('问诊会话不存在');
    if (String(session.patient_id) !== input.patientId) {
      throw badRequest('患者与问诊会话不匹配');
    }
    return { sourceType: 'consultation', patientId: String(session.patient_id) };
  }

  const rows = await getDb()`
    SELECT id, patient_id FROM clinical.visits WHERE id = ${input.visitId}
  `;
  const visit = rows[0] as Record<string, unknown> | undefined;
  if (!visit) throw notFound('就诊记录不存在');
  if (String(visit.patient_id) !== input.patientId) {
    throw badRequest('患者与就诊记录不匹配');
  }
  // 推断门诊/住院来源（显式传入优先）
  const sourceType: SatisfactionSource = input.sourceType ?? 'outpatient';
  return { sourceType, patientId: String(visit.patient_id) };
}

/**
 * 患者本人提交满意度评价。
 * 归属：问诊走 consultation_sessions.account_id；就诊走 patient_profiles.account_id。
 */
export async function submitMySurvey(
  auth: AuthView,
  input: SurveyScoresInput,
): Promise<{ survey: SatisfactionSurvey; created: boolean }> {
  assertScoreRange(input);
  const target = await resolveTarget(input);

  // 患者本人归属校验
  if (input.consultId) {
    const rows = await getDb()`
      SELECT account_id FROM clinical.consultation_sessions WHERE id = ${input.consultId}
    `;
    const session = rows[0] as Record<string, unknown> | undefined;
    if (!session || String(session.account_id) !== auth.id) {
      throw forbidden('仅本人可评价自己的问诊');
    }
  } else {
    const rows = await getDb()`
      SELECT 1 FROM clinical.patient_profiles
       WHERE account_id = ${auth.id} AND patient_id = ${target.patientId} LIMIT 1
    `;
    if (rows.length === 0) {
      throw forbidden('仅本人可评价自己的就诊');
    }
  }

  return withTx(async (tx) => {
    // 唯一冲突回查（同就诊/问诊已评价）
    const existing = await findSurveyForTarget(
      { visitId: input.visitId ?? null, consultId: input.consultId ?? null },
      tx,
    );
    if (existing) {
      return { survey: existing, created: false };
    }

    const survey = await insertSurvey(
      {
        surveyNo: genSurveyNo(),
        patientId: target.patientId,
        visitId: input.visitId ?? null,
        consultId: input.consultId ?? null,
        sourceType: target.sourceType,
        overallScore: input.overallScore,
        medicalScore: input.medicalScore,
        serviceScore: input.serviceScore,
        environmentScore: input.environmentScore,
        processScore: input.processScore,
        waitScore: input.waitScore,
        comment: input.comment ?? null,
        submittedBy: auth.id,
      },
      tx,
    );
    if (!survey) {
      // 并发下唯一索引兜底，回查既有
      const existing2 = await findSurveyForTarget(
        { visitId: input.visitId ?? null, consultId: input.consultId ?? null },
        tx,
      );
      if (existing2) return { survey: existing2, created: false };
      throw conflict('满意度评价提交失败，请重试');
    }

    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'satisfaction.submit',
        resourceType: 'satisfaction_survey',
        resourceId: survey.id,
        patientRef: target.patientId,
        result: 'success',
        riskLevel: 'low',
        detail: { surveyNo: survey.surveyNo, overall: survey.overallScore },
      },
      tx,
    );
    return { survey, created: true };
  });
}

/**
 * 医护代患者提交满意度评价（权限码 satisfaction:submit）。
 * 不做 account 归属校验（医护在职责范围内代录入），审计留痕。
 */
export async function submitSurveyByStaff(
  auth: AuthView,
  input: SurveyScoresInput,
): Promise<{ survey: SatisfactionSurvey; created: boolean }> {
  assertScoreRange(input);
  const target = await resolveTarget(input);
  return withTx(async (tx) => {
    const existing = await findSurveyForTarget(
      { visitId: input.visitId ?? null, consultId: input.consultId ?? null },
      tx,
    );
    if (existing) return { survey: existing, created: false };

    const survey = await insertSurvey(
      {
        surveyNo: genSurveyNo(),
        patientId: target.patientId,
        visitId: input.visitId ?? null,
        consultId: input.consultId ?? null,
        sourceType: target.sourceType,
        overallScore: input.overallScore,
        medicalScore: input.medicalScore,
        serviceScore: input.serviceScore,
        environmentScore: input.environmentScore,
        processScore: input.processScore,
        waitScore: input.waitScore,
        comment: input.comment ?? null,
        submittedBy: auth.id,
      },
      tx,
    );
    if (!survey) {
      const existing2 = await findSurveyForTarget(
        { visitId: input.visitId ?? null, consultId: input.consultId ?? null },
        tx,
      );
      if (existing2) return { survey: existing2, created: false };
      throw conflict('满意度评价提交失败，请重试');
    }
    await recordChainAudit(
      {
        actorId: auth.id,
        action: 'satisfaction.staff_submit',
        resourceType: 'satisfaction_survey',
        resourceId: survey.id,
        patientRef: target.patientId,
        result: 'success',
        riskLevel: 'low',
        detail: { surveyNo: survey.surveyNo, by: 'staff' },
      },
      tx,
    );
    return { survey, created: true };
  });
}

/** 患者：我的评价。 */
export async function listMySurveys(
  auth: AuthView,
): Promise<SatisfactionSurvey[]> {
  // 患者通过 patient_profiles 映射到自己的 patient_id 集合
  const profileRows = await getDb()`
    SELECT DISTINCT patient_id FROM clinical.patient_profiles WHERE account_id = ${auth.id}
  `;
  const patientIds = (profileRows as Record<string, unknown>[]).map((r) => String(r.patient_id));
  if (patientIds.length === 0) return [];
  const all = await listSurveys();
  return all.filter((s) => patientIds.includes(s.patientId));
}

/** 医护：评价列表（可按患者/来源过滤）。 */
export async function listSurveysForStaff(input: {
  patientId?: string;
  sourceType?: SatisfactionSource;
}): Promise<SatisfactionSurvey[]> {
  return listSurveys({
    patientId: input.patientId,
    sourceType: input.sourceType,
  });
}

export async function getSurveyDetail(
  id: string,
): Promise<SatisfactionSurvey> {
  const survey = await getSurveyById(id);
  if (!survey) throw notFound('评价不存在');
  return survey;
}

/** 满意度统计（医护/管理）。 */
export async function getSatisfactionStats(
  sourceType?: SatisfactionSource,
): Promise<SatisfactionStats> {
  return getSurveyStats(sourceType);
}

/* ========================================================================== */
/* M141-B · 匿名患者满意度调查（患者敢说真话）                                  */
/* -------------------------------------------------------------------------- */
/* 与上面 M3-O 的「登录后可定位患者」评价不同：                                 */
/*   - 不记录 patient_id 明文，仅存 visit_id 的 SHA-256 哈希（带盐）；         */
/*   - 六个维度：挂号便捷度/医生态度/护士态度/环境舒适度/等待时间/费用透明度；  */
/*   - 业务内核为纯函数：createSurvey / analyzeSatisfaction /                  */
/*     generateImprovementSuggestions；路由层只做参数收敛与 best-effort 落库。  */
/* ========================================================================== */

/** 六维度 key（与 clinical.satisfaction_survey 列名一一对应） */
export type SatisfactionDimensionKey =
  | 'registration_convenience'
  | 'doctor_attitude'
  | 'nurse_attitude'
  | 'environment_comfort'
  | 'wait_time'
  | 'cost_transparency';

/** 维度元数据：key + 中文标签（与 SQL CHECK 注释对齐） */
export const SATISFACTION_DIMENSIONS: ReadonlyArray<{
  key: SatisfactionDimensionKey;
  label: string;
}> = [
  { key: 'registration_convenience', label: '挂号便捷度' },
  { key: 'doctor_attitude', label: '医生态度' },
  { key: 'nurse_attitude', label: '护士态度' },
  { key: 'environment_comfort', label: '环境舒适度' },
  { key: 'wait_time', label: '等待时间' },
  { key: 'cost_transparency', label: '费用透明度' },
];

const DIMENSION_KEYS = SATISFACTION_DIMENSIONS.map((d) => d.key);

/** 匿名问卷骨架（患者扫码后看到的题目清单，不含任何身份字段） */
export interface SatisfactionQuestionnaire {
  /** 问卷实例 id（本次填写会话） */
  id: string;
  /** visit_id 的 SHA-256 哈希（带盐），服务端不存 visit_id 明文 */
  visitIdHash: string;
  /** 六道题（key + 中文标签 + 1-5 量表） */
  dimensions: Array<{
    key: SatisfactionDimensionKey;
    label: string;
    scaleMin: 1;
    scaleMax: 5;
  }>;
  /** 问卷生成时间 */
  createdAt: string;
}

/** 一条已提交的匿名问卷记录（进程内台账形态） */
export interface AnonymousSurveyRecord {
  id: string;
  visitIdHash: string;
  deptCode: string;
  scores: Record<SatisfactionDimensionKey, number>;
  comment: string;
  submittedAt: string;
}

/** 单维度分析结果 */
export interface DimensionAnalysis {
  key: SatisfactionDimensionKey;
  label: string;
  avgScore: number;
  count: number;
  /** 低分（≤2 分）条数，用于定位改进重点 */
  lowScoreCount: number;
}

/** 满意度分析报告（管理员查看） */
export interface SatisfactionAnalysis {
  /** 报告周期，格式 YYYY-MM */
  period: string;
  /** 科室过滤（可选，未传 = 全院） */
  deptCode?: string;
  /** 当期问卷总数 */
  totalSurveys: number;
  /** 六维整体均分（满分 5） */
  overallAvg: number;
  /** 分维度分析 */
  dimensions: DimensionAnalysis[];
  /** 均分低于阈值（< 3.5）的维度 key，按均分升序 */
  lowScoreDimensions: SatisfactionDimensionKey[];
}

/** 改进建议 */
export interface ImprovementSuggestion {
  dimension: SatisfactionDimensionKey;
  dimensionLabel: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

/** 进程内匿名问卷台账（报告在读索引；PostgreSQL 为持久化留痕，best-effort） */
const anonymousLedger = new Map<string, AnonymousSurveyRecord>();

/**
 * 【质量与安全】visit_id 哈希：SHA-256(盐 + visit_id)，不可逆。
 * 盐取自环境变量 SATISFACTION_HASH_SALT，缺省使用固定值（开发环境）；
 * 生产环境必须通过环境变量覆盖，避免彩虹表反推。
 */
function hashVisitId(visitId: string): string {
  const salt = process.env.SATISFACTION_HASH_SALT || 'jianlan-satisfaction-anonymous-v1';
  return createHash('sha256').update(`${salt}:${visitId}`).digest('hex');
}

/**
 * 纯函数 createSurvey(visitId)：为一次就诊生成匿名问卷骨架。
 *
 * 【质量与安全】患者敢说真话：
 *   - 不接收 patient_id，不记录 visit_id 明文，只产出 visit_id_hash；
 *   - 返回六道题（key + 中文标签 + 1-5 量表），前端据此渲染问卷；
 *   - 入参 visitId 不能为空（否则路由无法定位就诊）。
 *
 * 纯函数：不触库、不写台账，调用多少次都幂等。
 */
export function createSurvey(visitId: string): SatisfactionQuestionnaire {
  if (!visitId || typeof visitId !== 'string' || !visitId.trim()) {
    throw new Error('visitId 不能为空');
  }
  return {
    id: randomUUID(),
    visitIdHash: hashVisitId(visitId.trim()),
    dimensions: SATISFACTION_DIMENSIONS.map((d) => ({
      key: d.key,
      label: d.label,
      scaleMin: 1 as const,
      scaleMax: 5 as const,
    })),
    createdAt: new Date().toISOString(),
  };
}

/** 校验六维评分：必须为 1-5 整数，缺一不可 */
function assertScores(scores: Record<string, unknown>): Record<SatisfactionDimensionKey, number> {
  const out = {} as Record<SatisfactionDimensionKey, number>;
  for (const key of DIMENSION_KEYS) {
    const v = (scores as Record<string, unknown>)[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) {
      const label = SATISFACTION_DIMENSIONS.find((d) => d.key === key)?.label ?? key;
      throw new Error(`维度「${label}」评分必须为 1-5 的整数`);
    }
    out[key] = v;
  }
  return out;
}

/**
 * 路由层调用：患者提交一份匿名问卷。
 *
 * 流程：createSurvey(visitId) 拿 visit_id_hash → 校验六维评分 →
 *   写入进程内台账（按 visit_id_hash 去重，一次就诊仅一份）→ best-effort 落库。
 *
 * 纯函数部分（组包/校验）在 createSurvey / assertScores 内完成；
 * 本函数只做台账写入与持久化，不另写业务规则。
 */
export function submitAnonymousSurvey(input: {
  visitId: string;
  deptCode?: string;
  scores: Record<string, unknown>;
  comment?: string;
  /** 测试可注入提交时间；生产路由不传，默认 now() */
  submittedAt?: string;
}): AnonymousSurveyRecord {
  const draft = createSurvey(input.visitId);
  const scores = assertScores(input.scores);
  const record: AnonymousSurveyRecord = {
    id: randomUUID(),
    visitIdHash: draft.visitIdHash,
    deptCode: typeof input.deptCode === 'string' ? input.deptCode.trim() : '',
    scores,
    comment: typeof input.comment === 'string' ? input.comment.trim().slice(0, 1000) : '',
    submittedAt:
      typeof input.submittedAt === 'string' && input.submittedAt
        ? input.submittedAt
        : new Date().toISOString(),
  };
  // 一次就诊仅一份：同 hash 已存在则覆盖式更新（保留首条 submittedAt）
  const existing = [...anonymousLedger.values()].find((r) => r.visitIdHash === record.visitIdHash);
  if (existing) {
    anonymousLedger.set(existing.id, { ...record, id: existing.id, submittedAt: existing.submittedAt });
    return anonymousLedger.get(existing.id)!;
  }
  anonymousLedger.set(record.id, record);
  return record;
}

/** best-effort 落库匿名问卷；断库/表未迁移时静默降级，进程内台账仍可出报告 */
export async function persistAnonymousSurvey(record: AnonymousSurveyRecord): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.satisfaction_survey
        (id, visit_id_hash, dept_code,
         registration_convenience, doctor_attitude, nurse_attitude,
         environment_comfort, wait_time, cost_transparency,
         comment, submitted_at)
      VALUES
        (${record.id}, ${record.visitIdHash}, ${record.deptCode},
         ${record.scores.registration_convenience},
         ${record.scores.doctor_attitude},
         ${record.scores.nurse_attitude},
         ${record.scores.environment_comfort},
         ${record.scores.wait_time},
         ${record.scores.cost_transparency},
         ${record.comment}, ${record.submittedAt}::timestamptz)
      ON CONFLICT (visit_id_hash) DO NOTHING
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可出报告，落库留待重连后补写
  }
}

/** 校验周期格式 YYYY-MM */
function normalizePeriod(period: string): string {
  if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new Error(`period 必须为 YYYY-MM 格式，收到 ${String(period)}`);
  }
  return period;
}

/**
 * 纯函数 analyzeSatisfaction(period, dept?)：统计指定月份的满意度。
 *
 * 入参：
 *   - period：YYYY-MM；
 *   - dept：可选科室编码，未传 = 全院。
 *
 * 出参：
 *   - totalSurveys：当期问卷数；
 *   - overallAvg：六维整体均分（满分 5，保留两位小数）；
 *   - dimensions：分维度均分 + 低分（≤2）条数；
 *   - lowScoreDimensions：均分 < 3.5 的维度 key，按均分升序（最该先改的排前）。
 *
 * 纯函数：只读台账，不写、不回改。
 */
export function analyzeSatisfaction(
  period: string,
  dept?: string,
): SatisfactionAnalysis {
  const p = normalizePeriod(period);
  const deptCode = typeof dept === 'string' && dept.trim() ? dept.trim() : undefined;

  const inPeriod: AnonymousSurveyRecord[] = [];
  for (const r of anonymousLedger.values()) {
    if (!r.submittedAt.startsWith(p)) continue;
    if (deptCode && r.deptCode !== deptCode) continue;
    inPeriod.push(r);
  }

  const dimStats = new Map<SatisfactionDimensionKey, { sum: number; count: number; low: number }>();
  for (const key of DIMENSION_KEYS) {
    dimStats.set(key, { sum: 0, count: 0, low: 0 });
  }
  let grandSum = 0;
  let grandCount = 0;
  for (const r of inPeriod) {
    for (const key of DIMENSION_KEYS) {
      const v = r.scores[key];
      const s = dimStats.get(key)!;
      s.sum += v;
      s.count += 1;
      if (v <= 2) s.low += 1;
      grandSum += v;
      grandCount += 1;
    }
  }

  const dimensions: DimensionAnalysis[] = SATISFACTION_DIMENSIONS.map((d) => {
    const s = dimStats.get(d.key)!;
    return {
      key: d.key,
      label: d.label,
      avgScore: s.count > 0 ? Math.round((s.sum / s.count) * 100) / 100 : 0,
      count: s.count,
      lowScoreCount: s.low,
    };
  });

  const lowScoreDimensions = dimensions
    .filter((d) => d.count > 0 && d.avgScore < 3.5)
    .sort((a, b) => a.avgScore - b.avgScore)
    .map((d) => d.key);

  return {
    period: p,
    deptCode,
    totalSurveys: inPeriod.length,
    overallAvg: grandCount > 0 ? Math.round((grandSum / grandCount) * 100) / 100 : 0,
    dimensions,
    lowScoreDimensions,
  };
}

/**
 * 纯函数 generateImprovementSuggestions(lowScoreDimensions)：
 * 针对低分维度生成可落地的改进建议。
 *
 * 优先级：均分 < 3 为 high，3-3.5 为 medium。
 * 纯函数：不触库、不读台账，入参即出参。
 */
export function generateImprovementSuggestions(
  lowScoreDimensions: SatisfactionDimensionKey[],
): ImprovementSuggestion[] {
  const library: Record<SatisfactionDimensionKey, { suggestion: string }> = {
    registration_convenience: {
      suggestion:
        '优化挂号渠道：开放分时预约、扩充号源池、上线自助机/小程序一键挂号，减少现场排队与退号重挂。',
    },
    doctor_attitude: {
      suggestion:
        '开展医患沟通专项培训：落实首诊负责制、推行三分钟倾听制度、将患者评价纳入医师年度考核。',
    },
    nurse_attitude: {
      suggestion:
        '优化护理服务礼仪：推行床旁交接班主动问候、加强护理巡视频次、建立护理满意度科内月度复盘。',
    },
    environment_comfort: {
      suggestion:
        '改善就医环境：整治候诊区噪音与异味、升级座椅与饮水设施、加强卫生间清洁频次与指引标识。',
    },
    wait_time: {
      suggestion:
        '压缩等候时间：推行分时段就诊精准到 15 分钟、上线检查检验预约一体化、高峰时段增开诊室与采样窗口。',
    },
    cost_transparency: {
      suggestion:
        '强化费用透明：就诊前推送费用预估清单、住院一日清单主动推送、设立费用咨询窗口与异议快速响应通道。',
    },
  };

  const seen = new Set<SatisfactionDimensionKey>();
  const out: ImprovementSuggestion[] = [];
  for (const key of lowScoreDimensions) {
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = SATISFACTION_DIMENSIONS.find((d) => d.key === key);
    if (!meta) continue;
    // 入参不携带均分，按出现顺序排优先级（最前 = 最低分 = high）
    const priority: 'high' | 'medium' | 'low' =
      out.length === 0 ? 'high' : out.length === 1 ? 'medium' : 'low';
    out.push({
      dimension: key,
      dimensionLabel: meta.label,
      suggestion: library[key].suggestion,
      priority,
    });
  }
  return out;
}
