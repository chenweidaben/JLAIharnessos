/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 医疗子代理（MedicalBuddy）
 * 基于 claude-code AgentTool 子代理机制的医疗化实现：
 * 独立转录、工具过滤、模型选择、MCP 隔离、患者缓存共享、科室提示词注入。
 * 对应设计文档：02-Agent能力与医疗工具设计 §5.2、§5.5。
 */

import { BuddyContext } from './BuddyContext';
import type { BuddyResult, BuddyStatus, BuddyTask, LLMClient, SpecialtyConfig } from './types';

/** 共享患者缓存条目（子代理与主代理共享） */
export interface SharedPatientCache {
  /** patientId -> 摘要字符串 */
  get(patientId: string): string | undefined;
  /** patientId -> 摘要字符串 */
  set(patientId: string, summary: string): void;
}

/** 内存版共享缓存（默认实现） */
export class InMemoryPatientCache implements SharedPatientCache {
  private readonly store = new Map<string, string>();
  get(patientId: string): string | undefined {
    return this.store.get(patientId);
  }
  set(patientId: string, summary: string): void {
    this.store.set(patientId, summary);
  }
}

/** 单条转录记录 */
interface TranscriptEntry {
  readonly role: 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly timestamp: number;
}

/**
 * 医疗子代理
 *
 * 一个 MedicalBuddy 实例 = 一个科室子代理会话。
 * 实例可被 BuddyManager 池化复用；每次 run() 启动一个独立的推理循环。
 */
export class MedicalBuddy {
  /** 子代理实例ID */
  readonly buddyId: string;
  /** 科室配置（不可变） */
  readonly config: SpecialtyConfig;
  /** 独立转录（不进入主代理上下文） */
  private readonly transcript: TranscriptEntry[] = [];
  /** 当前状态 */
  private status: BuddyStatus = 'idle';
  /** 已完成任务数 */
  private completedTasks = 0;
  /** 累计运行时长 */
  private totalRunMs = 0;

  /**
   * @param buddyId - 实例唯一ID
   * @param config - 科室配置
   * @param llm - LLM 客户端（Mock 或真实实现）
   * @param sharedCache - 与主代理共享的患者缓存
   */
  constructor(
    buddyId: string,
    config: SpecialtyConfig,
    private readonly llm: LLMClient,
    private readonly sharedCache: SharedPatientCache = new InMemoryPatientCache(),
  ) {
    this.buddyId = buddyId;
    this.config = config;
  }

  /** 当前状态 */
  get currentStatus(): BuddyStatus {
    return this.status;
  }

  /** 已完成任务数 */
  get completedCount(): number {
    return this.completedTasks;
  }

  /**
   * 执行一次子代理任务
   *
   * 流程：构建上下文 → 注入科室提示词 → 过滤工具 → 调用 LLM（带超时）→ 回收摘要。
   *
   * @param task - 子代理任务
   * @param patient - 原始患者信息（用于构造脱敏上下文）
   * @returns 子代理结果
   */
  async run(task: BuddyTask, patient: Record<string, unknown>): Promise<BuddyResult> {
    const startedAt = Date.now();
    this.status = 'running';

    // 1. 构造脱敏上下文（forkSubagent 医疗化）
    const ctx = BuddyContext.create(task, patient, this.config);

    // 2. 患者缓存共享：命中则复用主代理已有的患者摘要
    const cached = task.patientId ? this.sharedCache.get(task.patientId) : undefined;
    const patientSegment = cached ? `（缓存摘要）${cached}` : ctx.toPromptSegment();

    // 3. 工具过滤：仅保留配置白名单内的工具
    const allowedTools = this.filterTools(this.config.tools);

    // 4. 组装系统提示词（科室专业提示词 + 边界约束）
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = `${patientSegment}\n\n${task.instruction}`;

    // 5. 记录独立转录
    this.appendTranscript('user', userMessage);

    // 6. 调用 LLM（带超时与中断）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('TIMEOUT')), this.config.timeoutMs);

    try {
      const resp = await this.llm.complete(
        {
          systemPrompt,
          userMessage,
          model: this.config.model,
          effort: this.config.effort,
          allowedTools,
          maxTurns: this.config.maxTurns,
          patientId: task.patientId,
        },
        controller.signal,
      );

      clearTimeout(timeout);
      this.appendTranscript('assistant', resp.output);
      const durationMs = Date.now() - startedAt;
      this.totalRunMs += durationMs;
      this.completedTasks++;
      this.status = 'completed';

      // 更新共享患者缓存
      if (task.patientId) {
        this.sharedCache.set(task.patientId, resp.output.slice(0, 200));
      }

      return {
        taskId: task.taskId,
        buddyId: this.buddyId,
        agentType: this.config.agentType,
        status: 'completed',
        summary: ctx.summarize(resp.output, resp.toolCalls),
        toolsUsed: resp.toolCalls,
        confidence: resp.confidence,
        durationMs,
        tokens: resp.tokens,
        completedAt: Date.now(),
      };
    } catch (err) {
      clearTimeout(timeout);
      const aborted = controller.signal.aborted;
      const durationMs = Date.now() - startedAt;
      this.totalRunMs += durationMs;
      this.status = aborted ? 'timeout' : 'failed';
      return {
        taskId: task.taskId,
        buddyId: this.buddyId,
        agentType: this.config.agentType,
        status: this.status,
        summary: aborted ? `（超时，返回部分结果）${ctx.toPromptSegment()}` : '子代理执行失败',
        toolsUsed: [],
        confidence: 0,
        durationMs,
        tokens: 0,
        error: err instanceof Error ? err.message : String(err),
        completedAt: Date.now(),
      };
    }
  }

  /**
   * 重置子代理状态（池化复用时调用）
   *
   * 清空转录但保留实例与配置，等待下一次任务。
   */
  recycle(): void {
    this.transcript.length = 0;
    this.status = 'idle';
  }

  /** 获取独立转录长度（用于审计） */
  get transcriptLength(): number {
    return this.transcript.length;
  }

  // ----------------------------------------------------------
  // 内部方法
  // ----------------------------------------------------------

  /** 工具过滤：应用白名单 + 黑名单 */
  private filterTools(allowed: readonly string[]): readonly string[] {
    if (allowed.includes('*')) {
      return allowed.filter((t) => !this.config.disallowedTools.includes(t));
    }
    return allowed.filter((t) => !this.config.disallowedTools.includes(t));
  }

  /** 组装系统提示词：科室专业提示词 + 安全边界 */
  private buildSystemPrompt(): string {
    return [
      this.config.systemPrompt,
      '',
      '【行为边界】',
      '- 仅使用授权工具白名单内的工具',
      '- 所有诊断/治疗建议仅供医生参考，不直接下达医嘱',
      '- 输出需标注证据来源与置信度',
      this.config.emergencyOverride
        ? '- 急诊模式：可越权读取数据，但需事后审计'
        : '- 严格遵循科室权限范围',
    ].join('\n');
  }

  /** 追加独立转录 */
  private appendTranscript(role: TranscriptEntry['role'], content: string): void {
    this.transcript.push({ role, content, timestamp: Date.now() });
  }
}
