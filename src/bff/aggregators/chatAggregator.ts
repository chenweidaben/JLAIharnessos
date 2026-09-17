/**
 * 健澜科技数智医院智能体 - BFF 对话聚合器
 *
 * 编排 MedicalAgentLoop：先规划意图，再调用工具，最后组装助手回复。
 * 同步接口返回首条消息；流式增量经 WebSocket 推送。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface ChatTurnResult {
  message: {
    id: string;
    role: 'assistant';
    content: string;
    createdAt: string;
    toolCalls: unknown[];
  };
  streamSessionId: string;
}

/** 生成一轮对话回复（占位：生产接入 MedicalAgentLoop） */
export function runChatTurn(conversationId: string, content: string): ChatTurnResult {
  return {
    message: {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `已收到您的问题：「${content}」。这是 BFF 聚合的同步首包，后续流式内容将通过 WebSocket /ws/chat 推送。`,
      createdAt: new Date().toISOString(),
      toolCalls: [
        {
          id: 'tc_demo',
          toolName: 'get_lab_result',
          status: 'success',
          args: { conversationId },
        },
      ],
    },
    streamSessionId: `ss_${Date.now()}`,
  };
}
