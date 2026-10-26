/**
 * 健澜AI原生医院操作系统OS - bff/agents/inpatient/inpatientWorkflow.ts
 *
 * 住院病历智能体离线内存运行器（4.3.2 DAG 顺序编排）：
 * 调取住院上下文 → 检索规范指南 → 选择文书类型 → 摘要/提纲 → 分节草稿 →
 * 一致性校验 → S-01 输出防护 → 人工确认（日常医师确认 / 上级查房方案调整专家确认）→
 * 草稿回写。Schema / 一致性阻断项最多 revise 2 次，超限挂起，不强行出稿。
 *
 * 离线闭环：不接 DB、网络、真实 LLM、真实 ASR 与真实工具注册表；适配器由调用方注入，
 * 未注入时只读工具返回空合成占位并在审计台账标注 degraded-offline。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { guardOutbound } from '@/security/ai/outputGuard.js';
import type { CitationRef, OutboundContext, OutboundVerdict } from '@/security/ai/types.js';
import type { Citation } from '@/knowledge-platform/citation/citationProtocol.js';

import {
  collapseTimelineForSummary,
  evaluateSchedule,
  getDocumentTemplate,
  reviewRoleFor,
} from './documentTemplates.js';
import { parseVitalsText } from './vitalsParser.js';
import { runConsistencyCheck } from './consistencyCheck.js';
import {
  buildInpatientDraft,
  validateInpatientDraft,
  type InpatientDraftValidation,
} from './dischargeSchema.js';
import { interpretClinicalReport } from '../shared/clinicalReportInterpretation.js';
import type {
  ConsistencyFinding,
  DocumentType,
  InpatientActor,
  InpatientAuditEntry,
  InpatientDraft,
  InpatientModelAdapter,
  InpatientRunResult,
  InpatientToolAdapter,
  InpatientWorkflowDeps,
  InpatientWorkflowInput,
  ScheduleReminder,
  TimelineNode,
} from './types.js';

/** revise 最大次数（与 agent.yaml 口径一致：最多 2 次） */
export const MAX_REVISIONS = 2;

/** 只读工具（4.3.3） */
const READ_TOOL_IDS = [
  'get_inpatient_context',
  'get_order_list',
  'get_exam_results',
  'get_nursing_notes',
  'kb_search',
  'icd_lookup',
  'schedule_timeline_check',
] as const;

/** 写工具（4.3.3：仅医生角色 + 知情同意 + 双标识三重校验） */
const WRITE_TOOL_IDS = ['submit_inpatient_draft'] as const;

/** 语音体征工具（只读解析类，不写患者资料） */
const VITALS_TOOL_ID = 'voice_to_vitals';

/** 各文书 Schema 必填字段（schema-shape 口径；出院记录核心字段在 discharge 载荷内校验） */
const REQUIRED_FIELDS: Record<DocumentType, string[]> = {
  'admission-record': ['chiefComplaint', 'presentIllness', 'historyIllness', 'physicalExam', 'auxiliaryExams'],
  'first-progress': ['presentIllness', 'physicalExam', 'auxiliaryExams'],
  'daily-progress': ['presentIllness', 'physicalExam', 'orders'],
  'senior-round': ['presentIllness', 'physicalExam', 'orders'],
  'stage-summary': ['presentIllness', 'physicalExam', 'auxiliaryExams'],
  'discharge-record': ['presentIllness', 'auxiliaryExams', 'orders'],
  'comprehensive-analysis': ['presentIllness', 'auxiliaryExams'],
};

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

