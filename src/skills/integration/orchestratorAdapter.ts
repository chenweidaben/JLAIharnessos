/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）- 技能 × Orchestrator 适配层
 *
 * 【边界】本文件【只定义适配契约与触发匹配逻辑】，不改动 src/orchestrator/** 本体。
 * 它负责回答两个问题：
 *  1) 一段自然语言意图 / 一个系统事件 / 一个定时调度，应该命中哪个技能？
 *  2) 技能执行所需的 invoker 由谁注入？（由 BFF/启动层把 medical-tools /
 *     orchestrator 的真实能力包装成 SkillInvokers 注入，本文件只约束形状）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import type { LoadedSkill } from '../types';
import type { SkillRegistry } from '../registry';
import type { SkillInvokers } from '../executor';

/** 触发来源 */
export type SkillTriggerSource = 'intent' | 'event' | 'schedule';

/** 一次触发匹配结果 */
export interface SkillMatch {
  skill: LoadedSkill;
  source: SkillTriggerSource;
  /** 命中的短语 / 事件名 / 调度名 */
  matchedBy: string;
  /** 匹配分（短语命中越高越靠前，0~1） */
  score: number;
}

/**
 * 技能触发适配器：把外部信号匹配到注册中心里的技能。
 */
export class SkillOrchestratorAdapter {
  constructor(private readonly registry: SkillRegistry) {}

  /**
   * 自然语言意图匹配。
   * 规则：技能 triggers.phrases 任一短语出现在用户文本中即命中；
   * 更长的短语（更具体）得分更高。
   */
  matchIntent(text: string, opts: { tenantId?: string; roles?: string[] } = {}): SkillMatch[] {
    const normalized = text.toLowerCase();
    const hits: SkillMatch[] = [];
    for (const skill of this.registry.list({
      tenantId: opts.tenantId,
      enabledOnly: true,
      roles: opts.roles,
    })) {
      const phrases = skill.manifest.triggers?.phrases ?? [];
      let best = 0;
      let matched = '';
      for (const phrase of phrases) {
        const p = phrase.toLowerCase();
        if (normalized.includes(p)) {
          const score = Math.min(1, 0.4 + p.length / Math.max(12, normalized.length));
          if (score > best) {
            best = score;
            matched = phrase;
          }
        }
      }
      if (matched) hits.push({ skill, source: 'intent', matchedBy: matched, score: best });
    }
    return hits.sort((a, b) => b.score - a.score);
  }

  /** 事件驱动匹配：技能 triggers.event 与事件名相等即命中 */
  matchEvent(eventName: string, opts: { tenantId?: string } = {}): LoadedSkill[] {
    return this.registry
      .list({ tenantId: opts.tenantId, enabledOnly: true })
      .filter((s) => s.manifest.triggers?.event === eventName)
      .map((s) => s);
  }

  /** 定时调度匹配：返回所有声明了 schedule 的技能（调度器据此拉取） */
  listScheduled(tenantId?: string): { skill: LoadedSkill; cron: string }[] {
    return this.registry
      .list({ tenantId, enabledOnly: true })
      .filter((s) => s.manifest.triggers?.schedule)
      .map((s) => ({ skill: s, cron: s.manifest.triggers!.schedule! }));
  }
}

/**
 * Invoker 工厂契约：由启动层（BFF/server）实现，把真实的
 * medical-tools 注册表与 orchestrator 智能体注册中心包装成技能执行所需的
 * SkillInvokers。本接口仅描述形状，避免 src/skills 反向依赖 medical-tools。
 *
 * 典型实现（在接线层）：
 *   export function buildSkillInvokers(toolReg, agentReg): SkillInvokers { ... }
 */
export type SkillInvokerFactory = (ctx: {
  userId: string;
  tenantId?: string;
}) => SkillInvokers;
