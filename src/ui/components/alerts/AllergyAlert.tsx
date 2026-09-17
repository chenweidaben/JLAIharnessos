/**
 * 健澜科技数智医院智能体 - 过敏警报
 *
 * 展示过敏原、过敏反应类型、严重程度、交叉过敏提示、建议处理，
 * 确认按钮。
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

const allergySeverityMap = {
  mild: { label: '轻度', colorKey: 'warning' },
  moderate: { label: '中度', colorKey: 'abnormalHigh' },
  severe: { label: '重度/过敏性休克风险', colorKey: 'criticalValue' },
} as const;

// ============================================================================
// 组件 Props
// ============================================================================

/** AllergyAlert 属性 */
export interface AllergyAlertProps {
  /** 是否显示 */
  visible: boolean;
  /** 过敏警报数据 */
  alert: ClinicalAlert;
  /** 确认回调（由父级键盘层触发） */
  onConfirm?: (alertId: string) => void;
}

/**
 * 过敏警报组件
 *
 * 重度过敏以红色警示卡片呈现，列出交叉过敏药物供处方规避。
 *
 * @example
 * ```tsx
 * <AllergyAlert visible alert={allergyAlert} onConfirm={ack} />
 * ```
 */
export function AllergyAlert({ visible, alert }: AllergyAlertProps): React.ReactElement | null {
  const theme = useThemeColors();
  const data = alert.allergy;
  if (!visible || !data) return null;

  const sev = allergySeverityMap[data.severity];
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
        <Text color={sevColor} bold>
          🤧 过敏警报
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

      {/* 过敏原 + 反应类型 */}
      <Box flexDirection="row" gap={2} marginTop={0}>
        <Text color={theme.text}>
          过敏原:{' '}
          <Text color={sevColor} bold>
            {data.allergen}
          </Text>
        </Text>
        <Text color={theme.subtle}>
          反应类型: <Text color={theme.text}>{data.reactionType}</Text>
        </Text>
      </Box>

      {/* 交叉过敏 */}
      {data.crossReactivity.length > 0 && (
        <Box flexDirection="column" marginTop={0}>
          <Text color={theme.warning} bold>
            交叉过敏提示（应规避）
          </Text>
          {data.crossReactivity.map((c, i) => (
            <Text key={i} color={theme.warning}>
              {'  '}• {c}
            </Text>
          ))}
        </Box>
      )}

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

      {/* 操作提示 */}
      <Box marginTop={0}>
        <Text color={theme.success} underline>
          [Y] 已确认并规避
        </Text>
      </Box>
    </Box>
  );
}

export default AllergyAlert;
