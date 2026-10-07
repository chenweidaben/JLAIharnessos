/**
 * 健澜科技 jlmedaios - 影像报告 AI 解读聚合器（M12-A）
 *
 * 仅对【已发布】的影像报告做 AI 辅助解读（草稿/过程稿一律 409，避免解读空报告）。
 * 规则兜底 + 可插拔 LLM 深度解读，三态降级同检验解读。
 *
 * 医疗安全红线：
 *  - AI 仅辅助，overall_direction 是"可能方向"而非诊断；
 *  - 解读草稿须医师签名后生效；签名即本人（对已发布报告的再解释，自签不禁止）；
 *  - 解读对象归属受 DataScope 限制（放射科），跨科室越权 403。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import {
  getImagingReport,
  upsertImagingInterpretation,
  getByReport,
  getById,
  listImagingInterpretations,
  setStatus,
  type ImagingInterpretation,
  type ImagingInterpStatus,
} from '../../db/repositories/imagingInterpretRepo.js';
import {
  buildImagingPrompt,
  parseImagingLlmOutput,
  LlmShapeError,
  asAudience,
  asMode,
  type Audience,
  type InterpretMode,
  type DeepSource,
  type LlmStatus,
} from '../../medical-tools/interpret/interpretEngine.js';
import {
  chatCompletionJson,
  readLlmConfig,
  LlmNotConfiguredError,
} from '../../medical-tools/interpret/llmClient.js';

export class ImagingInterpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ImagingInterpError';
  }
}
const badRequest = (m: string) => new ImagingInterpError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ImagingInterpError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new ImagingInterpError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new ImagingInterpError(409, 'CONFLICT', m);
const serviceUnavailable = (code: string, m: string) => new ImagingInterpError(503, code, m);

const INTERP_DEPARTMENT = '放射科';

function canAccess(auth: AuthView, department: string): boolean {
  if (auth.dataScope === 'all') return true;
  if (auth.dataScope === 'dept' || auth.dataScope === 'group') {
    return department === auth.deptName;
  }
  return false;
}

interface ImagingOverlay {
  deepSource: DeepSource;
  llmStatus: LlmStatus;
  model: string | null;
  explainedFindings: Record<string, unknown>[];
  overallDirection: string | null;
  recommendations: Record<string, unknown>[];
  plainLanguageSummary: string | null;
  note: string;
}

function ruleOnlyOverlay(): ImagingOverlay {
  return {
    deepSource: 'rule',
    llmStatus: 'rule_only',
    model: null,
    explainedFindings: [],
    overallDirection: null,
    recommendations: [],
    plainLanguageSummary: null,
    note: '',
  };
}

async function runImagingLlmOverlay(
  report: { modality: string | null; examName: string; bodyPart: string | null; findings: string | null; impression: string | null },
  audience: Audience,
  mode: InterpretMode,
): Promise<ImagingOverlay> {
  if (mode === 'rule') {
    return {
      ...ruleOnlyOverlay(),
      note: '（本次按仅规则模式生成，未调用大模型；报告原文已附，供医师直接解读。）',
    };
  }

  const { system, user } = buildImagingPrompt(
    {
      patientLabel: '',
      department: INTERP_DEPARTMENT,
      modality: report.modality,
      examName: report.examName,
      bodyPart: report.bodyPart,
      findings: report.findings,
      impression: report.impression,
    },
    audience,
  );

  let raw: string;
  try {
    raw = await chatCompletionJson(system, user);
  } catch (err) {
    if (err instanceof LlmNotConfiguredError) {
      if (mode === 'llm') {
        throw serviceUnavailable('LLM_NOT_CONFIGURED', '未配置大模型（LLM_API_KEY），强制 LLM 模式无法生成');
      }
      return {
        ...ruleOnlyOverlay(),
        deepSource: 'rule',
        llmStatus: 'llm_not_configured',
        note: '（未配置大模型，当前为报告原文规则呈现，无 AI 深度解读。）',
      };
    }
    if (mode === 'llm') {
      throw serviceUnavailable('LLM_ERROR', `大模型调用失败：${err instanceof Error ? err.message : String(err)}`);
    }
    return {
      ...ruleOnlyOverlay(),
      deepSource: 'llm_fallback',
      llmStatus: 'llm_error',
      note: '（大模型暂不可用，已降级为报告原文规则呈现。）',
    };
  }

  try {
    const parsed = parseImagingLlmOutput(raw, audience);
    return {
      deepSource: 'llm',
      llmStatus: 'llm_ok',
      model: readLlmConfig().model,
      explainedFindings: parsed.explainedFindings,
      overallDirection: parsed.overallDirection || null,
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
      ...ruleOnlyOverlay(),
      deepSource: 'llm_fallback',
      llmStatus: 'llm_error',
      note: `（大模型输出格式异常，已降级为报告原文呈现：${err.message}）`,
    };
  }
}

/* ------------------------------- 业务流程 ------------------------------- */

