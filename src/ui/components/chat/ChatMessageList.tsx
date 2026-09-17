/**
 * 健澜科技数智医院智能体 - 对话消息列表
 *
 * 虚拟窗口式消息列表，支持用户/AI/工具/工具结果/系统/错误六类消息，
 * AI 回复流式逐字显示，工具调用卡片，时间戳，角色颜色区分，
 * 长工具结果折叠/展开，键盘滚动与展开交互。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';

import { useThemeColors } from '../../theme';
import { formatTime } from '../../utils/formatMedical';
import type { ChatMessage, ChatMessageRole } from './chatTypes';
import { StreamingText } from './StreamingText';
import { ToolCallDisplay } from './ToolCallDisplay';

// ============================================================================
// 角色样式映射
// ============================================================================

interface RoleStyle {
  label: string;
  icon: string;
  /** 角色标签颜色键 */
  colorKey: 'assistant' | 'jianlanShimmer' | 'inactive' | 'subtle' | 'error';
}

const roleStyleMap: Record<ChatMessageRole, RoleStyle> = {
  // 用户（医生）= 医疗青
  user: { label: '医生', icon: '👤', colorKey: 'assistant' },
  // AI 回复 = 深海蓝
  assistant: { label: 'AI助手', icon: '🤖', colorKey: 'jianlanShimmer' },
  // 工具调用 = 灰
  tool: { label: '工具', icon: '🔧', colorKey: 'inactive' },
  'tool-result': { label: '工具结果', icon: '📦', colorKey: 'inactive' },
  system: { label: '系统', icon: '⚙', colorKey: 'subtle' },
  error: { label: '错误', icon: '⛔', colorKey: 'error' },
};

/** 长结果折叠阈值（字符数） */
const COLLAPSE_THRESHOLD = 120;

// ============================================================================
// Mock 数据：一段完整的门诊问诊对话
// ============================================================================

/** 默认 Mock 对话消息（门诊问诊完整流程） */
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'sys_1',
    role: 'system',
    content: '已加载患者 张明华（男，58岁，心血管内科，床号1203-5）的病历资料、过敏史与近期检验。',
    timestamp: '09:00:01',
  },
  {
    id: 'u_1',
    role: 'user',
    content: '张主任今天主诉胸痛加重，结合最新检验帮我分析一下病情。',
    timestamp: '09:00:12',
  },
  {
    id: 't_1',
    role: 'tool',
    content: '',
    timestamp: '09:00:13',
    toolCall: {
      toolCallId: 'tc_1',
      toolName: 'getLabResult',
      icon: '🔬',
      argsSummary: 'patientId=P202409001, panel=心肌酶谱',
      status: 'success',
      durationMs: 842,
      riskLevel: 'low',
      confirmState: 'not-required',
      resultSummary: '肌钙蛋白I 5.2 ng/mL（↑↑危急值），CK-MB 86 U/L',
      resultDetail:
        '肌钙蛋白I: 5.20 ng/mL (参考 0-0.04, ↑↑危急值)\nCK-MB: 86 U/L (参考 0-25, ↑)\n肌红蛋白: 142 ng/mL (参考 28-72, ↑)\nBNP: 1850 pg/mL (参考 0-100, ↑)\n报告时间: 2026-09-14 08:55',
    },
  },
  {
    id: 'a_1',
    role: 'assistant',
    content:
      '根据最新检验结果，**肌钙蛋白I 5.2 ng/mL** 显著升高，结合患者胸痛持续不缓解，考虑 **急性非ST段抬高型心肌梗死**。\n\n建议处理：\n1. 立即心电监护，复查心肌酶谱与电解质\n2. 抗血小板 + 抗凝治疗（阿司匹林 + 低分子肝素）\n3. 心内科急会诊，评估冠脉造影 + PCI 指征\n4. 血钾 6.8 mmol/L 为危急值，需同步降钾',
    timestamp: '09:00:15',
  },
  {
    id: 'u_2',
    role: 'user',
    content: '好的，先开心肌酶谱复查和降钾治疗的医嘱。',
    timestamp: '09:00:30',
  },
  {
    id: 't_2',
    role: 'tool',
    content: '',
    timestamp: '09:00:31',
    toolCall: {
      toolCallId: 'tc_2',
      toolName: 'createOrder',
      icon: '📋',
      argsSummary: '10%葡萄糖酸钙 10mL ivp st; 胰岛素8U+50%GS40mL ivp st',
      status: 'pending',
      riskLevel: 'high',
      confirmState: 'pending',
      resultSummary: '',
    },
  },
];

// ============================================================================
// 组件 Props
// ============================================================================

/** ChatMessageList 属性 */
export interface ChatMessageListProps {
  /** 消息列表 */
  messages: ChatMessage[];
  /** 可视窗口最大条数（虚拟滚动） */
  maxVisible?: number;
  /** 是否启用键盘浏览（滚动/展开），默认 false */
  interactive?: boolean;
  /** 当前选中/聚焦消息ID（受控），不传则内部维护 */
  focusedId?: string;
  /** 消息聚焦回调 */
  onFocusMessage?: (id: string) => void;
  /** 流式速度（ms/字），默认 12 */
  streamSpeedMs?: number;
}

// ============================================================================
// 单条消息渲染
// ============================================================================

