/**
 * 健澜科技数智医院智能体 - 药物相互作用警报
 *
 * 展示相互作用的两种药品、作用类型与严重程度、临床意义、
 * 建议处理（调量/换药/监测）、参考来源，确认/忽略按钮。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { useThemeColors } from '../../theme';
import type { ClinicalAlert } from './alertTypes';

// ============================================================================
// 严重程度映射
// ============================================================================

const severityMap = {
  minor: { label: '轻微', colorKey: 'normalValue' },
  moderate: { label: '中度', colorKey: 'warning' },
  major: { label: '严重', colorKey: 'abnormalHigh' },
  contraindicated: { label: '禁忌联用', colorKey: 'criticalValue' },
} as const;

// ============================================================================
// 组件 Props
// ============================================================================

/** DrugInteractionAlert 属性 */
export interface DrugInteractionAlertProps {
  /** 是否显示 */
  visible: boolean;
  /** 药物相互作用警报数据 */
  alert: ClinicalAlert;
  /** 确认回调（由父级键盘层触发） */
  onConfirm?: (alertId: string) => void;
  /** 忽略回调 */
  onIgnore?: (alertId: string) => void;
}

/**
 * 药物相互作用警报组件
 *
 * 中等级别以侧边通知卡片呈现，红色高亮禁忌联用。
 * 键盘确认/忽略由父级 AlertSystem 统一处理。
 *
 * @example
 * ```tsx
 * <DrugInteractionAlert visible alert={ixAlert} onConfirm={ack} />
 * ```
 */
export function DrugInteractionAlert({
  visible,
  alert,
}: DrugInteractionAlertProps): React.ReactElement | null {
  const theme = useThemeColors();
  const data = alert.interaction;
  if (!visible || !data) return null;

  const sev = severityMap[data.severity];
  const sevColor = theme[sev.colorKey];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={sevColor}
      backgroundColor={theme.panelBackground}
      paddingX={1}
    >
      {/* 标题 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.warning} bold>
          ⚠ 药物相互作用
        </Text>
        <Text color={sevColor} backgroundColor={theme.background}>
          {' '}
          {sev.label}{' '}
        </Text>
        <Box flexGrow={1} />
        <Text color={theme.inactive}>{alert.createdAt}</Text>
      </Box>

      {/* 患者 */}
      <Text color={theme.subtle}>
        患者: <Text color={theme.text}>{alert.patient.name}</Text>
      </Text>

      {/* 两种药品 */}
      <Box flexDirection="row" alignItems="center" gap={1} marginTop={0}>
        <Text color={theme.text} bold>
          💊 {data.drugA}
        </Text>
        <Text color={sevColor}>⇄</Text>
        <Text color={theme.text} bold>
          💊 {data.drugB}
        </Text>
      </Box>

      {/* 作用类型 */}
      <Text color={theme.subtle}>
        相互作用类型: <Text color={theme.text}>{data.interactionType}</Text>
      </Text>

      {/* 临床意义 */}
      <Box marginTop={0}>
        <Text color={theme.warning} bold>
          临床意义
        </Text>
        <Text color={theme.text}>{data.clinicalMeaning}</Text>
      </Box>

      {/* 建议处理 */}
      <Box flexDirection="column" marginTop={0}>
        <Text color={theme.success} bold>
          建议处理
        </Text>
        {data.suggestedActions.map((a, i) => (
          <Text key={i} color={theme.text}>
            {'  '}• {a}
          </Text>
        ))}
      </Box>

      {/* 参考来源 */}
      <Text color={theme.inactive}>参考来源: {data.referenceSource}</Text>

      {/* 操作提示 */}
      <Box flexDirection="row" gap={2} marginTop={0}>
        <Text color={theme.success} underline>
          [Y] 已确认/调整
        </Text>
        <Text color={theme.inactive} underline>
          [N] 忽略
        </Text>
      </Box>
    </Box>
  );
}

export default DrugInteractionAlert;
