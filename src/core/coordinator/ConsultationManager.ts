/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 会诊管理器（ConsultationManager）
 * 多学科会诊（MDT）流程编排：邀请科室 → 并行征集意见 → 汇总结论 → 生成会诊记录。
 * 对应设计文档：02-Agent能力与医疗工具设计 §5 子代理（科室代理）。
 */

import type { AgentRequest, AgentResponse } from '@/types/agent';

import { type AgentExecutor, type CollaborationEngine } from './CollaborationEngine';
import type { AggregatedResponse } from './types';

/** 会诊状态 */
export type ConsultationStatus =
  | 'pending' // 待发起
  | 'in_progress' // 进行中
  | 'completed' // 已完成
  | 'cancelled' // 已取消
  | 'failed'; // 失败

/** 单条科室会诊意见 */
export interface ConsultationOpinion {
  /** 科室/子代理名称 */
  readonly department: string;
  /** 专家意见正文 */
  readonly opinion: string;
  /** 置信度（0-1） */
  readonly confidence: number;
  /** 是否同意其他科室方案 */
  readonly agreeing: boolean;
}

/** 会诊记录 */
export interface ConsultationRecord {
  /** 会诊唯一ID */
  readonly consultationId: string;
  /** 关联患者ID */
  readonly patientId: string;
  /** 关联就诊ID */
  readonly encounterId?: string;
  /** 参与科室子代理名称列表 */
  readonly departments: readonly string[];
  /** 会诊状态 */
  status: ConsultationStatus;
  /** 各科室意见 */
  opinions: ConsultationOpinion[];
  /** 汇总会诊结论 */
  summary?: string;
  /** 发起时间 */
  readonly startedAt: number;
  /** 完成时间 */
  completedAt?: number;
  /** 失败原因 */
  errorMessage?: string;
}

/**
 * 会诊管理器
 *
 * 基于协作引擎的并行能力，封装 MDT 医学会诊流程，
 * 并持久化会诊记录供审计与后续查阅。
 */
export class ConsultationManager {
  /** 会诊记录仓库 */
  private readonly records = new Map<string, ConsultationRecord>();

  /**
   * @param engine - 协作引擎（复用其并行与聚合能力）
   * @param executor - Agent 执行器
   */
  constructor(
    private readonly engine: CollaborationEngine,
    private readonly executor: AgentExecutor,
  ) {}

  /**
   * 发起一次多学科会诊
   *
   * @param request - 原始诊疗请求（需携带患者上下文）
   * @param departments - 邀请的科室子代理名称列表
   * @param summaryAgent - 负责汇总的主 Agent 名称（通常为超级调度或主诊科室）
   * @returns 会诊记录
   */
  async initiate(
    request: AgentRequest,
    departments: readonly string[],
    summaryAgent: string,
  ): Promise<ConsultationRecord> {
    const consultationId = `mdt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const patientId = this.extractPatientId(request);

    const record: ConsultationRecord = {
      consultationId,
      patientId,
      encounterId: request.context?.encounterId as string | undefined,
      departments,
      status: 'in_progress',
      opinions: [],
      startedAt: Date.now(),
    };
    this.records.set(consultationId, record);

    try {
      // 主从模式：各科室并行出意见，汇总 Agent 综合
      const aggregated: AggregatedResponse = await this.engine.runMasterSlave(
        summaryAgent,
        departments,
        request,
        this.executor,
      );

      record.opinions = aggregated.partials
        .filter((p) => p.agentId !== summaryAgent)
        .map((p) => this.toOpinion(p));
      record.summary = this.findSummary(aggregated, summaryAgent);
      record.status = 'completed';
      record.completedAt = Date.now();
    } catch (err) {
      record.status = 'failed';
      record.errorMessage = err instanceof Error ? err.message : String(err);
    }

    return record;
  }

  /**
   * 获取会诊记录
   */
  getRecord(consultationId: string): ConsultationRecord | undefined {
    return this.records.get(consultationId);
  }

  /**
   * 列出全部会诊记录（按发起时间倒序）
   */
  listRecords(): readonly ConsultationRecord[] {
    return [...this.records.values()].sort((a, b) => b.startedAt - a.startedAt);
  }

  /**
   * 取消会诊（未完成时）
   *
   * @param consultationId - 会诊ID
   */
  cancel(consultationId: string): boolean {
    const rec = this.records.get(consultationId);
    if (rec?.status !== 'in_progress') return false;
    rec.status = 'cancelled';
    rec.completedAt = Date.now();
    return true;
  }

  // ----------------------------------------------------------
  // 内部方法
  // ----------------------------------------------------------

  /** 将 Agent 响应转为科室意见 */
  private toOpinion(res: AgentResponse): ConsultationOpinion {
    const agreeing = res.output.includes('同意') || res.output.includes('赞同');
    return {
      department: res.agentId,
      opinion: res.output,
      confidence: res.confidence,
      agreeing,
    };
  }

  /** 从聚合结果中提取汇总 Agent 的输出 */
  private findSummary(aggregated: AggregatedResponse, summaryAgent: string): string {
    const master = aggregated.partials.find((p) => p.agentId === summaryAgent);
    return master?.output ?? aggregated.output;
  }

  /** 从请求上下文中尽力提取患者ID */
  private extractPatientId(request: AgentRequest): string {
    const ctx = request.context ?? {};
    return (ctx.patientId as string) ?? 'unknown';
  }
}
