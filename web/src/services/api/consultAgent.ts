/**
 * 健澜科技 jlmedaios - AI 咨询助手服务层（consult-agent M86-E）
 *
 * 对接 BFF /api/v1/consult-agent/* ：
 *   - 普通读写走 axios get/post（baseURL 已含 /api/v1，此处使用相对路径）；
 *   - SSE 实时流与事件回放走原生 fetch + ReadableStream 手动解析，
 *     携带 Authorization: Bearer token 与 X-CSRF-Token 双重提交；
 *   - 任何网络 / HTTP / 协议错误一律经 onError 上报，前端不本地编造临床回复。
 *
 * 视图类型与冻结契约 §1 对齐，字段名不得改名；SSE 事件映射契约 §11 八类事件。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { tokenStorage } from '@/utils/auth';
import { env } from '@/utils/config';
import { getCsrfToken } from '@/utils/cookie';

import { get, post } from '../request';

// ---------------------------------------------------------------------------
// 契约 §1.1 枚举（前后端一致，禁止另立字面量）
// ---------------------------------------------------------------------------

/** 角色标识：分诊主管 / 问诊追问 / 医师 / 药师 */
export type RoleKind = 'supervisor' | 'examiner' | 'doctor' | 'pharmacist';

/** 会话线程状态机状态 */
export type ThreadStatus =
  | 'idle'
  | 'collecting'
  | 'clarifying'
  | 'drafting'
  | 'review_pending'
  | 'escalated'
  | 'closed'
  | 'aborted';

/** 用户意图分类结果 */
export type IntentKind =
  | 'greeting'
  | 'symptom_report'
  | 'clarification_answer'
  | 'medication_question'
  | 'chronic_management'
  | 'acute_emergency'
  | 'document_upload'
  | 'exit'
  | 'unknown';

/** 安全等级：正常 / 需谨慎提示 / 急症旁路 */
export type SafetyLevel = 'normal' | 'caution' | 'acute';

/** 消息发言方 */
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

/** AI 草稿类型：诊断建议草稿 / 用药建议草稿 */
export type DraftKind = 'diagnosis' | 'prescription';

/** AI 草稿恒为待医师复核，不产生 approved/rejected AI 态 */
export type DraftStatus = 'pending_review';

/** 工具调用状态 */
export type ToolStatus = 'success' | 'error' | 'skipped';

// ---------------------------------------------------------------------------
// 契约 §1.2 实体接口
// ---------------------------------------------------------------------------

/** 证据条目：知识 / 药品 / 过敏 / 相互作用 / 病史 / 文档 */
export interface EvidenceItem {
  kind: 'knowledge' | 'drug' | 'allergy' | 'interaction' | 'history' | 'document';
  label: string;
  source: string;
  snippet: string;
}

/** 咨询会话线程 */
export interface ConsultThread {
  id: string;
  userId: string;
  patientId: string | null;
  title: string;
  status: ThreadStatus;
  intent: IntentKind;
  safetyLevel: SafetyLevel;
  currentRole: RoleKind | null;
  meta: Record<string, unknown>;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 工具调用审计记录：仅留脱敏摘要，禁止保存 / 回显原始入参明文（契约 §15-5） */
export interface ToolCallRecord {
  callId: string;
  name: string;
  status: ToolStatus;
  durationMs: number;
  evidenceCount: number;
  errorClass: string | null;
  summary: string | null;
}

/** 咨询消息 */
export interface ConsultMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  intent: IntentKind | null;
  roleKind: RoleKind | null;
  toolCalls: ToolCallRecord[] | null;
  toolName: string | null;
  safetyLevel: SafetyLevel;
  disclaimer: string;
  traceId: string;
  createdAt: string;
}

/** 用户上传文档及其抽取证据 */
export interface ConsultDocument {
  id: string;
  threadId: string;
  messageId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  evidenceSummary: string | null;
  extractedEvidence: EvidenceItem[];
  createdAt: string;
}

