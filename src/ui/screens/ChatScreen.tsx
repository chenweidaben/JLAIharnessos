/**
 * 健澜科技数智医院智能体 - 对话主屏幕
 *
 * HeaderBar + 对话消息列表 + 对话输入框 + StatusLine，
 * 左侧可折叠患者信息栏、右侧可折叠工具结果面板，
 * 集成警报系统与增强命令面板，全屏对话模式。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useCallback, useState } from 'react';

import { executeCommand, parseSlashCommand } from '../commands/medicalCommands';
import { AlertSystem, MOCK_CLINICAL_ALERTS } from '../components/alerts/AlertSystem';
import { ChatInput } from '../components/chat/ChatInput';
import { ChatMessageList, MOCK_CHAT_MESSAGES } from '../components/chat/ChatMessageList';
import type { ChatInputMode, ChatMessage } from '../components/chat/chatTypes';
import { makeMessageId, nowTime } from '../components/chat/chatTypes';
import { CommandPalette } from '../components/commands/CommandPalette';
import { HeaderBar } from '../components/layout/HeaderBar';
import { PatientInfoBar } from '../components/PatientInfoBar';
import { StatusLine } from '../components/StatusLine';
import { useThemeColors } from '../theme';
import type { MedicalCommand, SessionState } from '../types';

// ============================================================================
// Mock：AI 兜底回复
// ============================================================================

/** 根据用户输入生成一条流式 AI 回复（Mock） */
function mockAssistantReply(input: string, mode: ChatInputMode): string {
  const modeLabel =
    mode === 'order'
      ? '医嘱'
      : mode === 'ward-round'
        ? '查房'
        : mode === 'consultation-md'
          ? '会诊'
          : '问诊';
  return (
    `【${modeLabel}模式】已收到您的输入：“${input}”。\n\n` +
    '正在结合患者张明华的病历、检验与医嘱进行分析。当前重点：\n' +
    '- **肌钙蛋白I 5.2 ng/mL**（↑↑危急值），提示急性心肌损伤\n' +
    '- **血钾 6.8 mmol/L**（↑↑危急值），需降钾处理\n' +
    '- 华法林×阿司匹林联用存在出血风险，建议 CDS 复核\n\n' +
    '如需开立医嘱/处方，请确认后由 CA 签名提交 HIS。'
  );
}

// ============================================================================
// 组件 Props
// ============================================================================

