/**
 * Examiner 问诊追问角色（契约 §5 examinerRole）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 信息不足时输出 2–4 个结构化追问，状态导向 clarifying；本角色不产草稿、
 * 不给诊断或用药结论。
 */

import { createAuditEntry } from '../audit';
import type { SafeLlmPort } from '../llm/safeLlm';
import type { RoleInput, RoleOutput, RolePort } from '../ports';
import { appendDisclaimer } from '../roleSupport';
import type { IntentKind, RoleKind } from '../types';

/** 按意图生成结构化追问清单（2–4 个） */
function buildFollowUps(intent: IntentKind): string[] {
  switch (intent) {
    case 'medication_question':
      return [
        '具体是哪种药品（通用名）？目前剂量与服用频次是多少？',
        '是否有药物过敏史、肝肾功能异常，或正在联用其他药物？',
        '用药后出现了什么反应？持续多长时间了？',
      ];
    case 'document_upload':
      return [
        '请描述这份报告 / 化验单 / 影像对应的症状与检查时间。',
        '报告中是否有接诊医生的初步结论或建议？',
        '这份报告距离现在多久，期间症状有无变化？',
      ];
    case 'chronic_management':
      return [
        '最近一次复查指标是多少？目前使用哪些药物、剂量如何？',
        '平时症状控制情况如何，有没有明显波动或不适加重？',
      ];
    case 'symptom_report':
    case 'clarification_answer':
    default:
      return [
        '症状出现多久了？在什么部位、什么情况下会加重或缓解？',
        '既往有没有类似发作或慢性病史？',
        '正在使用哪些药物？有没有药物过敏史？',
        '是否已经做过检查或上传过相关报告？',
      ];
  }
}

/** Examiner 角色实现 */
export class ExaminerRole implements RolePort {
  readonly kind: RoleKind = 'examiner';

  constructor(private readonly llm: SafeLlmPort) {}

  async handle(input: RoleInput): Promise<RoleOutput> {
    const followUpQuestions = buildFollowUps(input.intent);
    const llmResult = await this.llm.complete(input.userText, 'examiner');
    const numbered = followUpQuestions
      .map((question, index) => `${index + 1}. ${question}`)
      .join('\n');
    const reply = appendDisclaimer([llmResult.text, numbered].join('\n'));

    const audit = createAuditEntry({
      threadId: input.thread.id,
      actorRole: 'examiner',
      action: 'examiner_followup',
      traceId: input.traceId,
      detail: {
        intent: input.intent,
        questionCount: followUpQuestions.length,
        degradedLlm: llmResult.degraded,
      },
    });

    return {
      reply,
      nextRole: null,
      draft: null,
      evidence: [],
      followUpQuestions,
      memoryUpdates: [],
      audit: [audit],
      degradedLlm: llmResult.degraded,
    };
  }
}
