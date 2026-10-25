/**
 * Pharmacist 药师角色（契约 §5 pharmacistRole）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 生成用药审方 / 处方草稿（kind=prescription）：核对过敏史与相互作用；
 * isOutOfHospitalPrescription=false；needsPhysicianReview=true；禁止直接开具
 * 在院医嘱；附风险提示与免责声明。
 */

import { createAuditEntry } from '../audit';
import { SAMPLE_DRUG_FACTS } from '../demo/demoSeed';
import { computeDraftHash } from '../draftHash';
import type { SafeLlmPort } from '../llm/safeLlm';
import { extractFactsFromText } from '../memory/profileMemory';
import type { RoleInput, RoleOutput, RolePort } from '../ports';
import { appendDisclaimer, newId, nowIso } from '../roleSupport';
import type { ConsultDraft, EvidenceItem, RoleKind } from '../types';
import { DISCLAIMER } from '../types';
import { dedupeEvidence, invokeToolWithAudit } from './internal';

/** 从文本确定性识别药品通用名（先匹配 DEMO 药表，再按剂型后缀兜底；未命中返回空串） */
function extractDrugName(text: string): string {
  for (const sample of SAMPLE_DRUG_FACTS) {
    const hit = sample.keywords.find((keyword) => text.includes(keyword));
    if (hit) {
      return hit;
    }
  }
  const match = /([一-龥A-Za-z]{2,12}(?:片|胶囊|颗粒|注射液|口服液|软膏))/.exec(text);
  return match?.[1] ?? '';
}

/** 组装用药建议草稿正文（含风险提示、红线声明与常驻免责声明） */
function buildPrescriptionContent(
  userText: string,
  drugName: string,
  evidence: EvidenceItem[],
  llmText: string,
): string {
  const evidenceLines = evidence.length
    ? evidence
        .map((item, index) => `${index + 1}. [${item.kind}] ${item.label}：${item.snippet}`)
        .join('\n')
    : '（本轮未检索到药品说明书或相互作用证据，须线下由药师当面核对。）';
  const drugLine = drugName
    ? `【咨询药品】${drugName}`
    : '【咨询药品】未识别到具体药品通用名，请补充药品名称。';
  return [
    drugLine,
    '',
    `【咨询摘要】${userText.trim()}`,
    '',
    `【AI 用药整理】${llmText}`,
    '',
    '风险提示：用药前须核对过敏史、肝肾功能、孕哺状态与联用药物；存在过敏史、相互作用或基础疾病时，应暂缓用药并线下咨询执业医师 / 药师。',
    '',
    '红线声明：本草稿不构成在院医嘱，不直接开具处方，不属于院外处方；最终用药方案须由执业医师 / 药师复核后确定。',
    '',
    '【证据清单】',
    evidenceLines,
    '',
    DISCLAIMER,
  ].join('\n');
}

/** Pharmacist 角色实现 */
export class PharmacistRole implements RolePort {
  readonly kind: RoleKind = 'pharmacist';

  constructor(private readonly llm: SafeLlmPort) {}

  async handle(input: RoleInput): Promise<RoleOutput> {
    const drugName = extractDrugName(input.userText);
    const drugNames = drugName ? [drugName] : [];

    const drugOutcome = await invokeToolWithAudit({
      actorRole: 'pharmacist',
      threadId: input.thread.id,
      traceId: input.traceId,
      tools: input.tools,
      memory: input.profile,
      toolName: 'lookupDrug',
      args: { drugName },
    });
    const allergyOutcome = await invokeToolWithAudit({
      actorRole: 'pharmacist',
      threadId: input.thread.id,
      traceId: input.traceId,
      tools: input.tools,
      memory: input.profile,
      toolName: 'checkAllergy',
      args: {},
    });
    const interactionOutcome = await invokeToolWithAudit({
      actorRole: 'pharmacist',
      threadId: input.thread.id,
      traceId: input.traceId,
      tools: input.tools,
      memory: input.profile,
      toolName: 'checkInteraction',
      args: { drugNames },
    });

    const evidence = dedupeEvidence([
      ...drugOutcome.evidence,
      ...allergyOutcome.evidence,
      ...interactionOutcome.evidence,
    ]);

    const llmResult = await this.llm.complete(input.userText, 'pharmacist');
    const summary = drugName
      ? `围绕“${drugName}”整理的用药建议草稿，待执业医师 / 药师复核。`
      : '未识别到具体药品的用药建议草稿，待补充药品名称后复核。';
    const content = buildPrescriptionContent(input.userText, drugName, evidence, llmResult.text);

    const draft: ConsultDraft = {
      id: newId('draft'),
      threadId: input.thread.id,
      kind: 'prescription',
      title: drugName ? `用药建议草稿：${drugName}（待复核）` : '用药建议草稿（待复核）',
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
      actorRole: 'pharmacist',
      action: 'pharmacist_draft',
      traceId: input.traceId,
      detail: {
        draftKind: 'prescription',
        drugName,
        evidenceCount: evidence.length,
        degradedLlm: llmResult.degraded,
      },
    });

    const reply = appendDisclaimer(
      `${llmResult.text}\n已生成用药建议草稿，待执业医师 / 药师复核；AI 不直接开具处方或在院医嘱。`,
    );

    return {
      reply,
      nextRole: null,
      draft,
      evidence,
      followUpQuestions: [],
      memoryUpdates,
      audit: [roleAudit, drugOutcome.audit, allergyOutcome.audit, interactionOutcome.audit],
      degradedLlm: llmResult.degraded,
    };
  }
}
