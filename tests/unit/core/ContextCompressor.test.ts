/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { describe, expect, test } from 'bun:test';
import { ContextCompressor } from '@/core/context/ContextCompressor';
import type { LoopMessage } from '@/core/agent/loopTypes';

/** 构造消息辅助 */
function userText(text: string): LoopMessage {
  return { role: 'user', content: [{ type: 'text', text }] };
}
function userToolResult(id: string, content: string): LoopMessage {
  return {
    role: 'user',
    content: [{ type: 'tool_result', toolUseId: id, content }],
  };
}

describe('ContextCompressor', () => {
  test('Level 1 Snip 截断超长工具结果', () => {
    const compressor = new ContextCompressor({ toolResultCharLimit: 100 });
    const longText = 'x'.repeat(500);
    const messages: LoopMessage[] = [userToolResult('t1', longText)];
    const result = compressor.compact(messages, 'snip');
    expect(result.afterTokens).toBeLessThan(result.beforeTokens);
    const block = (result.messages[0].content[0] as { content: string });
    expect(block.content.length).toBeLessThan(200);
    expect(block.content).toContain('截断');
  });

  test('Level 2 Microcompact 摘要早期工具结果', () => {
    const compressor = new ContextCompressor({ keepRecentTurns: 1 });
    const messages: LoopMessage[] = [
      userToolResult('t1', 'a'.repeat(1000)),
      userToolResult('t2', 'b'.repeat(1000)),
    ];
    const result = compressor.compact(messages, 'microcompact');
    expect(result.messages).toHaveLength(2);
    // 早期的被摘要，最近的保留
    expect((result.messages[0].content[0] as { content: string }).content).toContain('已摘要');
    expect((result.messages[1].content[0] as { content: string }).content).toBe('b'.repeat(1000));
  });

  test('Level 3 Collapse 折叠多轮历史', () => {
    const compressor = new ContextCompressor({ keepRecentTurns: 1 });
    const messages: LoopMessage[] = [
      userText('患者诊断冠心病'),
      userText('医生建议做心电图'),
      userText('最新问题'),
    ];
    const result = compressor.compact(messages, 'collapse');
    // 折叠后应为 1 条摘要 + 最近 2 条
    expect(result.messages.length).toBeLessThanOrEqual(3);
    expect(result.messages[0].content[0].type).toBe('text');
    expect((result.messages[0].content[0] as { text: string }).text).toContain('历史');
  });

  test('Level 4 Autocompact 保留关键诊断信息', () => {
    const compressor = new ContextCompressor({ keepRecentTurns: 1 });
    const messages: LoopMessage[] = [
      userText('患者青霉素过敏'),
      userText('ST段抬高，考虑心梗'),
      userText('记录体温37度'),
      userText('记录血压120/80'),
      userText('继续追问'),
    ];
    const result = compressor.compact(messages, 'autocompact');
    const summary = (result.messages[0].content[0] as { text: string }).text;
    expect(summary).toContain('过敏');
    expect(summary).toContain('心梗');
  });

  test('estimateMessagesTokens 正确估算', () => {
    const compressor = new ContextCompressor();
    const messages: LoopMessage[] = [userText('abcdefgh')];
    expect(compressor.estimateMessagesTokens(messages)).toBeGreaterThan(0);
  });
});
