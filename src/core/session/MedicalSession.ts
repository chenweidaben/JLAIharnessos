/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { MEDICAL_SESSION_CONFIG } from '@/constants';
import type {
  MedicalMessage,
  MedicalSession as MedicalSessionData,
  MedicalSessionStatus,
  MedicalSessionType,
  MessageRole,
} from '@/types';

/** 医疗上下文快照（随会话保存） */
export interface MedicalContextSnapshot {
  /** 当前患者ID */
  patientId?: string;
  /** 当前就诊ID */
  encounterId?: string;
  /** 当前科室 */
  department?: string;
  /** 当前诊断标签 */
  diagnosisTags?: readonly string[];
  /** 任意额外快照字段 */
  [key: string]: unknown;
}

/**
 * 创建会话输入
 */
export interface CreateSessionInput {
  /** 会话类型 */
  sessionType: MedicalSessionType;
  /** 创建用户ID */
  userId: string;
  /** 所属科室 */
  department: string;
  /** 会话标题（缺省时自动生成） */
  title?: string;
  /** 关联患者ID */
  patientId?: string;
  /** 关联就诊ID */
  encounterId?: string;
  /** 上下文快照 */
  context?: MedicalContextSnapshot;
}

/** 消息 ID 计数器（进程内） */
let messageCounter = 0;

/**
 * 医疗会话模型
 *
 * 扩展自 types 中的 MedicalSession 数据结构，提供消息追加、状态流转、
 * 分页切片等行为。会话可序列化为 JSON 供 SessionManager 持久化。
 */
export class MedicalSessionModel implements MedicalSessionData {
  public readonly sessionId: string;
  public readonly sessionType: MedicalSessionType;
  public readonly patientId?: string;
  public readonly encounterId?: string;
  public readonly userId: string;
  public readonly department: string;
  public title: string;
  public status: MedicalSessionStatus;
  public readonly createdAt: number;
  public updatedAt: number;
  public completedAt?: number;
  public messages: MedicalMessage[];
  public context?: Record<string, unknown>;
  public metadata?: Record<string, unknown>;

  /**
   * 构造会话模型
   *
   * @param input - 创建输入
   */
  constructor(input: CreateSessionInput) {
    const now = Date.now();
    this.sessionId = `sess_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.sessionType = input.sessionType;
    this.patientId = input.patientId;
    this.encounterId = input.encounterId;
    this.userId = input.userId;
    this.department = input.department;
    this.title =
      input.title ??
      `${this.typeLabel(input.sessionType)}-${new Date(now).toISOString().slice(0, 10)}`;
    this.status = 'active';
    this.createdAt = now;
    this.updatedAt = now;
    this.messages = [];
    this.context = input.context ? { ...input.context } : {};
    this.metadata = {};
  }

  /**
   * 追加消息
   *
   * @param role - 消息角色
   * @param content - 消息内容
   * @param extra - 附加字段（toolCalls/toolResults/metadata）
   * @returns 新增消息
   */
  public appendMessage(
    role: MessageRole,
    content: string,
    extra: Partial<Pick<MedicalMessage, 'toolCalls' | 'toolResults' | 'tokens' | 'metadata'>> = {},
  ): MedicalMessage {
    const message: MedicalMessage = {
      messageId: `msg_${Date.now().toString(36)}_${++messageCounter}`,
      role,
      content,
      timestamp: Date.now(),
      ...extra,
    };
    this.messages.push(message);
    this.updatedAt = Date.now();
    return message;
  }

  /**
   * 分页获取消息
   *
   * @param page - 页码（从 1 开始）
   * @param pageSize - 每页条数（默认配置）
   * @returns 该页消息
   */
  public getMessagesPage(
    page: number,
    pageSize: number = MEDICAL_SESSION_CONFIG.MESSAGES_PER_PAGE,
  ): MedicalMessage[] {
    const start = (page - 1) * pageSize;
    return this.messages.slice(start, start + pageSize);
  }

  /**
   * 总 Token 估算
   */
  public get totalTokens(): number {
    return this.messages.reduce(
      (sum, m) => sum + (m.tokens?.input ?? 0) + (m.tokens?.output ?? 0),
      0,
    );
  }

  /**
   * 总消息数
   */
  public get totalMessages(): number {
    return this.messages.length;
  }

  /**
   * 完成会话
   */
  public complete(): void {
    this.status = 'completed';
    this.completedAt = Date.now();
    this.updatedAt = Date.now();
  }

  /**
   * 归档会话
   */
  public archive(): void {
    this.status = 'archived';
    this.updatedAt = Date.now();
  }

  /**
   * 转换为纯数据对象（用于持久化）
   */
  public toData(): MedicalSessionData {
    return {
      sessionId: this.sessionId,
      sessionType: this.sessionType,
      patientId: this.patientId,
      encounterId: this.encounterId,
      userId: this.userId,
      department: this.department,
      title: this.title,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      messages: this.messages,
      context: this.context,
      metadata: this.metadata,
      totalMessages: this.messages.length,
      totalTokens: this.totalTokens,
    };
  }

  /**
   * 从纯数据对象恢复会话模型
   *
   * @param data - 序列化数据
   * @returns 会话模型实例
   */
  public static fromData(data: MedicalSessionData): MedicalSessionModel {
    const model = new MedicalSessionModel({
      sessionType: data.sessionType,
      userId: data.userId,
      department: data.department,
      title: data.title,
      patientId: data.patientId,
      encounterId: data.encounterId,
    });
    // 覆盖内部状态以精确还原
    (model as { sessionId: string }).sessionId = data.sessionId;
    model.title = data.title;
    model.status = data.status;
    (model as { createdAt: number }).createdAt = data.createdAt;
    model.updatedAt = data.updatedAt;
    model.completedAt = data.completedAt;
    model.messages = [...data.messages];
    model.context = { ...(data.context ?? {}) };
    model.metadata = { ...(data.metadata ?? {}) };
    return model;
  }

  /** 会话类型中文名 */
  private typeLabel(type: MedicalSessionType): string {
    const map: Record<MedicalSessionType, string> = {
      outpatient_consultation: '门诊问诊',
      ward_round: '查房记录',
      multidisciplinary_consultation: '会诊讨论',
      record_quality_control: '病历质控',
      teaching_training: '教学培训',
      research_analysis: '科研分析',
      emergency: '急诊',
      admin: '管理操作',
    };
    return map[type] ?? '智能会话';
  }
}