/** 对已发布影像报告生成 AI 解读草稿（幂等，同 (report_id, audience)）。 */
export async function generateForReport(
  reportId: string,
  audienceRaw: unknown = 'doctor',
  modeRaw: unknown = 'auto',
  auth: AuthView,
): Promise<ImagingInterpretation> {
  const audience = asAudience(audienceRaw);
  const mode = asMode(modeRaw);

  const report = await getImagingReport(reportId);
  if (!report) throw notFound('影像报告不存在');
  if (!canAccess(auth, INTERP_DEPARTMENT)) throw forbidden('无权访问放射科影像报告');
  // 医疗安全：仅已发布报告可解读，避免解读空报告/过程稿
  if (report.status !== 'published') {
    throw conflict(`影像报告状态为 ${report.status}，须已发布(published)方可解读`);
  }

  if (!report.findings && !report.impression) {
    throw badRequest('报告缺少所见/印象内容，无法生成解读');
  }

  const overlay = await runImagingLlmOverlay(report, audience, mode);

  // 规则兜底：医生端整体方向至少复述报告印象（非诊断）
  const overallDirection =
    overlay.overallDirection ?? (audience === 'doctor' ? report.impression : null);

  return withTx(async (tx) =>
    upsertImagingInterpretation(
      {
        reportId: report.id,
        visitId: report.visitId,
        patientId: report.patientId,
        department: INTERP_DEPARTMENT,
        audience,
        modality: report.modality,
        examName: report.examName,
        bodyPart: report.bodyPart,
        explainedFindings: overlay.explainedFindings,
        overallDirection,
        plainLanguageSummary: overlay.plainLanguageSummary,
        recommendations: overlay.recommendations,
        deepSource: overlay.deepSource,
        model: overlay.model,
        llmStatus: overlay.llmStatus,
      },
      tx,
    ),
  );
}

/** 查看某报告解读草稿。 */
export async function getForReport(
  reportId: string,
  audienceRaw: unknown = 'doctor',
  auth: AuthView,
): Promise<ImagingInterpretation> {
  const audience = asAudience(audienceRaw);
  const row = await getByReport(reportId, audience);
  if (!row) throw notFound('该影像报告尚未生成 AI 解读');
  if (!canAccess(auth, row.department)) throw forbidden('无权访问放射科影像报告');
  return row;
}

/** 影像解读队列（按 DataScope 过滤，可按 audience 过滤）。 */
export async function listQueue(
  auth: AuthView,
  status: ImagingInterpStatus | null,
  audienceRaw: unknown = null,
) {
  const audience = audienceRaw == null ? null : asAudience(audienceRaw);
  const all = await listImagingInterpretations(status, audience);
  return all.filter((r) => canAccess(auth, r.department));
}

/** 医师签名（pending_review -> signed）。 */
export async function signInterpretation(
  id: string,
  auth: AuthView,
): Promise<ImagingInterpretation> {
  const existing = await getById(id);
  if (!existing) throw notFound('影像解读记录不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权访问放射科影像报告');
  if (existing.status !== 'pending_review') throw conflict('仅待复核(pending_review)的影像解读可签名');
  const updated = await withTx(async (tx) =>
    setStatus(id, ['pending_review'], 'signed', { reviewedBy: auth.id }, tx),
  );
  if (!updated) throw conflict('影像解读状态已变更，请刷新');
  return updated;
}

/** 医师退回（pending_review -> rejected）。 */
export async function rejectInterpretation(
  id: string,
  auth: AuthView,
  reason: string,
): Promise<ImagingInterpretation> {
  const existing = await getById(id);
  if (!existing) throw notFound('影像解读记录不存在');
  if (!canAccess(auth, existing.department)) throw forbidden('无权访问放射科影像报告');
  if (existing.status !== 'pending_review') throw conflict('仅待复核(pending_review)的影像解读可退回');
  if (!reason || !reason.trim()) throw badRequest('退回原因不能为空');
  const updated = await withTx(async (tx) =>
    setStatus(id, ['pending_review'], 'rejected', { rejectReason: reason.trim() }, tx),
  );
  if (!updated) throw conflict('影像解读状态已变更，请刷新');
  return updated;
}
