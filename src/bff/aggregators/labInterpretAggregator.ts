/**
 * 健澜科技 jlmedaios - 检验 AI 辅助解读聚合器（M3-E 规则 + M12-A LLM 叠加）
 *
 * 确定性规则引擎汇总一次就诊的检验结果（异常/危急值识别、确定性趋势），
 * 在此之上以可插拔方式叠加 LLM 深度解读。LLM 仅加叙述与结构化解释，不参与计算。
 *
 * 三态降级（医疗安全红线）：
 *  - llm_ok             ：配置且调用成功，deep_source='llm'；
 *  - llm_not_configured ：未配置 LLM_API_KEY，退回规则解读并明确标注（绝不冒充）；
 *  - llm_error          ：已配置但传输/解析失败，保留规则解读，deep_source='llm_fallback'。
 * mode='llm' 强制走 LLM，未配置/失败时明确报错，不假装成功。
 *
 * 铁律：AI 仅辅助，不做确定性诊断、不自主出报告；草稿须医师本人签名后生效。
 * 状态机 pending_review -> signed / rejected。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx } from '../../db/pool.js';
import {
  listLabResultsByVisit,
  listLabHistoryByPatient,
  upsertInterpretation,
  getByVisit,
  getById,
  listInterpretations,
  setStatus,
  type LabResultRow,
  type LabInterpretation,
  type LabInterpStatus,
} from '../../db/repositories/labInterpretRepo.js';
import {
  interpretLabResults,
  computeTrends,
  buildLabPrompt,
  parseLabLlmOutput,
  LlmShapeError,
  asAudience,
  asMode,
  type Audience,
  type InterpretMode,
  type DeepSource,
  type LlmStatus,
  type TrendPoint,
} from '../../medical-tools/interpret/interpretEngine.js';
import {
  chatCompletionJson,
  readLlmConfig,
  LlmNotConfiguredError,
  LlmTransportError,
} from '../../medical-tools/interpret/llmClient.js';

// re-export 纯函数，保持 M3-E 旧单测 `import { interpretLabResults } from labInterpretAggregator` 可用。
export { interpretLabResults, computeTrends };

export class LabInterpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LabInterpError';
  }
}
const badRequest = (m: string) => new LabInterpError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new LabInterpError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new LabInterpError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new LabInterpError(409, 'CONFLICT', m);
const serviceUnavailable = (code: string, m: string) => new LabInterpError(503, code, m);

const ENGINE_VERSION = 'lab-rule-1.0';

function canAccess(auth: AuthView, department: string): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return department === auth.deptName;
  }
  return false;
}

/* ------------------------------ LLM 叠加 ------------------------------ */

interface LlmOverlay {
  deepSource: DeepSource;
  llmStatus: LlmStatus;
  model: string | null;
  overallImpression: string | null;
  itemExplanations: Record<string, unknown>[];
  recommendations: Record<string, unknown>[];
  plainLanguageSummary: string | null;
  /** 追加到规则 summary 后的降级/标注说明。 */
  note: string;
}

function ruleOnlyOverlay(note: string): LlmOverlay {
  return {
    deepSource: 'rule',
    llmStatus: 'rule_only',
    model: null,
    overallImpression: null,
    itemExplanations: [],
    recommendations: [],
    plainLanguageSummary: null,
    note,
  };
}

/**
 * 尝试 LLM 叠加；按 mode 与三态返回叠加结果。
 * @throws {LabInterpError} mode='llm' 且未配置/失败时明确抛出（不降级冒充）。
 */
async function runLlmOverlay(
  results: LabResultRow[],
  trends: TrendPoint[],
  ruleSummary: string,
  abnormalItems: Record<string, unknown>[],
  criticalItems: Record<string, unknown>[],
  department: string,
  audience: Audience,
  mode: InterpretMode,
): Promise<LlmOverlay> {
  if (mode === 'rule') {
    return ruleOnlyOverlay('（本次按仅规则模式生成，未调用大模型。）');
  }

  const { system, user } = buildLabPrompt(
    {
      patientLabel: '',
      department,
      ruleSummary,
      abnormalItems,
      criticalItems,
      trends,
    },
    audience,
  );

  let raw: string;
  try {
    raw = await chatCompletionJson(system, user);
  } catch (err) {
    if (err instanceof LlmNotConfiguredError) {
      // auto：未配置 -> 规则解读 + 明确标注；mode='llm'：明确报错
      if (mode === 'llm') {
        throw serviceUnavailable('LLM_NOT_CONFIGURED', '未配置大模型（LLM_API_KEY），强制 LLM 模式无法生成');
      }
      return {
        ...ruleOnlyOverlay(''),
        deepSource: 'rule',
        llmStatus: 'llm_not_configured',
        note: '（未配置大模型，当前为规则引擎解读，无 AI 深度解读。）',
      };
    }
    // 传输错误
    if (mode === 'llm') {
      throw serviceUnavailable('LLM_ERROR', `大模型调用失败：${err instanceof Error ? err.message : String(err)}`);
    }
    return {
      ...ruleOnlyOverlay(''),
      deepSource: 'llm_fallback',
      llmStatus: 'llm_error',
      note: '（大模型暂不可用，已降级为规则引擎解读。）',
    };
  }

  // 解析（形状校验失败视为 LLM 侧错误）
  try {
    const parsed = parseLabLlmOutput(raw, audience);
    return {
      deepSource: 'llm',
      llmStatus: 'llm_ok',
      model: readLlmConfig().model,
      overallImpression: parsed.overallImpression || null,
      itemExplanations: parsed.itemExplanations,
      recommendations: parsed.recommendations,
      plainLanguageSummary: parsed.plainLanguageSummary || null,
      note: '（AI 辅助解读，须经医师复核签名后方可采信。）',
    };
  } catch (err) {
    if (!(err instanceof LlmShapeError)) throw err;
    if (mode === 'llm') {
      throw serviceUnavailable('LLM_ERROR', `大模型输出无法解析：${err.message}`);
    }
    return {
      ...ruleOnlyOverlay(''),
      deepSource: 'llm_fallback',
      llmStatus: 'llm_error',
      note: `（大模型输出格式异常，已降级为规则引擎解读：${err.message}）`,
    };
  }
}

