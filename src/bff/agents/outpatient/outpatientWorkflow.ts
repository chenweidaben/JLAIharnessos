/**
 * 健澜AI原生医院操作系统OS - bff/agents/outpatient/outpatientWorkflow.ts
 *
 * 门诊病历智能体离线内存运行器（4.2.3 DAG 顺序编排）：
 * 意图分流 → 取数工具占位 → 对话归一 → 草稿装配 → 实时质控 → S-01 输出校验 →
 * 人工确认 → 草稿回写。Schema / 质控问题最多 revise 2 次，超限挂起不强行出稿。
 *
 * 离线闭环：不接 DB、网络、真实 LLM 与真实工具注册表；适配器由调用方注入，
 * 未注入时只读工具返回空合成占位并在审计台账标注 degraded-offline。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { guardOutbound } from '@/security/ai/outputGuard.js';
import type { CitationRef, OutboundContext, OutboundVerdict } from '@/security/ai/types.js';
import type { Citation } from '@/knowledge-platform/citation/citationProtocol.js';

import { classifyIntent } from './intentClassifier.js';
import { normalizeDialogue } from './dialogueNormalizer.js';
import { runQcRealtime } from './qcRealtime.js';
import { validateOutpatientDraft, buildOutpatientDraft, type DraftValidation } from './draftSchema.js';
import type {
  DialogueSegment,
  EncounterKind,
  OutpatientActor,
  OutpatientAuditEntry,
  OutpatientModelAdapter,
  OutpatientRecordDraft,
  OutpatientRunResult,
  OutpatientToolAdapter,
  OutpatientWorkflowDeps,
  OutpatientWorkflowInput,
  QcFinding,
} from './types.js';

/** revise 最大次数（与 agent.yaml 口径一致：最多 2 次） */
export const MAX_REVISIONS = 2;

/** 写路径工具白名单（仅医生角色 + 知情同意确认后可调用） */
const WRITE_TOOL_IDS = ['submit_outpatient_draft', 'raise_qc_alert'] as const;
const READ_TOOL_IDS = [
  'get_patient_profile',
  'get_visit_history',
  'get_recent_exams',
  'get_medication_list',
  'kb_search',
  'icd_lookup',
] as const;

/** 初诊必填字段（schema-shape 口径） */
const INITIAL_REQUIRED_FIELDS = ['chiefComplaint', 'presentIllness', 'historyIllness', 'physicalExam', 'auxiliaryExams'];
/** 复诊必填字段（schema-shape 口径） */
const FOLLOW_UP_REQUIRED_FIELDS = ['presentIllness', 'physicalExam', 'auxiliaryExams', 'historyIllness'];
/** 初诊必备章节关键词（format-completeness 口径） */
const INITIAL_EXPECTED_SECTIONS = ['主诉', '现病史', '既往史', '查体', '辅助检查'];
/** 复诊必备章节关键词 */
const FOLLOW_UP_EXPECTED_SECTIONS = ['诊疗经过', '病情变化', '查体', '辅助检查'];

function nowIso(): string {
  return new Date().toISOString();
}

/** S-12 Citation 映射为 S-01 CitationRef */
function mapCitationRefs(citations: Citation[]): CitationRef[] {
  return citations.map((citation) => ({
    refId: citation.refId,
    chunkId: citation.chunkId,
    title: citation.title,
    sectionPath: citation.sectionPath,
  }));
}

/** 草稿拼合为 Guard 校验正文（带章节标签，供要素完整性规则核对） */
function draftOutputText(draft: OutpatientRecordDraft, encounterKind: EncounterKind): string {
  const lines: string[] = [];
  if (encounterKind === 'initial') {
    if (draft.chiefComplaint) lines.push(`主诉：${draft.chiefComplaint}`);
    if (draft.presentIllness) lines.push(`现病史：${draft.presentIllness}`);
    if (draft.historyIllness) lines.push(`既往史：${draft.historyIllness}`);
    if (draft.physicalExam) lines.push(`查体：${draft.physicalExam}`);
    if (draft.auxiliaryExams) lines.push(`辅助检查：${draft.auxiliaryExams}`);
  } else {
    if (draft.presentIllness) lines.push(`诊疗经过：${draft.presentIllness}`);
    if (draft.historyIllness) lines.push(`病情变化：${draft.historyIllness}`);
    if (draft.physicalExam) lines.push(`查体：${draft.physicalExam}`);
    if (draft.auxiliaryExams) lines.push(`辅助检查：${draft.auxiliaryExams}`);
  }
  for (const suggestion of draft.suggestions) {
    lines.push(`${suggestion.kind}：${suggestion.content} ${suggestion.citations.join(' ')}`.trim());
  }
  return lines.join('\n');
}

