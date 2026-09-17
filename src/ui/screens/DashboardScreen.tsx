/**
 * 健澜科技数智医院智能体 - 主仪表盘
 *
 * 功能入口（门诊、查房、会诊、质控、教学、设置），
 * 今日待办（待处理医嘱、危急值、待审病历），快捷统计，系统状态。
 * 顶部 HeaderBar 品牌栏 + 底部 FooterBar 状态栏，两栏布局组织内容。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { FooterBar } from '../components/layout/FooterBar';
import { HeaderBar } from '../components/layout/HeaderBar';
import { TwoColumnLayout } from '../components/layout/TwoColumnLayout';
import { useThemeColors } from '../theme';
import type { ScreenInfo, ScreenType } from '../types';

// ============================================================================
// 功能入口定义
// ============================================================================

/** 功能入口列表 */
export const SCREEN_ENTRIES: ScreenInfo[] = [
  {
    type: 'outpatient',
    label: '门诊问诊',
    description: '门诊患者问诊、开单、病历书写',
    icon: '🏥',
  },
  {
    type: 'ward-round',
    label: '查房',
    description: '住院患者查房、生命体征、医嘱管理',
    icon: '🚶',
  },
  { type: 'consultation', label: '会诊', description: '多学科会诊、远程会诊', icon: '👥' },
  { type: 'dashboard', label: '质控', description: '医疗质控、病历审查、指标统计', icon: '📊' },
];

/** 其他功能入口 */
export const OTHER_ENTRIES = [
  { label: '教学', description: '临床教学、病例讨论、技能培训', icon: '📚' },
  { label: '科研', description: '科研数据查询、统计分析、论文辅助', icon: '🔬' },
  { label: '设置', description: '系统设置、个性化配置、权限管理', icon: '⚙️' },
  { label: '帮助', description: '使用帮助、快捷键、文档', icon: '❓' },
];

// ============================================================================
// Mock 待办数据
// ============================================================================

const MOCK_TODOS = {
  pendingOrders: 5,
  criticalValues: 2,
  pendingRecords: 3,
  pendingConsultations: 1,
  todayPatients: 12,
  completedVisits: 8,
};

/** 待办列表（明细） */
const MOCK_TODO_LIST = [
  { level: 'critical' as const, text: '张明华 血钾 6.8 危急值待处理' },
  { level: 'warning' as const, text: '王芳 2 份入院记录待审签' },
  { level: 'warning' as const, text: '李建国 5 条长期医嘱待审核' },
  { level: 'info' as const, text: '心内科 1 例会诊待回复' },
];

// ============================================================================
// 组件 Props
// ============================================================================

