/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 对话 / Agent 相关 API
 */
import { get, post } from '../request';
import { delay, uid } from '@/mock/utils';
import { env } from '@/utils/config';
import type { Conversation, ChatMessage } from '@/types/chat';

export async function fetchConversations(): Promise<Conversation[]> {
  if (env.mockEnabled) {
    await delay(150, 300);
    return [
      {
        id: uid('conv_'),
        title: '今日查房汇总',
        lastMessageAt: new Date(Date.now() - 3600_000).toISOString(),
        messageCount: 12,
        createdAt: new Date(Date.now() - 86400_000).toISOString(),
      },
      {
        id: uid('conv_'),
        title: '王** 诊疗建议',
        lastMessageAt: new Date(Date.now() - 7200_000).toISOString(),
        messageCount: 8,
        createdAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
      },
    ];
  }
  return get<Conversation[]>('/conversations');
}

export async function sendChatMessage(
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  if (env.mockEnabled) {
    await delay(400, 900);
    return {
      id: uid('msg_'),
      conversationId,
      role: 'assistant',
      content: `已收到您的问题：「${content}」。基于患者当前检验与医嘱，建议优先关注血钾异常与抗感染方案调整。`,
      status: 'done',
      toolName: 'lab-interpretation',
      createdAt: new Date().toISOString(),
    };
  }
  return post<ChatMessage>(`/conversations/${conversationId}/messages`, { content });
}
