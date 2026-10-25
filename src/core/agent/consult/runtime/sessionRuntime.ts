/**
 * DEMO 进程内会话运行时（契约 §0 runtime/sessionRuntime.ts，§10 落库短路）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * DEMO_MODE=1 时线程 / 消息 / 草稿 / 审计 / 画像 / 文档全部存储于进程内 Map，
 * 不连接数据库；后续非 DEMO 模式由 consultAgentRepo 实现同一 ConsultAgentPort。
 * 本类仅供核心包 DEMO 短路与本分片单元测试使用，不被 BFF 路由直接引用。
 */

import { createProfileMemory } from '../memory/profileMemory';
import type { MemoryCheckpoint } from '../memory/shortTermMemory';
import type { ConsultAgentPort } from '../ports';
import { newId, nowIso } from '../roleSupport';
import type {
  ConsultAuditEntry,
  ConsultDocument,
  ConsultDraft,
  ConsultMessage,
  ConsultProfileMemory,
  ConsultThread,
  IntentKind,
  SafetyLevel,
} from '../types';

/** 是否处于 DEMO_MODE（1 开启）；非 DEMO 模式由 BFF 仓储分片落库 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === '1';
}

/** 新建线程入参 */
export interface CreateThreadParams {
  userId: string;
  title?: string;
  patientId?: string | null;
  intent?: IntentKind;
  safetyLevel?: SafetyLevel;
}

/** 进程内咨询会话存储：实现 ConsultAgentPort 全部读写方法 */
export class SessionRuntime implements ConsultAgentPort {
  private readonly threads = new Map<string, ConsultThread>();
  private readonly messages = new Map<string, ConsultMessage[]>();
  private readonly drafts = new Map<string, ConsultDraft[]>();
  private readonly audits = new Map<string, ConsultAuditEntry[]>();
  private readonly profiles = new Map<string, ConsultProfileMemory>();
  private readonly documents = new Map<string, ConsultDocument[]>();
  private readonly checkpoints = new Map<string, MemoryCheckpoint>();

  // ---- 线程 ----

  async findThread(threadId: string, userId: string): Promise<ConsultThread | null> {
    const thread = this.threads.get(threadId);
    return thread?.userId === userId ? thread : null;
  }

  async listThreads(userId: string): Promise<ConsultThread[]> {
    return [...this.threads.values()]
      .filter((thread) => thread.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveThread(thread: ConsultThread): Promise<ConsultThread> {
    this.threads.set(thread.id, thread);
    return thread;
  }

  /** 在内存中新建线程并落表，返回初始线程实体 */
  createThread(params: CreateThreadParams): ConsultThread {
    const now = nowIso();
    const titleText = params.title?.trim();
    const thread: ConsultThread = {
      id: newId('thread'),
      userId: params.userId,
      patientId: params.patientId ?? null,
      title: titleText && titleText.length > 0 ? titleText : '在线咨询会话',
      status: 'idle',
      intent: params.intent ?? 'unknown',
      safetyLevel: params.safetyLevel ?? 'normal',
      currentRole: null,
      meta: {},
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.threads.set(thread.id, thread);
    return thread;
  }

  // ---- 消息 ----

  async listMessages(threadId: string): Promise<ConsultMessage[]> {
    return [...(this.messages.get(threadId) ?? [])];
  }

  async saveMessage(message: ConsultMessage): Promise<ConsultMessage> {
    const list = this.messages.get(message.threadId) ?? [];
    list.push(message);
    this.messages.set(message.threadId, list);
    return message;
  }

  // ---- 草稿 ----

  async listDrafts(threadId: string, kind: ConsultDraft['kind']): Promise<ConsultDraft[]> {
    return (this.drafts.get(threadId) ?? [])
      .filter((draft) => draft.kind === kind)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveDraft(draft: ConsultDraft): Promise<ConsultDraft> {
    const list = this.drafts.get(draft.threadId) ?? [];
    list.push(draft);
    this.drafts.set(draft.threadId, list);
    return draft;
  }

  // ---- 审计 ----

  async listAudit(threadId: string): Promise<ConsultAuditEntry[]> {
    return [...(this.audits.get(threadId) ?? [])].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  async saveAudit(entry: ConsultAuditEntry): Promise<void> {
    const list = this.audits.get(entry.threadId) ?? [];
    list.push(entry);
    this.audits.set(entry.threadId, list);
  }

  // ---- 画像 ----

  async getProfile(userId: string): Promise<ConsultProfileMemory> {
    const existing = this.profiles.get(userId);
    return existing ?? createProfileMemory(userId);
  }

  async saveProfile(profile: ConsultProfileMemory): Promise<ConsultProfileMemory> {
    this.profiles.set(profile.userId, profile);
    return profile;
  }

  // ---- 文档 ----

  async listDocuments(threadId: string): Promise<ConsultDocument[]> {
    return [...(this.documents.get(threadId) ?? [])];
  }

  async saveDocument(document: ConsultDocument): Promise<ConsultDocument> {
    const list = this.documents.get(document.threadId) ?? [];
    list.push(document);
    this.documents.set(document.threadId, list);
    return document;
  }

  // ---- 短期记忆 checkpoint ----

  /** 保存线程消息 checkpoint（短期记忆 DEMO 存储） */
  saveCheckpoint(checkpointEntry: MemoryCheckpoint): void {
    this.checkpoints.set(checkpointEntry.threadId, checkpointEntry);
  }

  /** 读取线程最近 checkpoint；不存在返回 null */
  getCheckpoint(threadId: string): MemoryCheckpoint | null {
    return this.checkpoints.get(threadId) ?? null;
  }

  /** 清空全部内存数据（测试隔离使用） */
  clear(): void {
    this.threads.clear();
    this.messages.clear();
    this.drafts.clear();
    this.audits.clear();
    this.profiles.clear();
    this.documents.clear();
    this.checkpoints.clear();
  }
}

/** 创建 DEMO 进程内运行时实例 */
export function createDemoRuntime(): SessionRuntime {
  return new SessionRuntime();
}
