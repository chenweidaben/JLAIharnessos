/**
 * Supervisor 分诊角色（契约 §5 supervisorRole）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 先由编排层完成安全旁路（acute 不进入角色）；本角色按意图选择下一角色，
 * 产出编排级回复与 nextRole，不生成草稿、不直接给临床结论。
 */

import { createAuditEntry } from '../audit';
import type { SafeLlmPort } from '../llm/safeLlm';
import type { RoleInput, RoleOutput, RolePort } from '../ports';
import { appendDisclaimer } from '../roleSupport';
import { routeNextRole } from '../supervisor';
import type { RoleKind } from '../types';

/** 按意图与路由结果生成分诊引导文案 */
function routingGuidance(intent: RoleInput['intent'], nextRole: RoleKind | null): string {
  if (nextRole === 'pharmacist') {
    return '您咨询的是用药相关问题，已为您转接药师角色协助核对。';
  }
  if (nextRole === 'doctor') {
    return '您描述的情况已转交医师角色整理诊断建议草稿，供执业医师复核参考。';
  }
  if (nextRole === 'examiner') {
    return '目前信息尚不足以进入专业角色，先由问诊角色向您补充确认关键信息。';
  }
  if (intent === 'greeting') {
    return '若您有症状、用药或慢病管理相关问题，可以直接描述；如出现急症信号请立即拨打 120 或前往急诊。';
  }
  return '已接收您的咨询，将按问题类型安排相应角色协助处理。';
}

/** Supervisor 角色实现 */
export class SupervisorRole implements RolePort {
  readonly kind: RoleKind = 'supervisor';

  constructor(private readonly llm: SafeLlmPort) {}

  async handle(input: RoleInput): Promise<RoleOutput> {
    const nextRole = routeNextRole({
      intent: input.intent,
      text: input.userText,
      history: input.history,
    });
    const llmResult = await this.llm.complete(input.userText, 'supervisor');
    const reply = appendDisclaimer(
      [llmResult.text, routingGuidance(input.intent, nextRole)].join('\n'),
    );

    const audit = createAuditEntry({
      threadId: input.thread.id,
      actorRole: 'supervisor',
      action: 'supervisor_triage',
      traceId: input.traceId,
      detail: {
        intent: input.intent,
        nextRole,
        degradedLlm: llmResult.degraded,
      },
    });

    return {
      reply,
      nextRole,
      draft: null,
      evidence: [],
      followUpQuestions: [],
      memoryUpdates: [],
      audit: [audit],
      degradedLlm: llmResult.degraded,
    };
  }
}
