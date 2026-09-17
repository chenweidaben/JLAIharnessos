/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * chatStore 测试：对话列表 / 消息 / 流式状态
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/store/chatStore';
import { createConversation, createMessage } from '@fixtures/factories';

beforeEach(() => {
  useChatStore.getState().reset();
});

describe('chatStore 初始状态', () => {
  it('空会话列表、无当前会话', () => {
    const s = useChatStore.getState();
    expect(s.conversations).toEqual([]);
    expect(s.currentConversationId).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.streaming).toBe(false);
  });
});

describe('chatStore 会话管理', () => {
  it('setConversations 设置列表', () => {
    const list = [createConversation({ id: 'c1' }), createConversation({ id: 'c2' })];
    useChatStore.getState().setConversations(list);
    expect(useChatStore.getState().conversations).toHaveLength(2);
  });

  it('selectConversation 设置当前会话', () => {
    useChatStore.getState().selectConversation('conv-123');
    expect(useChatStore.getState().currentConversationId).toBe('conv-123');
  });
});

describe('chatStore 消息管理', () => {
  it('appendMessage 追加消息', () => {
    const msg = createMessage({ id: 'm1', content: '你好' });
    useChatStore.getState().appendMessage(msg);
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe('你好');
  });

  it('updateStreaming 累积 delta', () => {
    useChatStore.getState().appendMessage(createMessage({ id: 'm1', content: '' }));
    useChatStore.getState().updateStreaming('m1', '你好');
    useChatStore.getState().updateStreaming('m1', '世界');
    const msg = useChatStore.getState().messages[0];
    expect(msg.content).toBe('你好世界');
    expect(msg.delta).toBe('世界');
  });

  it('finishStreaming 标记消息完成', () => {
    useChatStore.getState().appendMessage(createMessage({ id: 'm1', status: 'streaming' }));
    useChatStore.getState().finishStreaming('m1');
    const s = useChatStore.getState();
    expect(s.streaming).toBe(false);
    expect(s.messages[0].status).toBe('done');
    expect(s.messages[0].delta).toBeUndefined();
  });

  it('setStreaming 设置流式状态', () => {
    useChatStore.getState().setStreaming(true);
    expect(useChatStore.getState().streaming).toBe(true);
    useChatStore.getState().setStreaming(false);
    expect(useChatStore.getState().streaming).toBe(false);
  });
});

describe('chatStore reset', () => {
  it('清空所有消息和会话', () => {
    useChatStore.getState().setConversations([createConversation()]);
    useChatStore.getState().appendMessage(createMessage());
    useChatStore.getState().setStreaming(true);
    useChatStore.getState().reset();
    const s = useChatStore.getState();
    expect(s.currentConversationId).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.streaming).toBe(false);
  });
});
