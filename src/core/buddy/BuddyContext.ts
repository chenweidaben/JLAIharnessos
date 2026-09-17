/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 子代理上下文（BuddyContext）
 * 负责向子代理传递精简上下文（患者摘要、任务描述、限制条件），
 * 并在回收时生成结论摘要；传递前执行敏感字段脱敏。
 * 对应设计文档：02-Agent能力与医疗工具设计 §5.6 主代理与子代理通信协议。
 */

import type { BuddyTask, SpecialtyConfig } from './types';

/** 传递给子代理的精简患者上下文 */
export interface PatientBrief {
  /** 患者ID */
  readonly patientId: string;
  /** 年龄 */
  readonly age?: number;
  /** 性别 */
  readonly gender?: string;
  /** 当前诊断（脱敏后） */
  readonly diagnosis?: string;
  /** 过敏史摘要 */
  readonly allergySummary?: string;
  /** 当前用药摘要 */
  readonly currentMedications?: readonly string[];
  /** 就诊科室 */
  readonly department?: string;
}

/**
 * 子代理上下文
 *
 * 这是主代理 → 子代理的"轻量数据包"：
 * - 只传摘要，不传完整病历与对话历史，避免污染子代理转录
 * - 传递前对姓名/身份证/电话等敏感字段脱敏
 * - 回收时只向主代理返回结论摘要
 */
export class BuddyContext {
  /**
   * @param task - 子代理任务
   * @param patientBrief - 患者摘要
   * @param config - 科室配置
   */
  constructor(
    readonly task: BuddyTask,
    readonly patientBrief: PatientBrief,
    readonly config: SpecialtyConfig,
  ) {}

  /**
   * 序列化为子代理可读的提示词片段
   *
   * 已完成脱敏，仅包含任务所需的最小患者信息。
   */
  toPromptSegment(): string {
    const p = this.patientBrief;
    const lines = [
      `【任务】${this.task.instruction}`,
      `【科室】${this.config.departmentName}`,
      `【患者】${p.patientId}，${p.gender ?? '未知性别'}，${p.age ?? '未知年龄'}岁`,
    ];
    if (p.diagnosis) lines.push(`【当前诊断】${p.diagnosis}`);
    if (p.allergySummary) lines.push(`【过敏史】${p.allergySummary}`);
    if (p.currentMedications && p.currentMedications.length > 0) {
      lines.push(`【当前用药】${p.currentMedications.join('、')}`);
    }
    lines.push(
      `【工具白名单】${this.config.tools.includes('*') ? '全部授权工具' : this.config.tools.join('、')}`,
    );
    return lines.join('\n');
  }

  /**
   * 生成回收给主代理的结论摘要
   *
   * 不携带子代理完整对话历史，只保留结论与关键证据。
   *
   * @param fullOutput - 子代理完整输出
   * @param toolsUsed - 使用的工具
   */
  summarize(fullOutput: string, toolsUsed: readonly string[]): string {
    const trimmed = fullOutput.trim();
    // 摘要截断：控制在 500 字符以内，避免上下文膨胀
    const summary = trimmed.length > 500 ? `${trimmed.slice(0, 500)}……（已截断）` : trimmed;
    return `[${this.config.departmentName}子代理结论] ${summary}\n（调用工具：${toolsUsed.join('、') || '无'}）`;
  }

  /**
   * 静态工厂：构造并自动脱敏患者摘要
   *
   * @param task - 子代理任务
   * @param rawPatient - 原始患者信息（含敏感字段）
   * @param config - 科室配置
   * @returns 已脱敏的 BuddyContext
   */
  static create(
    task: BuddyTask,
    rawPatient: Partial<PatientBrief> & Record<string, unknown>,
    config: SpecialtyConfig,
  ): BuddyContext {
    const brief: PatientBrief = {
      patientId: this.maskId(String(rawPatient.patientId ?? task.patientId ?? 'unknown')),
      age: rawPatient.age,
      gender: rawPatient.gender,
      diagnosis: rawPatient.diagnosis ? this.maskPII(String(rawPatient.diagnosis)) : undefined,
      allergySummary: rawPatient.allergySummary,
      currentMedications: rawPatient.currentMedications,
      department: rawPatient.department,
    };
    return new BuddyContext(task, brief, config);
  }

  /**
   * 脱敏患者ID（保留前4位 + 后2位，中间星号）
   */
  private static maskId(id: string): string {
    if (id.length <= 6) return id;
    return `${id.slice(0, 4)}***${id.slice(-2)}`;
  }

  /**
   * 脱敏诊断文本中的姓名/电话等 PII
   *
   * 当前实现：替换 11 位手机号为 ***，去除常见"姓名：xxx"片段。
   *
   * @param text - 原始文本
   */
  private static maskPII(text: string): string {
    return text.replace(/1[3-9]\d{9}/g, '***').replace(/姓名[:：]\s*\S+/g, '姓名：***');
  }
}
