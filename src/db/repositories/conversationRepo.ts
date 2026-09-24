/**
 * 健澜科技数智医院智能体 - 对话会话与消息 Repository
 * agent.conversations + agent.conversation_messages 表 CRUD。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql, withTx } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';

export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

export interface Conversation {
  id: string; conversationNo: string; userId: string | null; patientId: string | null;
  title: string; status: 'active' | 'archived' | 'deleted'; messageCount: number;
  lastMessageAt: string | null; metadata: Record<string, unknown>; createdAt: string; updatedAt: string;
}

export interface ConversationMessage {
  id: string; conversationId: string; messageNo: string; role: MessageRole;
  content: string | null; toolCalls: Array<Record<string, unknown>>;
  toolCallId: string | null; toolName: string | null; tokensIn: number; tokensOut: number;
  latencyMs: number | null; error: string | null; createdAt: string;
}

export interface MessageCreateInput {
  role: MessageRole; content?: string | null;
  toolCalls?: Array<Record<string, unknown>>; toolCallId?: string | null;
  toolName?: string | null; tokensIn?: number; tokensOut?: number;
  latencyMs?: number | null; error?: string | null;
}

const CONV_COLS = `id, conversation_no, user_id, patient_id, title, status, message_count, last_message_at, metadata, created_at, updated_at`;
const MSG_COLS = `id, conversation_id, message_no, role, content, tool_calls, tool_call_id, tool_name, tokens_in, tokens_out, latency_ms, error, created_at`;

function mapConvRow(row: Record<string, unknown>): Conversation {
  return {
    id: String(row.id), conversationNo: String(row.conversation_no),
    userId: row.user_id ? String(row.user_id) : null,
    patientId: row.patient_id ? String(row.patient_id) : null,
    title: String(row.title), status: row.status as Conversation['status'],
    messageCount: Number(row.message_count),
    lastMessageAt: row.last_message_at ? String(row.last_message_at) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapMsgRow(row: Record<string, unknown>): ConversationMessage {
  return {
    id: String(row.id), conversationId: String(row.conversation_id),
    messageNo: String(row.message_no), role: row.role as MessageRole,
    content: row.content ? String(row.content) : null,
    toolCalls: (row.tool_calls as Array<Record<string, unknown>>) ?? [],
    toolCallId: row.tool_call_id ? String(row.tool_call_id) : null,
    toolName: row.tool_name ? String(row.tool_name) : null,
    tokensIn: Number(row.tokens_in), tokensOut: Number(row.tokens_out),
    latencyMs: row.latency_ms !== null ? Number(row.latency_ms) : null,
    error: row.error ? String(row.error) : null, createdAt: String(row.created_at),
  };
}

function generateNo(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createConversation(input: {
  userId?: string | null; patientId?: string | null; title?: string; metadata?: Record<string, unknown>;
}, sql?: Sql): Promise<Conversation> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO agent.conversations (conversation_no, user_id, patient_id, title, metadata)
    VALUES (${generateNo('c')}, ${input.userId ?? null}, ${input.patientId ?? null},
      ${input.title ?? '新对话'}, ${db.json(toJson(input.metadata ?? {}))})
    RETURNING ${db.unsafe(CONV_COLS)}
  `;
  return mapConvRow(rows[0] as Record<string, unknown>);
}

export async function getConversationById(id: string, sql?: Sql): Promise<Conversation | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(CONV_COLS)} FROM agent.conversations WHERE id = ${id} AND status != 'deleted'`;
  return rows.length > 0 ? mapConvRow(rows[0] as Record<string, unknown>) : null;
}

export async function getConversationByNo(no: string, sql?: Sql): Promise<Conversation | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(CONV_COLS)} FROM agent.conversations WHERE conversation_no = ${no} AND status != 'deleted'`;
  return rows.length > 0 ? mapConvRow(rows[0] as Record<string, unknown>) : null;
}

export async function listConversations(
  options?: { userId?: string; limit?: number; offset?: number }, sql?: Sql,
): Promise<Conversation[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().whereRaw("status != 'deleted'");
  if (options?.userId) qb.where('user_id = ?', options.userId);
  const rows = await dynamicSelect<Record<string, unknown>>(db, CONV_COLS, 'agent.conversations', qb, 'updated_at DESC', options?.limit ?? 50, options?.offset ?? 0);
  return rows.map(mapConvRow);
}

export async function updateConversationTitle(id: string, title: string, sql?: Sql): Promise<Conversation | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE agent.conversations SET title = ${title}, updated_at = now()
    WHERE id = ${id} AND status != 'deleted' RETURNING ${db.unsafe(CONV_COLS)}
  `;
  return rows.length > 0 ? mapConvRow(rows[0] as Record<string, unknown>) : null;
}

export async function appendMessage(
  conversationId: string, input: MessageCreateInput, sql?: Sql,
): Promise<ConversationMessage> {
  return withTx(async (tx) => {
    const msgRows = await tx`
      INSERT INTO agent.conversation_messages (conversation_id, message_no, role, content, tool_calls, tool_call_id, tool_name, tokens_in, tokens_out, latency_ms, error)
      VALUES (${conversationId}, ${generateNo('msg')}, ${input.role}, ${input.content ?? null},
        ${tx.json(toJson(input.toolCalls ?? []))}, ${input.toolCallId ?? null}, ${input.toolName ?? null},
        ${input.tokensIn ?? 0}, ${input.tokensOut ?? 0}, ${input.latencyMs ?? null}, ${input.error ?? null})
      RETURNING ${tx.unsafe(MSG_COLS)}
    `;
    await tx`UPDATE agent.conversations SET message_count = message_count + 1, last_message_at = now(), updated_at = now() WHERE id = ${conversationId}`;
    return mapMsgRow(msgRows[0] as Record<string, unknown>);
  });
}

export async function getMessagesByConversation(
  conversationId: string, options?: { limit?: number; before?: string }, sql?: Sql,
): Promise<ConversationMessage[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('conversation_id = ?', conversationId);
  if (options?.before) qb.where('created_at < ?', options.before);
  const rows = await dynamicSelect<Record<string, unknown>>(db, MSG_COLS, 'agent.conversation_messages', qb, 'created_at ASC', options?.limit ?? 200);
  return rows.map(mapMsgRow);
}

export async function getRecentMessages(
  conversationId: string, limit = 20, sql?: Sql,
): Promise<ConversationMessage[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(MSG_COLS)} FROM agent.conversation_messages
    WHERE conversation_id = ${conversationId} ORDER BY created_at DESC LIMIT ${limit}
  `;
  return (rows as Record<string, unknown>[]).map(mapMsgRow).reverse();
}
