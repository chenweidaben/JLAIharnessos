/**
 * 角色 / LLM / 工具 / 仓储端口契约（契约 §5 / §6 / §7 / §10）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 本文件定义核心包对外依赖的接口签名：四角色实现 RolePort；后续 BFF 仓储分片
 * 实现 ConsultAgentPort；DEMO 运行时 sessionRuntime 提供进程内内存短路实现。
 * 核心包不直接依赖 BFF 路由、前端或数据库迁移，保持自包含、可单测。
 */

import type { ToolRegistry } from './tools/toolRegistry';
import type {
  ConsultAuditEntry,
  ConsultDocument,
  ConsultDraft,
  ConsultMessage,
  ConsultProfileMemory,
  ConsultThread,
  EvidenceItem,
  IntentKind,
  ProfileFact,
  RoleKind,
} from './types';

// ---------------------------------------------------------------------------
// 角色端口（契约 §5）
// ---------------------------------------------------------------------------

/** 角色处理入参 */
export interface RoleInput {
  thread: ConsultThread;
  history: ConsultMessage[];
  userText: string;
  intent: IntentKind;
  tools: ToolRegistry;
  profile: ConsultProfileMemory;
  traceId: string;
}

/** 角色处理出参 */
export interface RoleOutput {
  reply: string;
  nextRole: RoleKind | null;
  draft: ConsultDraft | null;
  evidence: EvidenceItem[];
  followUpQuestions: string[];
  memoryUpdates: ProfileFact[];
  audit: ConsultAuditEntry[];
  degradedLlm: boolean;
}

/** 统一角色端口契约：四角色实现同一 handle 签名 */
export interface RolePort {
  kind: RoleKind;
  handle(input: RoleInput): Promise<RoleOutput>;
}

// ---------------------------------------------------------------------------
// 仓储端口（BFF 仓储分片后续实现同一端口；DEMO 模式由 sessionRuntime 短路）
// ---------------------------------------------------------------------------

/** 咨询智能体仓储端口：线程 / 消息 / 草稿 / 审计 / 画像 / 文档读写 */
export interface ConsultAgentPort {
  /** 按 ID 与用户 ID 查询线程；不存在返回 null */
  findThread(threadId: string, userId: string): Promise<ConsultThread | null>;
  /** 列出某用户全部线程（按 updatedAt 倒序由实现方决定） */
  listThreads(userId: string): Promise<ConsultThread[]>;
  /** 保存线程（新建或更新），返回持久化后的线程实体 */
  saveThread(thread: ConsultThread): Promise<ConsultThread>;
  /** 列出线程历史消息（按 createdAt 升序） */
  listMessages(threadId: string): Promise<ConsultMessage[]>;
  /** 保存消息，返回持久化后的消息实体 */
  saveMessage(message: ConsultMessage): Promise<ConsultMessage>;
  /** 列出线程指定类型草稿（按 createdAt 倒序由实现方决定） */
  listDrafts(threadId: string, kind: ConsultDraft['kind']): Promise<ConsultDraft[]>;
  /** 保存草稿，返回持久化后的草稿实体 */
  saveDraft(draft: ConsultDraft): Promise<ConsultDraft>;
  /** 列出线程审计条目（按 createdAt 升序） */
  listAudit(threadId: string): Promise<ConsultAuditEntry[]>;
  /** 保存审计条目（fire-and-forget 语义由调用方决定，端口只负责落库） */
  saveAudit(entry: ConsultAuditEntry): Promise<void>;
  /** 读取用户画像；不存在时返回空白画像由实现方约定 */
  getProfile(userId: string): Promise<ConsultProfileMemory>;
  /** 保存画像，返回持久化后的画像实体 */
  saveProfile(profile: ConsultProfileMemory): Promise<ConsultProfileMemory>;
  /** 列出线程上传文档 */
  listDocuments(threadId: string): Promise<ConsultDocument[]>;
  /** 保存文档，返回持久化后的文档实体 */
  saveDocument(document: ConsultDocument): Promise<ConsultDocument>;
}