/** 草稿拼合为 Guard 校验正文（含章节标签，供要素完整性规则核对） */
function draftOutputText(draft: InpatientDraft): string {
  const lines: string[] = [];
  if (draft.title) lines.push(draft.title);
  if (draft.chiefComplaint) lines.push(`主诉：${draft.chiefComplaint}`);
  if (draft.presentIllness) lines.push(`现病史：${draft.presentIllness}`);
  if (draft.historyIllness) lines.push(`既往史：${draft.historyIllness}`);
  if (draft.physicalExam) lines.push(`体格检查：${draft.physicalExam}`);
  if (draft.auxiliaryExams) lines.push(`辅助检查：${draft.auxiliaryExams}`);
  if (draft.orders) lines.push(`医嘱：${draft.orders}`);
  if (draft.nursingNotes) lines.push(`护理记录：${draft.nursingNotes}`);
  for (const [section, content] of Object.entries(draft.sections)) {
    if (content) lines.push(`${section}：${content}`);
  }
  for (const diagnosis of draft.diagnosis) {
    lines.push(`诊断方向：${diagnosis.name}（${diagnosis.code}，${diagnosis.certainty}）`);
  }
  for (const suggestion of draft.suggestions) {
    lines.push(`${suggestion.kind}：${suggestion.content} ${suggestion.citations.join(' ')}`.trim());
  }
  if (draft.discharge) {
    lines.push(`出院诊断：${draft.discharge.dischargeDiagnosis.map((item) => item.name).join('、')}`);
    lines.push(`诊疗经过：${draft.discharge.treatmentSummary}`);
    lines.push(`出院医嘱：${draft.discharge.dischargeInstructions}`);
  }
  for (const vital of draft.vitals) {
    lines.push(`${vital.item}：${vital.values.join('/')} ${vital.normalizedUnit}`);
  }
  return lines.join('\n');
}

/** 装配 Guard 校验上下文 */
function buildGuardContext(draft: InpatientDraft, input: InpatientWorkflowInput, schemaFailures: number): OutboundContext {
  const template = getDocumentTemplate(draft.documentType);
  return {
    traceId: input.traceId,
    agentId: input.agentId,
    agentVersion: input.agentVersion,
    patient: { patientId: input.patientId, visitId: input.visitId },
    facts: input.facts,
    citations: mapCitationRefs(draft.citations),
    output: draftOutputText(draft),
    structuredPayload: draft as unknown as Record<string, unknown>,
    requiredFields: REQUIRED_FIELDS[draft.documentType] ?? [],
    expectedSections: template?.sections ?? [],
    evidenceLevel: draft.evidenceLevel,
    riskLevel: 'medium',
    role: 'writer',
    schemaFailures,
  };
}

/** 审计台账追加并同步注入式 sink */
function pushAudit(
  trail: InpatientAuditEntry[],
  sink: ((entry: InpatientAuditEntry) => void) | undefined,
  entry: InpatientAuditEntry,
): void {
  trail.push(entry);
  sink?.(entry);
}

/** 工具调用封装：适配器未注入时返回空占位并标注 degraded-offline */
async function callTool(
  adapter: InpatientToolAdapter | undefined,
  toolId: string,
  args: Record<string, unknown>,
): Promise<{ result: Record<string, unknown>; degraded: boolean }> {
  if (!adapter) return { result: {}, degraded: true };
  const result = await adapter.call(toolId, args);
  return { result: result ?? {}, degraded: false };
}

/** 离线骨架装配：无模型适配器时由规则从入参与事实快照拼装缺项骨架 */
function assembleOfflineSkeleton(input: InpatientWorkflowInput, missingInfo: string[]): InpatientDraft {
  const template = getDocumentTemplate(input.documentType);
  const sections: Record<string, string> = {};
  if (template) {
    for (const section of template.sections) {
      sections[section] = input.draftOverrides?.sections?.[section] ?? '待结合住院资料、病程节点与医师查房意见补充。';
    }
  }
  const timelineNodes: TimelineNode[] = collapseTimelineForSummary(input.timelineNodes ?? []);
  const vitalsResult = input.vitalsText ? parseVitalsText(input.vitalsText) : { vitals: [], unrecognized: [], missingInfo: [] };
  missingInfo.push(...vitalsResult.missingInfo);

  const skeleton = buildInpatientDraft({
    documentType: input.documentType,
    title: input.draftOverrides?.title ?? template?.label ?? '',
    chiefComplaint: input.chiefComplaint ?? input.queryText ?? '',
    presentIllness: input.presentIllness ?? input.queryText ?? '',
    historyIllness: input.facts.diagnoses?.length
      ? `既往诊断：${input.facts.diagnoses.join('、')}；资料待医师结合病程记录确认。`
      : '',
    physicalExam: input.draftOverrides?.physicalExam ?? '',
    auxiliaryExams: input.draftOverrides?.auxiliaryExams ?? '',
    orders: input.draftOverrides?.orders ?? '',
    nursingNotes: input.draftOverrides?.nursingNotes ?? '',
    sections,
    diagnosis: input.draftOverrides?.diagnosis ?? [],
    suggestions: input.draftOverrides?.suggestions ?? [],
    discharge: input.draftOverrides?.discharge,
    keyNodes: timelineNodes,
    vitals: vitalsResult.vitals,
    treatmentPlanAdjustment: input.draftOverrides?.treatmentPlanAdjustment ?? false,
    missingInfo,
    citations: input.ragEvidence ?? [],
  });
  return skeleton;
}