function MessageRow({
  msg,
  theme,
  streamSpeedMs,
  expanded,
  onToggleTool,
}: {
  msg: ChatMessage;
  theme: ReturnType<typeof useThemeColors>;
  streamSpeedMs: number;
  expanded: boolean;
  onToggleTool: (id: string) => void;
}): React.ReactElement {
  const role = roleStyleMap[msg.role];
  const roleColor = theme[role.colorKey];

  // 工具类消息渲染工具卡片
  if (msg.role === 'tool' || msg.role === 'tool-result') {
    if (msg.toolCall) {
      return (
        <Box marginBottom={0}>
          <Box flexDirection="row" gap={1}>
            <Text color={roleColor} bold>
              {role.icon} {role.label}
            </Text>
            <Text color={theme.inactive}>{msg.timestamp}</Text>
          </Box>
          <ToolCallDisplay
            toolCall={msg.toolCall}
            expanded={expanded}
            onToggle={() => onToggleTool(msg.id)}
          />
        </Box>
      );
    }
  }

  // AI 回复（流式 / 静态）
  if (msg.role === 'assistant') {
    return (
      <Box marginBottom={0}>
        <Box flexDirection="row" gap={1}>
          <Text color={roleColor} bold>
            {role.icon} {role.label}
          </Text>
          <Text color={theme.inactive}>{msg.timestamp}</Text>
        </Box>
        {msg.streaming ? (
          <StreamingText text={msg.content} speedMs={streamSpeedMs} />
        ) : (
          <StreamingText text={msg.content} instant showCursor={false} />
        )}
      </Box>
    );
  }

  // 错误消息
  if (msg.role === 'error') {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.error}
        backgroundColor={theme.criticalValueBg}
        paddingX={1}
        marginBottom={0}
      >
        <Box flexDirection="row" gap={1}>
          <Text color={theme.error} bold>
            {role.icon} {role.label}
          </Text>
          <Text color={theme.inactive}>{msg.timestamp}</Text>
        </Box>
        <Text color={theme.error}>{msg.content}</Text>
      </Box>
    );
  }

  // 用户 / 系统 纯文本消息
  const isUser = msg.role === 'user';
  return (
    <Box marginBottom={0}>
      <Box flexDirection="row" gap={1}>
        <Text color={roleColor} bold>
          {role.icon} {role.label}
        </Text>
        <Text color={theme.inactive}>{msg.timestamp}</Text>
      </Box>
      <Box backgroundColor={isUser ? theme.userMessageBackground : undefined} paddingX={1}>
        <Text color={theme.text}>{msg.content}</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 对话消息列表组件
 *
 * 虚拟窗口式渲染消息，自动停靠最新消息。交互模式下 ↑↓ 滚动、
 * Enter 展开/折叠长工具结果。AI 回复以流式逐字动画呈现。
 *
 * @example
 * ```tsx
 * <ChatMessageList messages={messages} maxVisible={12} interactive />
 * ```
 */
export function ChatMessageList({
  messages,
  maxVisible = 12,
  interactive = false,
  focusedId,
  onFocusMessage,
  streamSpeedMs = 12,
}: ChatMessageListProps): React.ReactElement {
  const theme = useThemeColors();
  // 滚动偏移：0 = 最新消息
  const [scrollOffset, setScrollOffset] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 新消息到达时回到底部
  useEffect(() => {
    setScrollOffset(0);
  }, [messages.length]);

  // 默认折叠长工具结果
  useEffect(() => {
    const next = new Set<string>();
    for (const m of messages) {
      if (
        (m.role === 'tool' || m.role === 'tool-result') &&
        m.toolCall?.resultDetail &&
        m.toolCall.resultDetail.length > COLLAPSE_THRESHOLD
      ) {
        // 默认折叠（不放入 expandedIds）
      }
    }
    setExpandedIds(next);
  }, [messages]);

  // 计算可视窗口
  const visibleMessages = useMemo(() => {
    const end = messages.length - scrollOffset;
    const start = Math.max(0, end - maxVisible);
    return messages.slice(start, end);
  }, [messages, scrollOffset, maxVisible]);

  const canScrollUp = scrollOffset < messages.length - maxVisible;
  const canScrollDown = scrollOffset > 0;

  /** 切换工具结果展开 */
  function toggleTool(id: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 键盘浏览
  useInput(
    (_input, key) => {
      if (!interactive) return;
      if (key.upArrow) {
        if (canScrollUp) setScrollOffset((o) => o + 1);
        return;
      }
      if (key.downArrow) {
        if (canScrollDown) setScrollOffset((o) => Math.max(0, o - 1));
        return;
      }
      if (key.return || key.rightArrow) {
        const target = focusedId ?? visibleMessages[visibleMessages.length - 1]?.id;
        if (target) {
          toggleTool(target);
          onFocusMessage?.(target);
        }
        return;
      }
    },
    { isActive: interactive },
  );

  return (
    <Box flexDirection="column" flexGrow={1}>
      {visibleMessages.length === 0 && (
        <Text color={theme.inactive}>暂无对话消息，输入问诊内容开始。</Text>
      )}

      {visibleMessages.map((msg) => (
        <MessageRow
          key={msg.id}
          msg={msg}
          theme={theme}
          streamSpeedMs={streamSpeedMs}
          expanded={expandedIds.has(msg.id)}
          onToggleTool={toggleTool}
        />
      ))}

      {/* 滚动指示 */}
      {(canScrollUp || canScrollDown) && (
        <Box flexDirection="row" justifyContent="center">
          <Text color={theme.inactive}>
            {canScrollUp && '↑ 上方有更多消息 '}
            {canScrollDown && '↓ 下方有更新消息 '}
            {interactive && '(↑↓滚动 · Enter展开)'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default ChatMessageList;