/** 装配 Guard 校验上下文 */
function buildGuardContext(
  draft: OutpatientRecordDraft,
  input: OutpatientWorkflowInput,
  encounterKind: EncounterKind,
  schemaFailures: number,
): OutboundContext {
  return {
    traceId: input.traceId,
    agentId: input.agentId,
    agentVersion: input.agentVersion,
    patient: { patientId: input.patientId, visitId: input.visitId },
    facts: input.facts,
    citations: mapCitationRefs(draft.citations),
    output: draftOutputText(draft, encounterKind),
    structuredPayload: draft as unknown as Record<string, unknown>,
    requiredFields: encounterKind === 'initial' ? INITIAL_REQUIRED_FIELDS : FOLLOW_UP_REQUIRED_FIELDS,
    expectedSections: encounterKind === 'initial' ? INITIAL_EXPECTED_SECTIONS : FOLLOW_UP_EXPECTED_SECTIONS,
    evidenceLevel: draft.evidenceLevel,
    riskLevel: 'medium',
    role: 'writer',
    schemaFailures,
  };
}

/** 审计台账追加并同步注入式 sink */
function pushAudit(trail: OutpatientAuditEntry[], sink: ((entry: OutpatientAuditEntry) => void) | undefined, entry: OutpatientAuditEntry): void {
  trail.push(entry);
  sink?.(entry);
}

/** 工具调用封装：适配器未注入时返回空占位并标注 degraded-offline */
async function callTool(
  adapter: OutpatientToolAdapter | undefined,
  toolId: string,
  args: Record<string, unknown>,
): Promise<{ result: Record<string, unknown>; degraded: boolean }> {
  if (!adapter) return { result: {}, degraded: true };
  const result = await adapter.call(toolId, args);
  return { result: result ?? {}, degraded: false };
}

