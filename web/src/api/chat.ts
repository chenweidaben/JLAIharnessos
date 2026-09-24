/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 对话相关 API：会话列表 / 新建会话 / 发送消息 / 拉取历史。
 *  - 真实模式：直连 BFF /api/v1/chat/**，失败抛错，不静默回退假数据。
 *  - 演示模式：短路到 web/src/mock（内存态，刷新即丢——与“数据不持久化”水印一致）。
 */
import { get, post } from './client';
import { isDemoMode } from '@/config';
import { delay, uid } from '@/mock/utils';
import { generateMedicalReply } from '@/mock/medicalReplyEngine';
import type { ChatMessage, Conversation } from '@/types/chat';

/** POST /chat/conversations/:id/messages 的 BFF 返回结构（见 chatAggregator.ChatTurnResult） */
export interface SendMessageResult {
  message: ChatMessage;
  streamSessionId: string;
}

/* ------------------------- 演示模式内存态 ------------------------- */
interface DemoConversation extends Conversation {
  _messages: ChatMessage[];
}

const demoStore: { conversations: DemoConversation[] } = { conversations: [] };

function seedDemoConversations(): DemoConversation[] {
  if (demoStore.conversations.length > 0) return demoStore.conversations;
  const now = Date.now();
  const seed: DemoConversation[] = [
    {
      id: uid('c_'),
      title: '今日查房汇总',
      lastMessageAt: new Date(now - 3600_000).toISOString(),
      messageCount: 2,
      createdAt: new Date(now - 86400_000).toISOString(),
      _messages: [
        {
          id: uid('msg_'),
          conversationId: '',
          role: 'user',
          content: '3 床王** 今早的检验结果有哪些需要关注？',
          status: 'done',
          createdAt: new Date(now - 3600_000).toISOString(),
        },
        {
          id: uid('msg_'),
          conversationId: '',
          role: 'assistant',
          content:
            '王**（67 岁，呼吸内科）本次血气提示氧合改善，血钾 3.1 mmol/L 偏低，建议复查电解质并补钾；CRP 仍偏高，感染尚未完全控制。',
          status: 'done',
          createdAt: new Date(now - 3590_000).toISOString(),
        },
      ],
    },
    {
      id: uid('c_'),
      title: '李** 诊疗建议',
      lastMessageAt: new Date(now - 7200_000).toISOString(),
      messageCount: 1,
      createdAt: new Date(now - 86400_000 * 2).toISOString(),
      _messages: [
        {
          id: uid('msg_'),
          conversationId: '',
          role: 'user',
          content: '高血压 3 级很高危患者的出院用药方案？',
          status: 'done',
          createdAt: new Date(now - 7200_000).toISOString(),
        },
      ],
    },
  ];
  seed.forEach((c) => c._messages.forEach((m) => (m.conversationId = c.id)));
  demoStore.conversations = seed;
  return seed;
}

function toConversation(c: DemoConversation): Conversation {
  return {
    id: c.id,
    title: c.title,
    patientId: c.patientId,
    lastMessageAt: c.lastMessageAt,
    messageCount: c._messages.length,
    createdAt: c.createdAt,
  };
}

/* ------------------------------- API ------------------------------- */

/** 获取会话列表 */
export async function listConversations(): Promise<Conversation[]> {
  if (isDemoMode) {
    await delay(120, 260);
    return seedDemoConversations()
      .slice()
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .map(toConversation);
  }
  return get<Conversation[]>('/chat/conversations');
}

/** 新建会话 */
export async function createConversation(title?: string): Promise<Conversation> {
  if (isDemoMode) {
    await delay(80, 160);
    const now = new Date().toISOString();
    const conv: DemoConversation = {
      id: uid('c_'),
      title: title?.trim() || '新对话',
      lastMessageAt: now,
      messageCount: 0,
      createdAt: now,
      _messages: [],
    };
    demoStore.conversations.unshift(conv);
    return toConversation(conv);
  }
  const data = await post<Record<string, unknown>>('/chat/conversations', { title });
  return {
    id: String(data.id),
    title: String(data.title ?? '新对话'),
    lastMessageAt: String(data.updatedAt ?? data.createdAt ?? new Date().toISOString()),
    messageCount: Number(data.messageCount ?? 0),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
  };
}

/** 拉取某会话历史消息 */
export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  if (isDemoMode) {
    await delay(100, 220);
    const conv = seedDemoConversations().find((c) => c.id === conversationId);
    return (conv?._messages ?? []).map((m) => ({ ...m }));
  }
  const list = await get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
  return list.map((m) => ({ ...m, status: m.status ?? ('done' as const) }));
}

interface RawTurnMessage {
  id: string;
  role: 'assistant';
  content: string;
  createdAt: string;
}

/**
 * 发送用户消息。
 * 真实模式：POST 同步首包返回 assistant 骨架消息 + streamSessionId，
 *           后续增量经 WebSocket /ws/chat 的 agent:delta 推送（见 websocket.ts）。
 * 演示模式：基于本地医疗回复引擎生成回复（页面再做逐字流式动画）。
 */
export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<SendMessageResult> {
  if (isDemoMode) {
    await delay(300, 700);
    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: uid('msg_'),
      conversationId,
      role: 'user',
      content,
      status: 'done',
      createdAt: now,
    };
    const assistantMsg: ChatMessage = {
      id: uid('msg_'),
      conversationId,
      role: 'assistant',
      content: generateMedicalReply(content),
      status: 'streaming',
      createdAt: new Date().toISOString(),
    };
    const conv = demoStore.conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv._messages.push(userMsg, assistantMsg);
      conv.lastMessageAt = now;
      conv.messageCount = conv._messages.length;
    }
    return { message: assistantMsg, streamSessionId: uid('ss_') };
  }

  const data = await post<{ message: RawTurnMessage; streamSessionId: string }>(
    `/chat/conversations/${conversationId}/messages`,
    { content },
  );
  return {
    message: {
      id: data.message.id,
      conversationId,
      role: 'assistant',
      content: data.message.content,
      status: 'streaming',
      createdAt: data.message.createdAt ?? new Date().toISOString(),
    },
    streamSessionId: data.streamSessionId,
  };
}