/** ChatScreen 属性 */
export interface ChatScreenProps {
  /** 初始消息（默认 Mock 门诊对话） */
  initialMessages?: ChatMessage[];
  /** 返回回调 */
  onBack?: () => void;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 对话主屏幕
 *
 * 全屏对话工作台。左侧患者信息、右侧工具结果可折叠；
 * Ctrl+K / Ctrl+P 打开命令面板；输入 / 触发斜杠命令。
 *
 * @example
 * ```tsx
 * <ChatScreen onBack={() => navigate('dashboard')} />
 * ```
 */
export function ChatScreen({
  initialMessages = MOCK_CHAT_MESSAGES,
  onBack,
}: ChatScreenProps): React.ReactElement {
  const theme = useThemeColors();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [showPalette, setShowPalette] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [sessionState, setSessionState] = useState<SessionState>('idle');

  /** 追加消息 */
  function pushMessage(msg: ChatMessage): void {
    setMessages((prev) => [...prev, msg]);
  }

  /** 处理用户输入 */
  const handleSubmit = useCallback((text: string, mode: ChatInputMode): void => {
    const time = nowTime();
    // 用户消息
    pushMessage({ id: makeMessageId('u'), role: 'user', content: text, timestamp: time });

    // 斜杠命令
    const parsed = parseSlashCommand(text);
    if (parsed) {
      setSessionState('tool-executing');
      void executeCommand(parsed.name, parsed.args).then((result) => {
        pushMessage({
          id: makeMessageId('sys'),
          role: result.success ? 'system' : 'error',
          content: result.message,
          timestamp: nowTime(),
        });
        setSessionState('idle');
      });
      return;
    }

    // 普通问诊：流式 AI 回复
    setSessionState('thinking');
    pushMessage({
      id: makeMessageId('a'),
      role: 'assistant',
      content: mockAssistantReply(text, mode),
      timestamp: time,
      streaming: true,
    });
    setSessionState('idle');
  }, []);

  /** 命令面板执行 */
  const handlePaletteExecute = useCallback((cmd: MedicalCommand, args: string): void => {
    setSessionState('tool-executing');
    void executeCommand(cmd.name, args).then((result) => {
      pushMessage({
        id: makeMessageId('sys'),
        role: result.success ? 'system' : 'error',
        content: result.message,
        timestamp: nowTime(),
      });
      setSessionState('idle');
    });
  }, []);

  // 全局快捷键（与 ChatInput 共存，仅处理 ChatInput 不占用的组合键）
  useInput((input, key) => {
    if (showPalette) return;
    if ((key.ctrl && input === 'k') || (key.ctrl && input === 'p')) {
      setShowPalette(true);
      return;
    }
    if (key.ctrl && input === 'b') {
      setShowLeft((v) => !v);
      return;
    }
    if (key.ctrl && input === 'j') {
      setShowRight((v) => !v);
      return;
    }
    if (key.ctrl && input === 'a') {
      setShowAlerts((v) => !v);
      return;
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* 顶部标题栏 */}
      <HeaderBar
        title="AI 诊疗对话"
        subtitle="健澜科技 · 全诊智能体"
        rightStatus="心血管内科 · 陈维 · 主治"
      />

      {/* 警报系统（危急值/相互作用/过敏） */}
      {showAlerts && (
        <Box marginBottom={0}>
          <AlertSystem interactive initialAlerts={MOCK_CLINICAL_ALERTS} />
        </Box>
      )}

      {/* 主体三栏 */}
      <Box flexDirection="row" flexGrow={1} marginTop={0}>
        {/* 左栏：患者信息（可折叠） */}
        {showLeft && (
          <Box width={30} flexDirection="column">
            <PatientInfoBar />
          </Box>
        )}

        {/* 中栏：对话 */}
        <Box
          flexGrow={1}
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.border}
          paddingX={1}
        >
          <Box flexDirection="row" alignItems="center">
            <Text color={theme.jianlan} bold>
              💬 AI 诊疗对话
            </Text>
            <Box flexGrow={1} />
            <Text color={theme.inactive}>[Ctrl+B] 患者栏 [Ctrl+J] 工具面板 [Ctrl+P] 命令</Text>
          </Box>
          <ChatMessageList messages={messages} maxVisible={14} streamSpeedMs={10} />
        </Box>

        {/* 右栏：工具结果（可折叠） */}
        {showRight && (
          <Box
            width={36}
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
          >
            <Text color={theme.jianlan} bold>
              📦 工具结果
            </Text>
            <Text color={theme.subtle}>最近工具调用：</Text>
            <Text color={theme.text}>🔬 getLabResult · 成功 0.84s</Text>
            <Text color={theme.success}> 肌钙蛋白I 5.2 ↑↑</Text>
            <Text color={theme.text}>📋 createOrder · 待确认</Text>
            <Text color={theme.warning}> 高风险操作，需 CA 签名</Text>
            <Box marginTop={0}>
              <Text color={theme.inactive}>📊 今日已调用工具 12 次</Text>
            </Box>
            <Box marginTop={0}>
              <Text color={theme.suggestion}>CDS 规则库: 已加载 328 条</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* 底部输入 */}
      <Box marginTop={0}>
        <ChatInput onSubmit={handleSubmit} patientName="张明华" />
      </Box>

      {/* 底部状态栏 */}
      <StatusLine sessionState={sessionState} currentPatient="张明华" />

      {/* 命令面板覆盖层 */}
      <CommandPalette
        visible={showPalette}
        onClose={() => setShowPalette(false)}
        onExecute={handlePaletteExecute}
      />

      {/* 返回提示 */}
      {onBack && (
        <Box>
          <Text color={theme.inactive} underline>
            ◀ 返回（Ctrl+1 主菜单）
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default ChatScreen;
