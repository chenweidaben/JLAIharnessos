/**
 * Doctor 医师角色（契约 §5 doctorRole）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 生成诊断建议草稿（kind=diagnosis）：证据来自工具结果；措辞为「建议排查 /
 * 待复核」，禁止确诊结论；needsPhysicianReview=true；附证据与免责声明。
 * AI 不自主确诊、不直接产出在院事务。
 */

import { createAuditEntry } from '../audit';
import { computeDraftHash } from '../draftHash';
import type { SafeLlmPort } from '../llm/safeLlm';
import { extractFactsFromText } from '../memory/profileMemory';
import type { RoleInput, RoleOutput, RolePort } from '../ports';
import { appendDisclaimer, newId, nowIso } from '../roleSupport';
import type { ConsultDraft, EvidenceItem, RoleKind } from '../types';
import { DISCLAIMER } from '../types';
import { dedupeEvidence, invokeToolWithAudit } from './internal';

/** 组装诊断建议草稿正文（含证据清单与常驻免责声明） */
function buildDiagnosisContent(
  userText: string,
  evidence: EvidenceItem[],
  llmText: string,
): string {
  const evidenceLines = evidence.length
    ? evidence
        .map((item, index) => `${index + 1}. [${item.kind}] ${item.label}：${item.snippet}`)
        .join('\n')
    : '（本轮未检索到可引用证据，建议线下就诊完善检查后复核。）';
  return [
    `【主诉摘要】${userText.trim()}`,
    '',
    `【AI 初步整理】${llmText}`,
    '',
    '建议方向（待复核）：可结合上述证据优先排查相关常见病因；本草稿为 AI 辅助整理，不构成确诊结论，最终诊断须由执业医师结合面诊、查体与检查结果作出。',
    '',
    '【证据清单】',
    evidenceLines,
    '',
    DISCLAIMER,
  ].join('\n');
}

/** Doctor 角色实现 */
export class DoctorRole implements RolePort {
  readonly kind: RoleKind = 'doctor';

  constructor(private readonly llm: SafeLlmPort) {}

  async handle(input: RoleInput): Promise<RoleOutput> {
    const historyOutcome = await invokeToolWithAudit({
      actorRole: 'doctor',
      threadId: input.thread.id,
      traceId: input.traceId,
      tools: input.tools,
      memory: input.profile,
      toolName: 'retrievePatientHistory',
      args: {},
    });
    const allergyOutcome = await invokeToolWithAudit({
      actorRole: 'doctor',
      threadId: input.thread.id,
      traceId: input.traceId,
      tools: input.tools,
      memory: input.profile,
      toolName: 'checkAllergy',
      args: {},
    });
    const knowledgeOutcome = await invokeToolWithAudit({
      actorRole: 'doctor',
      threadId: input.thread.id,
      traceId: input.traceId,
      tools: input.tools,
      memory: input.profile,
      toolName: 'searchKnowledgeBase',
      args: { query: input.userText },
    });

    const evidence = dedupeEvidence([
      ...historyOutcome.evidence,
      ...allergyOutcome.evidence,
      ...knowledgeOutcome.evidence,
    ]);

    const llmResult = await this.llm.complete(input.userText, 'doctor');
    const summary = `基于 ${evidence.length} 条证据整理的诊断建议草稿，待执业医师复核。`;
    const content = buildDiagnosisContent(input.userText, evidence, llmResult.text);

    const draft: ConsultDraft = {
      id: newId('draft'),
      threadId: input.thread.id,
      kind: 'diagnosis',
      title: '诊断建议草稿（待执业医师复核）',
      summary,
      content,
      evidence,
      needsPhysicianReview: true,
      isOutOfHospitalPrescription: false,
      status: 'pending_review',
      draftHash: '',
      reviewerId: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    draft.draftHash = computeDraftHash(draft);

    const memoryUpdates = extractFactsFromText(input.userText, input.thread.id);

    const roleAudit = createAuditEntry({
      threadId: input.thread.id,
      actorRole: 'doctor',
      action: 'doctor_draft',
      traceId: input.traceId,
      detail: {
        draftKind: 'diagnosis',
        evidenceCount: evidence.length,
        degradedLlm: llmResult.degraded,
      },
    });

    const reply = appendDisclaimer(
      `${llmResult.text}\n已生成诊断建议草稿，待执业医师复核；本草稿不构成确诊结论。`,
    );

    return {
      reply,
      nextRole: null,
      draft,
      evidence,
      followUpQuestions: [],
      memoryUpdates,
      audit: [roleAudit, historyOutcome.audit, allergyOutcome.audit, knowledgeOutcome.audit],
      degradedLlm: llmResult.degraded,
    };
  }
}