/* ------------------------------- 业务流程 ------------------------------- */

/** 对就诊重新生成检验解读草稿（幂等，同 (visit_id, audience)）。 */
export async function generateForVisit(
  visitId: string,
  audienceRaw: unknown = 'doctor',
  modeRaw: unknown = 'auto',
  auth: AuthView,
): Promise<LabInterpretation> {
  const audience = asAudience(audienceRaw);
  const mode = asMode(modeRaw);
  const db = getDb();
  const visitRows = await db`
    SELECT v.id, v.patient_id, v.department FROM clinical.visits v WHERE v.id = ${visitId}
  `;
  if (visitRows.length === 0) throw notFound('就诊不存在');
  const visit = visitRows[0] as { patient_id: string; department: string };
  if (!canAccess(auth, visit.department)) throw forbidden('无权访问该科室病例');

  const results = await listLabResultsByVisit(visitId, db);
  if (results.length === 0) throw badRequest('该就诊暂无检验结果，无法生成解读');

  // 确定性规则 + 确定性趋势（数学在代码内完成）
  const out = interpretLabResults(results);
  const latestTime =
    results.map((r) => r.resultTime).filter((t): t is string => !!t).sort().at(-1) ??
    new Date().toISOString();
  const history = await listLabHistoryByPatient(String(visit.patient_id), latestTime, 500, db);
  const trends = computeTrends(history, results);

  const overlay = await runLlmOverlay(
    results,
    trends,
    out.summary,
    out.abnormalItems,
    out.criticalItems,
    visit.department,
    audience,
    mode,
  );

  const summary = overlay.note ? `${out.summary}${overlay.note}` : out.summary;

  return withTx(async (tx) =>
    upsertInterpretation(
      {
        visitId,
        patientId: String(visit.patient_id),
        department: visit.department,
        itemCount: out.itemCount,
        abnormalCount: out.abnormalCount,
        criticalCount: out.criticalCount,
        summary,
        abnormalItems: out.abnormalItems,
        criticalItems: out.criticalItems,
        engineVersion: ENGINE_VERSION,
        audience,
        overallImpression: overlay.overallImpression,
        itemExplanations: overlay.itemExplanations,
        trends: trends as unknown as Record<string, unknown>[],
        recommendations: overlay.recommendations,
        plainLanguageSummary: overlay.plainLanguageSummary,
        deepSource: overlay.deepSource,
        model: overlay.model,
        llmStatus: overlay.llmStatus,
      },
      tx,
    ),
  );
}

/** 查看某就诊解读草稿。 */
export async function getForVisit(
  visitId: string,
  audienceRaw: unknown = 'doctor',
  auth: AuthView,
): Promise<LabInterpretation> {
  const audience = asAudience(audienceRaw);
  const row = await getByVisit(visitId, audience);
  if (!row) throw notFound('该就诊尚未生成检验解读');
  if (!canAccess(auth, row.department)) throw forbidden('无权访问该科室病例');
  return row;
}

/** 解读草稿队列（按 DataScope 过滤，可按 audience 过滤）。 */
export async function listQueue(
  auth: AuthView,
  status: LabInterpStatus | null,
  audienceRaw: unknown = null,
) {
  const audience = audienceRaw == null ? null : asAudience(audienceRaw);
  const all = await listInterpretations(status, audience);
  return all.filter((r) => canAccess(auth, r.department));
}

/** 医师签名（pending_review -> signed）。 */
export async function signInterpretation(id: string, auth: AuthView): Promise<LabInterpretation> {
  const existing = await getById(id);
  if (!existing) throw notFound('解读记录不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权访问该科室病例');
  if (existing.status !== 'pending_review') throw conflict('仅待复核(pending_review)的解读可签名');
  const updated = await withTx(async (tx) =>
    setStatus(id, ['pending_review'], 'signed', { reviewedBy: auth.id }, tx),
  );
  if (!updated) throw conflict('解读状态已变更，请刷新');
  return updated;
}

/** 医师退回（pending_review -> rejected）。 */
export async function rejectInterpretation(
  id: string,
  auth: AuthView,
  reason: string,
): Promise<LabInterpretation> {
  const existing = await getById(id);
  if (!existing) throw notFound('解读记录不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权访问该科室病例');
  if (existing.status !== 'pending_review') throw conflict('仅待复核(pending_review)的解读可退回');
  if (!reason || !reason.trim()) throw badRequest('退回原因不能为空');
  const updated = await withTx(async (tx) =>
    setStatus(id, ['pending_review'], 'rejected', { rejectReason: reason.trim() }, tx),
  );
  if (!updated) throw conflict('解读状态已变更，请刷新');
  return updated;
}