interface DraftRoundOutput {
  draft: InpatientDraft | undefined;
  validation: InpatientDraftValidation;
  raw: unknown;
}

/** 单轮草稿装配与 Schema 校验；校验通过后回填语音体征与折叠后的关键时间线 */
async function produceDraft(
  round: number,
  input: InpatientWorkflowInput,
  missingInfo: string[],
  adapter: InpatientModelAdapter | undefined,
): Promise<DraftRoundOutput> {
  let raw: unknown;
  if (adapter) {
    raw = await adapter.generateDraft({
      documentType: input.documentType,
      facts: input.facts,
      ragEvidence: input.ragEvidence ?? [],
      timelineNodes: input.timelineNodes ?? [],
      round,
    });
  } else {
    raw = assembleOfflineSkeleton(input, missingInfo);
  }

  const validation = validateInpatientDraft(raw);
  if (!validation.valid || !validation.draft) return { draft: undefined, validation, raw };

  const draft = validation.draft;
  const vitalsResult = input.vitalsText ? parseVitalsText(input.vitalsText) : undefined;
  draft.vitals = vitalsResult?.vitals ?? draft.vitals;
  draft.keyNodes = collapseTimelineForSummary(input.timelineNodes ?? draft.keyNodes);
  if (vitalsResult) missingInfo.push(...vitalsResult.missingInfo);
  return { draft, validation, raw };
}

