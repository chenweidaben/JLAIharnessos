/**
 * 健澜科技数智医院智能体 - 工具调用展示组件
 *
 * 以卡片形式展示一次医疗工具调用：工具名/图标/参数摘要、执行状态、
 * 执行耗时、结果摘要（可展开完整结果）、风险等级与确认状态。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { useThemeColors } from '../../theme';
import type { ToolCallInfo, ToolCallStatus, ToolConfirmState, ToolRiskLevel } from './chatTypes';

// ============================================================================
// 映射表
// ============================================================================

const statusMap: Record<ToolCallStatus, { label: string; icon: string; color: string }> = {
  pending: { label: '等待', icon: '◌', color: 'inactive' },
  running: { label: '执行中', icon: '⚙', color: 'warning' },
  success: { label: '成功', icon: '✓', color: 'success' },
  failed: { label: '失败', icon: '✕', color: 'error' },
};

const riskMap: Record<ToolRiskLevel, { label: string; color: string }> = {
  low: { label: '低风险', color: 'normalValue' },
  medium: { label: '中风险', color: 'warning' },
  high: { label: '高风险', color: 'criticalValue' },
};

const confirmMap: Record<ToolConfirmState, { label: string; color: string }> = {
  'not-required': { label: '无需确认', color: 'inactive' },
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已确认', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
};

// ============================================================================
// 组件 Props
// ============================================================================

/** ToolCallDisplay 属性 */
export interface ToolCallDisplayProps {
  /** 工具调用信息 */
  toolCall: ToolCallInfo;
  /** 是否展开完整结果 */
  expanded?: boolean;
  /** 展开/收起切换回调 */
  onToggle?: () => void;
}

/**
 * 工具调用展示组件
 *
 * 渲染一张工具调用卡片。风险等级用颜色编码，执行中显示旋转符，
 * 长结果支持折叠/展开。
 *
 * @example
 * ```tsx
 * <ToolCallDisplay toolCall={call} expanded={open} onToggle={toggle} />
 * ```
 */
export function ToolCallDisplay({
  toolCall,
  expanded = false,
  onToggle,
}: ToolCallDisplayProps): React.ReactElement {
  const theme = useThemeColors();
  const status = statusMap[toolCall.status];
  const risk = riskMap[toolCall.riskLevel];
  const confirm = confirmMap[toolCall.confirmState];

  const statusColor = theme[status.color as keyof typeof theme];
  const riskColor = theme[risk.color as keyof typeof theme];
  const confirmColor = theme[confirm.color as keyof typeof theme];

  const hasDetail = !!toolCall.resultDetail && toolCall.resultDetail.length > 0;
  const durationText =
    toolCall.durationMs !== undefined ? `${(toolCall.durationMs / 1000).toFixed(2)}s` : '-';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      backgroundColor={theme.panelBackground}
      paddingX={1}
      marginBottom={0}
    >
      {/* 头部行：图标 + 工具名 + 状态 + 耗时 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.memory}>{toolCall.icon}</Text>
        <Text color={theme.jianlan} bold>
          {toolCall.toolName}
        </Text>
        <Text color={statusColor} bold>
          {status.icon} {status.label}
        </Text>
        <Text color={theme.inactive}>{durationText}</Text>
        <Box flexGrow={1} />
        <Text color={riskColor} backgroundColor={theme.background}>
          {' '}
          {risk.label}{' '}
        </Text>
        <Text color={confirmColor}>{confirm.label}</Text>
      </Box>

      {/* 参数摘要 */}
      <Box marginTop={0}>
        <Text color={theme.subtle}>
          <Text color={theme.inactive}>参数: </Text>
          {toolCall.argsSummary}
        </Text>
      </Box>

      {/* 结果摘要 */}
      {toolCall.resultSummary && (
        <Box marginTop={0}>
          <Text color={theme.text}>
            <Text color={theme.success}>结果: </Text>
            {toolCall.resultSummary}
          </Text>
        </Box>
      )}

      {/* 折叠/展开切换 */}
      {hasDetail && (
        <Box marginTop={0}>
          <Text color={theme.suggestion} underline>
            {expanded ? '▾ [收起详情]' : '▸ [展开完整结果]'}
          </Text>
        </Box>
      )}

      {/* 完整结果（展开时） */}
      {expanded && hasDetail && (
        <Box marginTop={0} borderStyle="single" borderColor={theme.divider} paddingX={1}>
          <Text color={theme.subtle}>{toolCall.resultDetail}</Text>
        </Box>
      )}
    </Box>
  );
}

export default ToolCallDisplay;