/** AI 草稿：诊断建议 / 用药建议，红线字面量由后端 zod 强校验（契约 §15-3） */
export interface ConsultDraft {
  id: string;
  threadId: string;
  kind: DraftKind;
  title: string;
  summary: string;
  content: string;
  evidence: EvidenceItem[];
  /** 恒为 true：AI 草稿必须经执业医师复核 */
  needsPhysicianReview: true;
  /** 恒为 false：AI 不开具院外处方 */
  isOutOfHospitalPrescription: false;
  status: DraftStatus;
  draftHash: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 审计条目：actorRole + traceId 全程透传（契约 §15-6） */
export interface ConsultAuditEntry {
  id: string;
  threadId: string;
  actorRole: RoleKind | 'system' | 'user';
  action: string;
  toolName: string | null;
  toolStatus: ToolStatus | null;
  durationMs: number | null;
  evidenceCount: number | null;
  errorClass: string | null;
  traceId: string;
  /** 脱敏后的结构化摘要，禁止原始入参明文 */
  detail: Record<string, unknown>;
  createdAt: string;
}

/** 画像事实条目 */
export interface ProfileFact {
  key: string;
  value: string;
  source: string;
  updatedAt: string;
}

/** 长期画像记忆 */
export interface ConsultProfileMemory {
  id: string;
  userId: string;
  threadId: string | null;
  facts: ProfileFact[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 契约 §11 SSE 事件契约（前后端一致）
// ---------------------------------------------------------------------------

export type SseEvent =
  | { type: 'delta'; text: string }
  | {
      type: 'tool';
      stage: 'start' | 'end';
      callId: string;
      toolName: string;
      success: boolean;
      summary?: string;
      evidenceCount?: number;
    }
  | { type: 'safety:acute'; matched: string[]; guidance: string }
  | { type: 'draft'; draft: ConsultDraft }
  | { type: 'disclaimer'; text: string }
  | { type: 'meta'; confidence: 'high' | 'medium' | 'low'; disclaimer: string }
  | { type: 'done'; messageId: string }
  | { type: 'error'; code: string; message: string };

/** SSE 工具事件（onTool 回传载荷） */
export interface ConsultToolEvent {
  stage: 'start' | 'end';
  callId: string;
  toolName: string;
  success: boolean;
  summary?: string;
  evidenceCount?: number;
}

/** SSE 急症旁路事件载荷 */
export interface ConsultAcutePayload {
  matched: string[];
  guidance: string;
}

/** SSE 收尾元信息（confidence + disclaimer） */
export interface ConsultMetaPayload {
  confidence: 'high' | 'medium' | 'low';
  disclaimer: string;
}

/** SSE 完成事件载荷 */
export interface ConsultDonePayload {
  messageId: string;
}

/** 流式事件回调：八类事件逐一映射，错误经 onError 上报 */
export interface ConsultStreamHandlers {
  /** delta：增量文本（追加渲染，形成打字机效果） */
  onDelta: (text: string) => void;
  /** tool：工具调用开始 / 结束（仅工具名 + 摘要，不下发原始入参） */
  onTool: (event: ConsultToolEvent) => void;
  /** safety:acute：急症旁路引导与命中词 */
  onAcute: (payload: ConsultAcutePayload) => void;
  /** draft：诊断 / 处方草稿（AI 辅助建议，待医师复核） */
  onDraft: (draft: ConsultDraft) => void;
  /** disclaimer：免责声明帧 */
  onDisclaimer: (text: string) => void;
  /** meta：收尾置信度 + 免责声明 */
  onMeta: (meta: ConsultMetaPayload) => void;
  /** done：本轮回复落库完成 */
  onDone: (payload: ConsultDonePayload) => void;
  /** error：网络 / HTTP / 协议错误，前端不本地编造回复 */
  onError: (code: string, message: string) => void;
}

// ---------------------------------------------------------------------------
// 契约 §12 普通请求载荷（axios 解包后的 data 视图）
// ---------------------------------------------------------------------------

/** 创建会话入参（threadCreateSchema） */
export interface CreateThreadInput {
  title?: string;
  patientId?: string | null;
  initialMessage?: string;
}

/** 创建会话响应：{ thread, messages, draft? } */
export interface CreateThreadResult {
  thread: ConsultThread;
  messages: ConsultMessage[];
  draft?: ConsultDraft | null;
}

/** 发送消息响应：{ thread, message, draft?, events? } */
export interface SendMessageResult {
  thread: ConsultThread;
  message: ConsultMessage;
  draft?: ConsultDraft | null;
  events?: SseEvent[];
}

/** 语音转写响应：{ text, message? } */
export interface TranscribeResult {
  text: string;
  message?: ConsultMessage | null;
}

/** 语音转写入参（transcript / audioText 至少其一非空） */
export interface TranscribeInput {
  transcript?: string;
  audioText?: string;
}

/** 规则快照条目（工具清单） */
export interface RulesToolDescriptor {
  name: string;
  description: string;
  aliases: string[];
}

/** 规则快照响应（/rules/snapshot） */
export interface RulesSnapshot {
  version: string;
  disclaimer: string;
  acuteKeywords: string[];
  tools: RulesToolDescriptor[];
  permissions: string[];
}

// ---------------------------------------------------------------------------
// 普通请求服务函数（契约 §12 端点 1–7、10–12）
// ---------------------------------------------------------------------------

/** 创建会话（可带首条消息） */
export async function createThread(input: CreateThreadInput): Promise<CreateThreadResult> {
  return post<CreateThreadResult>('/consult-agent/threads', input);
}

/** 会话列表（{ threads }） */
export async function listThreads(): Promise<ConsultThread[]> {
  const data = await get<{ threads: ConsultThread[] }>('/consult-agent/threads');
  return data.threads ?? [];
}

/** 发送消息（非流式快照；流式主路径见 streamReply） */
export async function sendMessage(threadId: string, content: string): Promise<SendMessageResult> {
  return post<SendMessageResult>(`/consult-agent/threads/${threadId}/messages`, { content });
}

/** 历史消息（{ messages }） */
export async function listMessages(threadId: string): Promise<ConsultMessage[]> {
  const data = await get<{ messages: ConsultMessage[] }>(
    `/consult-agent/threads/${threadId}/messages`,
  );
  return data.messages ?? [];
}

/** 语音转写 DEMO：归一化文本（{ text, message? }） */
export async function transcribe(
  threadId: string,
  payload: TranscribeInput,
): Promise<TranscribeResult> {
  return post<TranscribeResult>(`/consult-agent/threads/${threadId}/transcribe`, payload);
}

/** 审计轨迹（{ entries }，仅脱敏摘要，不回显原始入参） */
export async function listAudit(threadId: string): Promise<ConsultAuditEntry[]> {
  const data = await get<{ entries: ConsultAuditEntry[] }>(
    `/consult-agent/threads/${threadId}/audit`,
  );
  return data.entries ?? [];
}

/** 规则快照（免责声明 / 急症词表 / 工具清单 / 权限码） */
export async function getRulesSnapshot(): Promise<RulesSnapshot> {
  return get<RulesSnapshot>('/consult-agent/rules/snapshot');
}

/** 查询指定类型草稿（{ draft: ConsultDraft | null }），kind ∈ diagnosis/prescription */
export async function getDraft(threadId: string, kind: DraftKind): Promise<ConsultDraft | null> {
  const data = await get<{ draft: ConsultDraft | null }>(
    `/consult-agent/threads/${threadId}/drafts/${kind}`,
  );
  return data.draft ?? null;
}

/** 长期画像事实（{ facts }） */
export async function getProfile(): Promise<ProfileFact[]> {
  const data = await get<{ facts: ProfileFact[] }>('/consult-agent/profile');
  return data.facts ?? [];
}

/** 退出 / 关闭会话（{ thread }） */
export async function exitThread(threadId: string): Promise<ConsultThread> {
  const data = await post<{ thread: ConsultThread }>(`/consult-agent/threads/${threadId}/exit`);
  return data.thread;
}

// ---------------------------------------------------------------------------
// SSE 流式（契约 §12 端点 8、9；契约 §11 八类事件 + [DONE] 结束帧）
// ---------------------------------------------------------------------------

/** 单帧解析后的原始载荷（宽松字段读取，分发前逐项校验类型） */
interface RawStreamFrame {
  type?: string;
  text?: string;
  stage?: string;
  callId?: string;
  toolName?: string;
  success?: boolean;
  summary?: string;
  evidenceCount?: number;
  matched?: unknown;
  guidance?: string;
  draft?: ConsultDraft;
  confidence?: string;
  disclaimer?: string;
  messageId?: string;
  code?: string;
  message?: string;
}

/** 解析单帧 SSE 文本（允许多行 data: 拼接），按契约 §11 分发到对应回调 */
function handleFrame(rawFrame: string, handlers: ConsultStreamHandlers): void {
  const dataLines = rawFrame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim());
  if (dataLines.length === 0) return;
  const data = dataLines.join('');
  if (data === '[DONE]') return;

  let payload: RawStreamFrame;
  try {
    payload = JSON.parse(data) as RawStreamFrame;
  } catch {
    return;
  }

  switch (payload.type) {
    case 'delta':
      if (typeof payload.text === 'string') handlers.onDelta(payload.text);
      return;
    case 'tool':
      handlers.onTool({
        stage: payload.stage === 'end' ? 'end' : 'start',
        callId: String(payload.callId ?? ''),
        toolName: String(payload.toolName ?? ''),
        success: payload.success !== false,
        summary: typeof payload.summary === 'string' ? payload.summary : undefined,
        evidenceCount:
          typeof payload.evidenceCount === 'number' ? payload.evidenceCount : undefined,
      });
      return;
    case 'safety:acute':
      handlers.onAcute({
        matched: Array.isArray(payload.matched) ? payload.matched.map((item) => String(item)) : [],
        guidance: typeof payload.guidance === 'string' ? payload.guidance : '',
      });
      return;
    case 'draft':
      if (payload.draft) handlers.onDraft(payload.draft);
      return;
    case 'disclaimer':
      if (typeof payload.text === 'string') handlers.onDisclaimer(payload.text);
      return;
    case 'meta':
      handlers.onMeta({
        confidence:
          payload.confidence === 'high' || payload.confidence === 'medium'
            ? payload.confidence
            : 'low',
        disclaimer: typeof payload.disclaimer === 'string' ? payload.disclaimer : '',
      });
      return;
    case 'done':
      handlers.onDone({ messageId: String(payload.messageId ?? '') });
      return;
    case 'error':
      handlers.onError(String(payload.code ?? 'ERROR'), String(payload.message ?? '咨询服务异常'));
      return;
    default:
      return;
  }
}

/**
 * 原生 fetch + ReadableStream 消费 SSE 流（POST 实时流 / GET 回放共用）。
 * 网络 / HTTP / 读取错误一律经 handlers.onError 上报；主动 AbortError 静默结束。
 */
async function consumeSseStream(
  url: string,
  init: RequestInit,
  handlers: ConsultStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = tokenStorage.getAccessToken();
  const csrfToken = getCsrfToken();

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(init.headers ?? {}),
      },
      signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    handlers.onError('NETWORK', e instanceof Error ? e.message : '网络异常，无法连接 BFF');
    return;
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    handlers.onError(
      'HTTP_ERROR',
      `BFF 返回 ${response.status}：${detail.slice(0, 200) || '请确认 BFF 已启动且已登录'}`,
    );
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const rawFrame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        handleFrame(rawFrame, handlers);
      }
    }
    if (buffer.trim()) handleFrame(buffer, handlers);
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    handlers.onError('STREAM', e instanceof Error ? e.message : '流式读取中断');
  } finally {
    reader.releaseLock();
  }
}

/** SSE 实时流式发起一轮对话（POST /threads/:threadId/stream） */
export async function streamReply(
  threadId: string,
  content: string,
  handlers: ConsultStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  await consumeSseStream(
    `${env.apiBaseUrl}/consult-agent/threads/${threadId}/stream`,
    { method: 'POST', body: JSON.stringify({ content }) },
    handlers,
    signal,
  );
}

/** SSE 回放历史事件（GET /threads/:threadId/stream/replay，按时间顺序重放持久化事件） */
export async function replayEvents(
  threadId: string,
  handlers: ConsultStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  await consumeSseStream(
    `${env.apiBaseUrl}/consult-agent/threads/${threadId}/stream/replay`,
    { method: 'GET' },
    handlers,
    signal,
  );
}