/** 主运行器：按 DAG 顺序编排，返回终态结果 */
export async function runInpatientWorkflow(
  input: InpatientWorkflowInput,
  deps: InpatientWorkflowDeps = {},
): Promise<InpatientRunResult> {
  const trail: InpatientAuditEntry[] = [];
  const events: string[] = [];
  const interpretations: ReturnType<typeof interpretClinicalReport>[] = [];
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
  let consistencyFindings: ConsistencyFinding[] = [];
  let scheduleReminders: ScheduleReminder[] = [];
  let guardVerdict: OutboundVerdict | undefined;
  let draft: InpatientDraft | undefined;
  let revisionsUsed = 0;

  audit('workflow-started', `住院病历流程启动；文书类型=${input.documentType}；科室=${input.department}`);

  // 1. 时限规则（schedule_timeline_check；未注入适配器时使用本地规则引擎派生离线提醒）
  scheduleReminders = [
    evaluateSchedule({
      documentType: input.documentType,
      admissionTime: input.admissionTime,
      currentTime: input.currentTime,
      dischargeTime: input.dischargeTime,
      severityLevel: input.severityLevel,
      lastProgressTime: input.lastProgressTime,
      keyEventTime: input.keyEventTime,
    }),
  ];
  const scheduleTool = await callTool(deps.toolAdapter, 'schedule_timeline_check', {
    patientId: input.patientId,
    visitId: input.visitId,
    context: scheduleReminders[0],
  });
  audit(
    scheduleTool.degraded ? 'degraded-offline' : 'schedule-check-loaded',
    `时限规则状态=${scheduleReminders[0].status}；${scheduleReminders[0].message}`,
    ['schedule_timeline_check'],
  );

  // 2. 住院上下文 / 医嘱 / 检验 / 护理 / 知识检索工具占位
  const readToolCalls: string[] = [];
  for (const toolId of READ_TOOL_IDS.filter((id) => id !== 'schedule_timeline_check')) {
    const args: Record<string, unknown> = {
      patientId: input.patientId,
      visitId: input.visitId,
      department: input.department,
    };
    if (toolId === 'kb_search') args.query = input.queryText ?? input.chiefComplaint ?? '';
    if (toolId === 'icd_lookup') args.query = input.chiefComplaint ?? input.queryText ?? '';
    const { degraded } = await callTool(deps.toolAdapter, toolId, args);
    readToolCalls.push(toolId);
    if (degraded) audit('degraded-offline', `工具 ${toolId} 未注入适配器，离线占位返回空结果`, [toolId]);
  }

  // 3. 语音体征解析（voice_to_vitals；适配器未注入时本地规则解析并标注离线）
  if (input.vitalsText) {
    const vitalsTool = await callTool(deps.toolAdapter, VITALS_TOOL_ID, { patientId: input.patientId, text: input.vitalsText });
    readToolCalls.push(VITALS_TOOL_ID);
    audit(
      vitalsTool.degraded ? 'degraded-offline' : 'vitals-loaded',
      `语音体征解析已执行：${input.vitalsText}`,
      [VITALS_TOOL_ID],
    );
  }

  // 4. 检验/检查解读委派门诊/住院共用组件，不在住院侧重复实现解读逻辑
  for (const report of input.clinicalReports ?? []) {
    interpretations.push(interpretClinicalReport(report));
  }
  if (interpretations.length > 0) {
    audit('clinical-interpretation-delegated', `已调用共用解读组件 ${interpretations.length} 份检验/检查报告`, [
      'shared-clinical-report-interpretation',
    ]);
  }

  const missingInfo: string[] = [];

  // 5. 草稿装配 + Schema 校验 + 一致性校验；阻断问题回退 revise，最多 2 次
  let draftRound = await produceDraft(0, input, missingInfo, deps.modelAdapter);
  if (!draftRound.validation.valid) {
    revisionsUsed += 1;
    audit('schema-invalid', `Schema 校验失败：${draftRound.validation.errors.join('；')}`);
    if (revisionsUsed < MAX_REVISIONS) {
      draftRound = await produceDraft(revisionsUsed, input, missingInfo, deps.modelAdapter);
    }
  }

  if (draftRound.draft) {
    draft = draftRound.draft;
    consistencyFindings = runConsistencyCheck(draft, {
      facts: input.facts,
      orders: input.orders,
      examResults: input.examResults,
    });
    const blockFindings = consistencyFindings.filter((finding) => finding.severity === 'block');
    if (blockFindings.length > 0 && revisionsUsed < MAX_REVISIONS) {
      revisionsUsed += 1;
      audit('consistency-block-revise', `一致性阻断项 ${blockFindings.length} 条，进入第 ${revisionsUsed} 次修订`);
      draftRound = await produceDraft(revisionsUsed, input, missingInfo, deps.modelAdapter);
      if (draftRound.draft) {
        draft = draftRound.draft;
        consistencyFindings = runConsistencyCheck(draft, {
          facts: input.facts,
          orders: input.orders,
          examResults: input.examResults,
        });
      }
    }
  }

  // 6. 两次修订后仍不通过：挂起，不强行出稿
  if (!draft || !draftRound.validation.valid) {
    audit(
      'revised-twice-and-held',
      `两次修订后 Schema 仍不通过：${draftRound.validation.errors.join('；')}`,
    );
    const heldDraft = buildInpatientDraft({
      documentType: input.documentType,
      title: draft?.title,
      chiefComplaint: draft?.chiefComplaint,
      presentIllness: draft?.presentIllness,
      historyIllness: draft?.historyIllness,
      physicalExam: draft?.physicalExam,
      auxiliaryExams: draft?.auxiliaryExams,
      orders: draft?.orders,
      nursingNotes: draft?.nursingNotes,
      sections: draft?.sections,
      diagnosis: draft?.diagnosis,
      suggestions: draft?.suggestions,
      discharge: draft?.discharge,
      keyNodes: draft?.keyNodes,
      vitals: draft?.vitals,
      treatmentPlanAdjustment: draft?.treatmentPlanAdjustment,
      missingInfo: [...missingInfo, ...draftRound.validation.errors],
      citations: draft?.citations ?? [],
    });
    return {
      status: 'revised-twice-and-held',
      draft: heldDraft,
      consistencyFindings,
      scheduleReminders,
      guardVerdict,
      auditTrail: trail,
      events,
      interpretations,
    };
  }

  // 7. S-01 输出防护（output-guard）
  guardVerdict = guard(buildGuardContext(draft, input, revisionsUsed));
  if (guardVerdict.level === 'BLOCK') {
    audit('guard-blocked', `输出校验阻断：${guardVerdict.blockedReason ?? '未记录原因'}`);
    return {
      status: 'blocked',
      consistencyFindings,
      scheduleReminders,
      guardVerdict,
      auditTrail: trail,
      events,
      interpretations,
    };
  }
  if (guardVerdict.level === 'CAUTION') {
    audit('guard-caution', `输出校验提示：${guardVerdict.findings.map((finding) => finding.message).join('；')}`);
  } else {
    audit('guard-pass', '输出校验通过');
  }

  // 8. 人工确认：上级查房方案调整 high 须 expert-review；其余 medium 须 physician-confirm
  const review = input.review;
  if (review?.decision === 'rejected') {
    audit('review-rejected', `医师拒绝草稿：${review.comment ?? '无备注'}`);
    return {
      status: 'rejected',
      draft,
      consistencyFindings,
      scheduleReminders,
      guardVerdict,
      review,
      auditTrail: trail,
      events,
      interpretations,
    };
  }

  const requiredRole = reviewRoleFor(draft.documentType, draft.treatmentPlanAdjustment);
  const roleMismatch = review && review.reviewerRole !== requiredRole;
  if (requiredRole === 'expert-review' && !review) {
    audit('UNAUTHORIZED_REVIEW', '上级查房涉及诊疗方案调整，必须由上级医师（expert-review）确认后提交', [
      'human-review',
    ]);
    return {
      status: 'blocked',
      draft,
      consistencyFindings,
      scheduleReminders,
      guardVerdict,
      review,
      auditTrail: trail,
      events,
      interpretations,
    };
  }
  if (roleMismatch) {
    audit(
      'UNAUTHORIZED_REVIEW',
      `确认角色不匹配：要求 ${requiredRole}，实际 ${review?.reviewerRole ?? '缺失'}`,
      ['human-review'],
    );
    return {
      status: 'blocked',
      draft,
      consistencyFindings,
      scheduleReminders,
      guardVerdict,
      review,
      auditTrail: trail,
      events,
      interpretations,
    };
  }

  if (review?.decision === 'returned-for-revision') {
    if (revisionsUsed >= MAX_REVISIONS) {
      audit('revised-twice-and-held', `人工退回超出 ${MAX_REVISIONS} 次修订上限`);
      return {
        status: 'revised-twice-and-held',
        draft,
        consistencyFindings,
        scheduleReminders,
        guardVerdict,
        review,
        auditTrail: trail,
        events,
        interpretations,
      };
    }
    revisionsUsed += 1;
    audit('review-returned-for-revision', `人工退回第 ${revisionsUsed} 次修订：${review.comment ?? '无备注'}`);
    const retryRound = await produceDraft(revisionsUsed, input, missingInfo, deps.modelAdapter);
    if (!retryRound.draft) {
      audit('revised-twice-and-held', `人工退回后 Schema 仍不通过：${retryRound.validation.errors.join('；')}`);
      return {
        status: 'revised-twice-and-held',
        draft,
        consistencyFindings,
        scheduleReminders,
        guardVerdict,
        review,
        auditTrail: trail,
        events,
        interpretations,
      };
    }
    draft = retryRound.draft;
    consistencyFindings = runConsistencyCheck(draft, {
      facts: input.facts,
      orders: input.orders,
      examResults: input.examResults,
    });
    guardVerdict = guard(buildGuardContext(draft, input, revisionsUsed));
    if (guardVerdict.level === 'BLOCK') {
      audit('guard-blocked', `修订稿输出校验阻断：${guardVerdict.blockedReason ?? '未记录原因'}`);
      return {
        status: 'blocked',
        draft,
        consistencyFindings,
        scheduleReminders,
        guardVerdict,
        review,
        auditTrail: trail,
        events,
        interpretations,
      };
    }
  } else if (review?.decision === 'modified' && review.modifiedDraft) {
    const modifiedValidation = validateInpatientDraft(review.modifiedDraft);
    if (!modifiedValidation.valid || !modifiedValidation.draft) {
      audit('schema-invalid', `人工修改稿 Schema 不通过：${modifiedValidation.errors.join('；')}`);
      return {
        status: 'revised-twice-and-held',
        draft,
        consistencyFindings,
        scheduleReminders,
        guardVerdict,
        review,
        auditTrail: trail,
        events,
        interpretations,
      };
    }
    draft = modifiedValidation.draft;
    guardVerdict = guard(buildGuardContext(draft, input, revisionsUsed));
    if (guardVerdict.level === 'BLOCK') {
      audit('guard-blocked', `人工修改稿输出校验阻断：${guardVerdict.blockedReason ?? '未记录原因'}`);
      return {
        status: 'blocked',
        draft,
        consistencyFindings,
        scheduleReminders,
        guardVerdict,
        review,
        auditTrail: trail,
        events,
        interpretations,
      };
    }
    audit('review-modified', `医师修改稿复核通过：${review.comment ?? '无备注'}`);
  } else if (review?.decision === 'adopted') {
    audit('review-adopted', `医师采纳草稿：${review.comment ?? '无备注'}`);
  } else if (!review) {
    audit('review-adopted', '未注入人工决策，离线默认采纳（非生产口径，生产须挂接工作台）');
  }

  // 9. 写路径校验（write-record）：非医生角色 / 未知情同意 / 缺患者标识一律阻断
  const actor: InpatientActor = input.actor;
  const writeDenied = (reason: string): void => {
    audit('UNAUTHORIZED_WRITE', reason, [...READ_TOOL_IDS, ...WRITE_TOOL_IDS], input.patientId, input.visitId);
  };
  if (actor.role !== 'doctor') {
    writeDenied(`角色 ${actor.role} 无住院草稿回写权限（须 doctor）`);
    return {
      status: 'blocked',
      draft,
      consistencyFindings,
      scheduleReminders,
      guardVerdict,
      review,
      auditTrail: trail,
      events,
      interpretations,
    };
  }
  if (input.consentConfirmed !== true) {
    writeDenied('未获得医师知情同意确认（consentConfirmed !== true），禁止回写住院草稿');
    return {
      status: 'blocked',
      draft,
      consistencyFindings,
      scheduleReminders,
      guardVerdict,
      review,
      auditTrail: trail,
      events,
      interpretations,
    };
  }
  if (!input.patientId || !input.visitId) {
    writeDenied('缺少 patientId / visitId，写路径阻断');
    return {
      status: 'blocked',
      draft,
      consistencyFindings,
      scheduleReminders,
      guardVerdict,
      review,
      auditTrail: trail,
      events,
      interpretations,
    };
  }

  const writeResult = await callTool(deps.toolAdapter, 'submit_inpatient_draft', {
    patientId: input.patientId,
    visitId: input.visitId,
    draft,
    reviewer: review?.reviewerRole ?? requiredRole,
  });
  audit(
    writeResult.degraded ? 'draft-written-offline' : 'draft-submitted',
    writeResult.degraded ? '回写工具未注入，离线占位记录草稿' : '住院草稿经 EMR 授权接口回写成功',
    ['submit_inpatient_draft'],
  );

  events.push('inpatient-record-completed');
  audit('record-completed', '住院病历草稿完成，事件 inpatient-record-completed 已在运行时台账预留', [
    'submit_inpatient_draft',
  ]);

  return {
    status: 'completed',
    draft,
    consistencyFindings,
    scheduleReminders,
    guardVerdict,
    review,
    auditTrail: trail,
    events,
    interpretations,
  };
}