/** 离线骨架装配：无模型适配器时由规则从对话与事实快照拼装缺项骨架 */
function assembleOfflineSkeleton(
  dialogue: DialogueSegment[],
  encounterKind: EncounterKind,
  missingInfo: string[],
  citations: Citation[],
): OutpatientRecordDraft {
  const patientText = dialogue
    .filter((segment) => segment.speaker === 'patient')
    .map((segment) => segment.text)
    .filter(Boolean)
    .join('。');
  const historyText = [
    (encounterKind === 'initial' ? '既往史：' : '诊疗经过：'),
    citations.length > 0 ? '资料待医师结合检索依据确认。' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return buildOutpatientDraft({
    encounterKind,
    chiefComplaint: patientText.split('。')[0] ?? '',
    presentIllness: patientText,
    historyIllness: historyText,
    physicalExam: '',
    auxiliaryExams: '',
    diagnosis: [],
    suggestions: [],
    missingInfo,
    citations,
  });
}

interface DraftRoundOutput {
  draft: OutpatientRecordDraft | undefined;
  validation: DraftValidation;
  raw: unknown;
}

/** 单轮草稿装配与 Schema 校验 */
async function produceDraft(
  round: number,
  input: OutpatientWorkflowInput,
  encounterKind: EncounterKind,
  missingInfo: string[],
  adapter: OutpatientModelAdapter | undefined,
): Promise<DraftRoundOutput> {
  let raw: unknown;
  if (adapter) {
    raw = await adapter.generateDraft({
      encounterKind,
      dialogue: input.dialogue,
      facts: input.facts,
      ragEvidence: input.ragEvidence ?? [],
      round,
    });
  } else {
    const skeleton = assembleOfflineSkeleton(input.dialogue, encounterKind, missingInfo, input.ragEvidence ?? []);
    raw = skeleton;
  }
  const validation = validateOutpatientDraft(raw);
  return { draft: validation.valid ? validation.draft : undefined, validation, raw };
}

/** 主运行器：按 DAG 顺序编排，返回终态结果 */
export async function runOutpatientWorkflow(
  input: OutpatientWorkflowInput,
  deps: OutpatientWorkflowDeps = {},
): Promise<OutpatientRunResult> {
  const trail: OutpatientAuditEntry[] = [];
  const events: string[] = [];
  const auditSink = deps.auditSink;
  const audit = (
    action: string,
    detail: string,
    toolCalls?: string[],
    patientId: string | undefined = input.patientId,
    visitId: string | undefined = input.visitId,
  ) => {
    pushAudit(trail, auditSink, {
      timestamp: nowIso(),
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      patientId,
      visitId,
      action,
      detail,
      toolCalls,
    });
  };

  const guard = deps.guard ?? guardOutbound;
  let qcFindings: QcFinding[] = [];
  let guardVerdict: OutboundVerdict | undefined;
  let draft: OutpatientRecordDraft | undefined;
  let revisionsUsed = 0;

  // 1. 意图分流（intent-classify）
  const classification = classifyIntent({ dialogue: input.dialogue, facts: input.facts });
  const encounterKind: EncounterKind = classification.encounterKind;
  audit('intent-classified', `意图=${classification.intent}；就诊类型=${encounterKind}；${classification.reasons.join('；')}`);

  // 2. 对话归一（dialogue-normalize）
  const normalized = normalizeDialogue(input.dialogue, {
    encounterDate: input.encounterDate,
    facts: input.facts,
    encounterKind,
  });
  const missingInfo = [...normalized.missingElements];
  audit('dialogue-normalized', `归一 ${normalized.segments.length} 段；时间线 ${normalized.timeline.length} 条；缺项 ${missingInfo.length} 项`);

  // 3. 取数工具占位（fetch-patient / fetch-records / rag-guidelines）
  const readToolCalls: string[] = [];
  for (const toolId of READ_TOOL_IDS) {
    const args: Record<string, unknown> = { patientId: input.patientId, visitId: input.visitId };
    if (toolId === 'kb_search') args.query = input.queryText ?? input.dialogue[0]?.text ?? '';
    const { degraded } = await callTool(deps.toolAdapter, toolId, args);
    readToolCalls.push(toolId);
    if (degraded) audit('degraded-offline', `工具 ${toolId} 未注入适配器，离线占位返回空结果`, [toolId]);
  }

  // 4. 草稿装配 + Schema 校验 + 实时质控；问题回退 revise，最多 2 次
  const schemaFailures = 0;
  let draftRound = await produceDraft(0, input, encounterKind, missingInfo, deps.modelAdapter);
  if (!draftRound.validation.valid) {
    revisionsUsed += 1;
    audit('schema-invalid', `Schema 校验失败：${draftRound.validation.errors.join('；')}`, undefined, input.patientId, input.visitId);
    if (revisionsUsed < MAX_REVISIONS) {
      draftRound = await produceDraft(revisionsUsed, input, encounterKind, missingInfo, deps.modelAdapter);
    }
  }

  if (draftRound.draft) {
    draft = draftRound.draft;
    qcFindings = runQcRealtime(draft, { encounterKind, facts: input.facts, timeline: normalized.timeline });
    const blockFindings = qcFindings.filter((f) => f.severity === 'block');
    if (blockFindings.length > 0 && revisionsUsed < MAX_REVISIONS) {
      revisionsUsed += 1;
      audit('qc-block-revise', `质控阻断项 ${blockFindings.length} 条，进入第 ${revisionsUsed} 次修订`, undefined, input.patientId, input.visitId);
      draftRound = await produceDraft(revisionsUsed, input, encounterKind, missingInfo, deps.modelAdapter);
      if (draftRound.draft) {
        draft = draftRound.draft;
        qcFindings = runQcRealtime(draft, { encounterKind, facts: input.facts, timeline: normalized.timeline });
      }
    }
  }

  // 5. Schema / 质控两次修订后仍不通过：挂起，不强行出稿
  if (!draft || !draftRound.validation.valid) {
    audit(
      'revised-twice-and-held',
      `两次修订后 Schema 仍不通过：${draftRound.validation.errors.join('；')}`,
      undefined,
      input.patientId,
      input.visitId,
    );
    const heldDraft = buildOutpatientDraft({
      encounterKind,
      chiefComplaint: draft?.chiefComplaint,
      presentIllness: draft?.presentIllness,
      historyIllness: draft?.historyIllness,
      physicalExam: draft?.physicalExam,
      auxiliaryExams: draft?.auxiliaryExams,
      diagnosis: draft?.diagnosis,
      suggestions: draft?.suggestions,
      missingInfo: [...missingInfo, ...draftRound.validation.errors],
      citations: draft?.citations ?? [],
    });
    return {
      status: 'revised-twice-and-held',
      draft: heldDraft,
      qcFindings,
      guardVerdict,
      auditTrail: trail,
      events,
    };
  }

  // 6. S-01 输出校验（output-guard）
  guardVerdict = guard(buildGuardContext(draft, input, encounterKind, schemaFailures));
  if (guardVerdict.level === 'BLOCK') {
    audit('guard-blocked', `输出校验阻断：${guardVerdict.blockedReason ?? '未记录原因'}`, undefined, input.patientId, input.visitId);
    return {
      status: 'blocked',
      qcFindings,
      guardVerdict,
      auditTrail: trail,
      events,
    };
  }
  if (guardVerdict.level === 'CAUTION') {
    audit('guard-caution', `输出校验提示：${guardVerdict.findings.map((f) => f.message).join('；')}`, undefined, input.patientId, input.visitId);
  } else {
    audit('guard-pass', '输出校验通过', undefined, input.patientId, input.visitId);
  }

  // 7. 人工确认（human-review）
  const review = input.review;
  if (review?.decision === 'rejected') {
    audit('review-rejected', `医师拒绝草稿：${review.comment ?? '无备注'}`, undefined, input.patientId, input.visitId);
    return {
      status: 'rejected',
      draft,
      qcFindings,
      guardVerdict,
      review,
      auditTrail: trail,
      events,
    };
  }
  if (review?.decision === 'returned-for-revision' && revisionsUsed < MAX_REVISIONS) {
    revisionsUsed += 1;
    audit('review-returned-for-revision', `人工退回第 ${revisionsUsed} 次修订：${review.comment ?? '无备注'}`, undefined, input.patientId, input.visitId);
    const retryRound = await produceDraft(revisionsUsed, input, encounterKind, missingInfo, deps.modelAdapter);
    if (retryRound.draft) {
      draft = retryRound.draft;
      qcFindings = runQcRealtime(draft, { encounterKind, facts: input.facts, timeline: normalized.timeline });
      guardVerdict = guard(buildGuardContext(draft, input, encounterKind, revisionsUsed));
      if (guardVerdict.level === 'BLOCK') {
        audit('guard-blocked', `修订稿输出校验阻断：${guardVerdict.blockedReason ?? '未记录原因'}`, undefined, input.patientId, input.visitId);
        return { status: 'blocked', qcFindings, guardVerdict, review, auditTrail: trail, events };
      }
    } else {
      audit('revised-twice-and-held', `人工退回后 Schema 仍不通过：${retryRound.validation.errors.join('；')}`, undefined, input.patientId, input.visitId);
      return { status: 'revised-twice-and-held', draft, qcFindings, guardVerdict, review, auditTrail: trail, events };
    }
  } else if (review?.decision === 'returned-for-revision') {
    audit('revised-twice-and-held', `人工退回超出 ${MAX_REVISIONS} 次修订上限`, undefined, input.patientId, input.visitId);
    return { status: 'revised-twice-and-held', draft, qcFindings, guardVerdict, review, auditTrail: trail, events };
  }

  if (review?.decision === 'modified' && review.modifiedDraft) {
    const modifiedValidation = validateOutpatientDraft(review.modifiedDraft);
    if (!modifiedValidation.valid || !modifiedValidation.draft) {
      audit('schema-invalid', `人工修改稿 Schema 不通过：${modifiedValidation.errors.join('；')}`, undefined, input.patientId, input.visitId);
      return { status: 'revised-twice-and-held', draft, qcFindings, guardVerdict, review, auditTrail: trail, events };
    }
    const modifiedDraft = modifiedValidation.draft;
    draft = modifiedDraft;
    guardVerdict = guard(buildGuardContext(modifiedDraft, input, encounterKind, revisionsUsed));
    if (guardVerdict.level === 'BLOCK') {
      audit('guard-blocked', `人工修改稿输出校验阻断：${guardVerdict.blockedReason ?? '未记录原因'}`, undefined, input.patientId, input.visitId);
      return { status: 'blocked', qcFindings, guardVerdict, review, auditTrail: trail, events };
    }
    audit('review-modified', `医师修改稿复核通过：${review.comment ?? '无备注'}`, undefined, input.patientId, input.visitId);
  } else if (review?.decision === 'adopted') {
    audit('review-adopted', `医师采纳草稿：${review.comment ?? '无备注'}`, undefined, input.patientId, input.visitId);
  } else if (!review) {
    audit('review-adopted', '未注入人工决策，离线默认采纳（非生产口径，生产须挂接工作台）', undefined, input.patientId, input.visitId);
  }

  // 8. 写路径校验（write-record）：非医生角色 / 未知情同意 / 缺患者标识一律阻断
  const actor: OutpatientActor = input.actor;
  const writeDenied = (reason: string): void => {
    audit('UNAUTHORIZED_WRITE', reason, [...READ_TOOL_IDS, ...WRITE_TOOL_IDS], input.patientId, input.visitId);
  };
  if (actor.role !== 'doctor') {
    writeDenied(`角色 ${actor.role} 无门诊草稿回写权限（须 doctor）`);
    return { status: 'blocked', draft, qcFindings, guardVerdict, review, auditTrail: trail, events };
  }
  if (input.consentConfirmed !== true) {
    writeDenied('未获得医师知情同意确认（consentConfirmed !== true），禁止回写门诊草稿');
    return { status: 'blocked', draft, qcFindings, guardVerdict, review, auditTrail: trail, events };
  }
  if (!input.patientId || !input.visitId) {
    writeDenied('缺少 patientId / visitId，写路径阻断');
    return { status: 'blocked', draft, qcFindings, guardVerdict, review, auditTrail: trail, events };
  }

  // 回写草稿；质控告警工具按需调用
  const writeResult = await callTool(deps.toolAdapter, 'submit_outpatient_draft', {
    patientId: input.patientId,
    visitId: input.visitId,
    draft,
    reviewer: review?.reviewerRole ?? actor.role,
  });
  audit(
    writeResult.degraded ? 'draft-written-offline' : 'draft-submitted',
    writeResult.degraded ? '回写工具未注入，离线占位记录草稿' : '门诊草稿经 EMR 授权接口回写成功',
    ['submit_outpatient_draft'],
    input.patientId,
    input.visitId,
  );
  if (qcFindings.some((f) => f.severity !== 'info')) {
    const alertResult = await callTool(deps.toolAdapter, 'raise_qc_alert', {
      patientId: input.patientId,
      visitId: input.visitId,
      findings: qcFindings,
    });
    audit(
      alertResult.degraded ? 'qc-alert-offline' : 'qc-alert-raised',
      `质控告警 ${qcFindings.length} 条${alertResult.degraded ? '（离线占位）' : ''}`,
      ['raise_qc_alert'],
      input.patientId,
      input.visitId,
    );
  }

  events.push('outpatient-record-completed');
  return {
    status: 'completed',
    draft,
    qcFindings,
    guardVerdict,
    review,
    auditTrail: trail,
    events,
  };
}
