/**
 * 健澜科技数智医院智能体 - 状态栏
 *
 * 显示当前用户、科室、角色、会话状态、Token使用情况、
 * 当前患者、网络连接状态、时间显示。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';

import { useThemeColors } from '../theme';
import type { CurrentUser, SessionState } from '../types';

// ============================================================================
// Mock 数据
// ============================================================================

/** 默认Mock当前用户 */
export const mockCurrentUser: CurrentUser = {
  userId: 'U001',
  name: '陈维',
  role: 'doctor',
  title: '主治医师',
  department: '心血管内科',
};

// ============================================================================
// 状态映射
// ============================================================================

const sessionStateMap: Record<SessionState, { label: string; icon: string; color: string }> = {
  idle: { label: '空闲', icon: '●', color: 'statusIdle' },
  thinking: { label: '思考中', icon: '◐', color: 'statusBusy' },
  'tool-executing': { label: '工具执行', icon: '⚙', color: 'statusBusy' },
  'waiting-confirmation': { label: '等待确认', icon: '❓', color: 'warning' },
  error: { label: '错误', icon: '✕', color: 'error' },
};

const roleLabelMap: Record<CurrentUser['role'], string> = {
  doctor: '医生',
  nurse: '护士',
  pharmacist: '药师',
  admin: '管理员',
  'medical-student': '医学生',
};

// ============================================================================
// 组件 Props
// ============================================================================

/** StatusLine 属性 */
export interface StatusLineProps {
  /** 当前用户，默认使用Mock数据 */
  user?: CurrentUser;
  /** 会话状态 */
  sessionState?: SessionState;
  /** 当前患者姓名 */
  currentPatient?: string;
  /** Token使用量 */
  tokenUsage?: { input: number; output: number; total: number };
  /** 网络连接状态 */
  connected?: boolean;
  /** 待处理任务数 */
  pendingTasks?: number;
  /** 危急值数量 */
  criticalValues?: number;
  /** AI模型名称 */
  modelName?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 状态栏组件
 *
 * 在屏幕底部显示系统状态信息，包括当前用户、科室、会话状态、
 * Token使用量、当前患者、网络连接和时间。
 *
 * @example
 * ```tsx
 * <StatusLine user={currentUser} sessionState="thinking" />
 * ```
 */
export function StatusLine({
  user = mockCurrentUser,
  sessionState = 'idle',
  currentPatient = '张明华',
  tokenUsage = { input: 12580, output: 3420, total: 16000 },
  connected = true,
  pendingTasks = 3,
  criticalValues = 1,
  modelName = '健澜医疗大模型 Pro',
}: StatusLineProps): React.ReactElement {
  const theme = useThemeColors();
  const [currentTime, setCurrentTime] = useState('');

  // 更新时间
  useEffect(() => {
    const updateTime = (): void => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const stateInfo = sessionStateMap[sessionState];
  const stateColor =
    sessionState === 'idle'
      ? theme.statusIdle
      : sessionState === 'error'
        ? theme.error
        : theme.statusBusy;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor={theme.panelBackground}
      borderStyle="single"
      borderColor={theme.border}
      paddingX={1}
      paddingY={0}
    >
      {/* 用户信息 */}
      <Box flexDirection="row" gap={1}>
        <Text color={theme.jianlan} bold>
          健澜
        </Text>
        <Text color={theme.text}>{user.name}</Text>
        <Text color={theme.subtle}>[{user.title}]</Text>
        <Text color={theme.inactive}>{user.department}</Text>
      </Box>

      <Text color={theme.divider}> │ </Text>

      {/* 会话状态 */}
      <Box flexDirection="row" gap={1}>
        <Text color={stateColor}>{stateInfo.icon}</Text>
        <Text color={stateColor}>{stateInfo.label}</Text>
      </Box>

      <Text color={theme.divider}> │ </Text>

      {/* AI模型 */}
      <Text color={theme.assistant}>🤖 {modelName}</Text>

      <Text color={theme.divider}> │ </Text>

      {/* 当前患者 */}
      <Text color={theme.text}>👤 {currentPatient}</Text>

      <Text color={theme.divider}> │ </Text>

      {/* 待办/危急值 */}
      {pendingTasks > 0 && <Text color={theme.orderPending}>📋 {pendingTasks}待办</Text>}
      {criticalValues > 0 && (
        <Text color={theme.criticalValue} bold backgroundColor={theme.criticalValueBg}>
          {' '}
          🚨 {criticalValues}危急{' '}
        </Text>
      )}

      {/* 右侧信息 */}
      <Box flexGrow={1} />
      <Box flexDirection="row" gap={2} alignItems="center">
        {/* Token使用 */}
        <Text color={theme.inactive}>Tokens: {tokenUsage.total.toLocaleString()}</Text>

        {/* 网络状态 */}
        <Text color={connected ? theme.statusOnline : theme.statusOffline}>
          {connected ? '● 已连接' : '○ 离线'}
        </Text>

        {/* 时间 */}
        <Text color={theme.subtle}>{currentTime}</Text>
      </Box>
    </Box>
  );
}