/** DashboardScreen 属性 */
export interface DashboardScreenProps {
  /** 屏幕切换回调 */
  onNavigate?: (screen: ScreenType) => void;
  /** 当前用户姓名 */
  userName?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 主仪表盘屏幕
 *
 * 系统启动后的主界面：HeaderBar 品牌栏，两栏布局组织今日待办与功能入口，
 * 右侧运营指标，底部 FooterBar 状态。
 *
 * @example
 * ```tsx
 * <DashboardScreen onNavigate={handleNavigate} />
 * ```
 */
export function DashboardScreen({
  onNavigate,
  userName = '陈维',
}: DashboardScreenProps): React.ReactElement {
  const theme = useThemeColors();

  const completionRate = Math.round((MOCK_TODOS.completedVisits / MOCK_TODOS.todayPatients) * 100);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <HeaderBar
        title="健澜科技数智医院智能体 v1.0"
        subtitle="AI-Native Hospital Intelligence Platform"
        rightStatus={`欢迎，${userName}医生`}
      />

      {/* 两栏：左 待办/统计，右 功能入口 */}
      <TwoColumnLayout
        left={
          <Box flexDirection="column" flexGrow={1}>
            {/* 今日待办统计卡片 */}
            <Box flexDirection="column" borderStyle="round" borderColor={theme.border} paddingX={1}>
              <Text color={theme.text} bold>
                📋 今日待办概览
              </Text>
              <Box flexDirection="row" gap={2} flexWrap="wrap" marginTop={0}>
                <Box flexDirection="column">
                  <Text color={theme.orderPending} bold>
                    {MOCK_TODOS.pendingOrders}
                  </Text>
                  <Text color={theme.subtle}>待处理医嘱</Text>
                </Box>
                <Box flexDirection="column">
                  <Text color={theme.criticalValue} bold backgroundColor={theme.criticalValueBg}>
                    {' '}
                    {MOCK_TODOS.criticalValues}{' '}
                  </Text>
                  <Text color={theme.subtle}>危急值</Text>
                </Box>
                <Box flexDirection="column">
                  <Text color={theme.alertInfo} bold>
                    {MOCK_TODOS.pendingRecords}
                  </Text>
                  <Text color={theme.subtle}>待审病历</Text>
                </Box>
                <Box flexDirection="column">
                  <Text color={theme.merged} bold>
                    {MOCK_TODOS.pendingConsultations}
                  </Text>
                  <Text color={theme.subtle}>待会诊</Text>
                </Box>
              </Box>
              <ProgressBar value={completionRate} label="今日诊疗完成率" />
            </Box>

            {/* 待办明细 */}
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor={theme.border}
              paddingX={1}
              marginTop={0}
              flexGrow={1}
            >
              <Text color={theme.text} bold>
                🎯 待办事项
              </Text>
              {MOCK_TODO_LIST.map((item, i) => (
                <Box key={i} flexDirection="row" gap={1}>
                  <Badge
                    label={
                      item.level === 'critical'
                        ? '危急'
                        : item.level === 'warning'
                          ? '待办'
                          : '提示'
                    }
                    preset={
                      item.level === 'critical'
                        ? 'critical'
                        : item.level === 'warning'
                          ? 'warning'
                          : 'info'
                    }
                  />
                  <Text color={theme.text}>{item.text}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        }
        right={
          <Box flexDirection="column" flexGrow={1}>
            {/* 功能入口 */}
            <Box flexDirection="column" borderStyle="round" borderColor={theme.border} paddingX={1}>
              <Text color={theme.text} bold>
                🚀 功能入口
              </Text>
              <Box flexDirection="row" flexWrap="wrap" gap={1} marginTop={0}>
                {SCREEN_ENTRIES.map((entry) => (
                  <Box
                    key={entry.type}
                    flexDirection="column"
                    borderStyle="single"
                    borderColor={theme.borderFocus}
                    backgroundColor={theme.hoverBackground}
                    paddingX={1}
                    width={22}
                  >
                    <Text color={theme.text} bold underline>
                      {entry.icon} {entry.label}
                    </Text>
                    <Text color={theme.subtle}>{entry.description}</Text>
                  </Box>
                ))}
              </Box>
              <Box flexDirection="row" flexWrap="wrap" gap={1} marginTop={0}>
                {OTHER_ENTRIES.map((entry) => (
                  <Box
                    key={entry.label}
                    flexDirection="column"
                    borderStyle="single"
                    borderColor={theme.border}
                    paddingX={1}
                    width={22}
                  >
                    <Text color={theme.subtle} bold>
                      {entry.icon} {entry.label}
                    </Text>
                    <Text color={theme.inactive}>{entry.description}</Text>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* 系统状态 */}
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor={theme.border}
              paddingX={1}
              marginTop={0}
            >
              <Text color={theme.text} bold>
                🖥️ 系统状态
              </Text>
              <Box flexDirection="row" gap={2} flexWrap="wrap" marginTop={0}>
                <Text color={theme.statusOnline}>● HIS 已连接</Text>
                <Text color={theme.statusOnline}>● LIS 已连接</Text>
                <Text color={theme.statusOnline}>● PACS 已连接</Text>
                <Text color={theme.statusOnline}>● AI 服务正常</Text>
              </Box>
            </Box>
          </Box>
        }
      />

      <FooterBar
        shortcuts={[
          { key: '↑↓', label: '选择' },
          { key: 'Enter', label: '进入' },
        ]}
        pendingCount={MOCK_TODOS.pendingOrders}
        criticalCount={MOCK_TODOS.criticalValues}
      />
    </Box>
  );
}
