/**
 * 健澜科技数智医院智能体 - 警报横幅
 *
 * 显示危急值警报、药物相互作用警报、过敏警报等，
 * 不同级别不同颜色，紧急警报闪烁效果，可关闭/确认。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';

import { useThemeColors } from '../theme';
import type { AlertItem, AlertLevel } from '../types';
import { formatTime } from '../utils/formatMedical';

// ============================================================================
// Mock 数据
// ============================================================================

/** 默认Mock警报数据 */
export const mockAlerts: AlertItem[] = [
  {
    alertId: 'ALT001',
    level: 'danger',
    type: 'critical-value',
    title: '危急值警报',
    content: '血钾 6.8 mmol/L（参考范围 3.5-5.3），超过危急值上限，可能导致心律失常',
    suggestion: '建议立即复查血钾，静脉推注10%葡萄糖酸钙10mL，胰岛素+葡萄糖降钾治疗',
    createdAt: '2026-09-14T06:35:00',
    acknowledged: false,
    requiresAcknowledgment: true,
  },
  {
    alertId: 'ALT002',
    level: 'danger',
    type: 'critical-value',
    title: '危急值警报',
    content: '肌钙蛋白I 5.2 ng/mL（参考范围 0-0.04），显著升高，提示急性心肌损伤',
    suggestion: '结合心电图和临床症状，考虑急性冠脉综合征，建议心内科急会诊',
    createdAt: '2026-09-14T07:20:00',
    acknowledged: false,
    requiresAcknowledgment: true,
  },
  {
    alertId: 'ALT003',
    level: 'warning',
    type: 'drug-interaction',
    title: '药物相互作用警告',
    content: '阿司匹林与华法林联用可能增加出血风险，建议监测凝血功能',
    suggestion: '评估出血风险，必要时调整华法林剂量，密切监测INR',
    createdAt: '2026-09-14T09:00:00',
    acknowledged: false,
    requiresAcknowledgment: false,
  },
  {
    alertId: 'ALT004',
    level: 'warning',
    type: 'allergy',
    title: '过敏史提醒',
    content: '患者有青霉素过敏史，当前医嘱中无青霉素类药物，已自动过滤',
    createdAt: '2026-09-14T08:00:00',
    acknowledged: true,
    requiresAcknowledgment: false,
  },
  {
    alertId: 'ALT005',
    level: 'info',
    type: 'system',
    title: '系统提示',
    content: '患者今日有心脏彩超检查预约（10:30），请提前做好准备',
    createdAt: '2026-09-14T08:00:00',
    acknowledged: true,
    requiresAcknowledgment: false,
  },
];

// ============================================================================
// 警报级别映射
// ============================================================================

const alertLevelMap: Record<AlertLevel, { label: string; icon: string }> = {
  danger: { label: '危险', icon: '🚨' },
  warning: { label: '警告', icon: '⚠️' },
  info: { label: '信息', icon: 'ℹ️' },
};

// ============================================================================
// 组件 Props
// ============================================================================

/** AlertBanner 属性 */
export interface AlertBannerProps {
  /** 警报数据，默认使用Mock数据 */
  alerts?: AlertItem[];
  /** 是否只显示未确认的警报 */
  showOnlyUnacknowledged?: boolean;
  /** 确认回调 */
  onAcknowledge?: (alertId: string) => void;
  /** 关闭回调 */
  onDismiss?: (alertId: string) => void;
}

// ============================================================================
// 单条警报组件
// ============================================================================

function AlertItemView({
  alert,
  onAcknowledge,
  onDismiss,
}: {
  alert: AlertItem;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
}): React.ReactElement {
  const theme = useThemeColors();
  const [blink, setBlink] = useState(true);

  // 紧急警报闪烁效果
  useEffect(() => {
    if (alert.level !== 'danger' || alert.acknowledged) return;
    const timer = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(timer);
  }, [alert.level, alert.acknowledged]);

  const levelInfo = alertLevelMap[alert.level];
  const bgColor =
    alert.level === 'danger'
      ? blink
        ? theme.criticalValueBg
        : theme.panelBackground
      : alert.level === 'warning'
        ? theme.panelBackground
        : theme.panelBackground;

  const borderColor =
    alert.level === 'danger'
      ? theme.alertDanger
      : alert.level === 'warning'
        ? theme.alertWarning
        : theme.alertInfo;

  const textColor =
    alert.level === 'danger'
      ? theme.alertDanger
      : alert.level === 'warning'
        ? theme.alertWarning
        : theme.alertInfo;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      backgroundColor={bgColor}
      paddingX={1}
      paddingY={0}
      marginBottom={0}
    >
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={textColor} bold>
          {levelInfo.icon} {alert.title}
        </Text>
        <Text color={theme.inactive}>[{levelInfo.label}]</Text>
        <Text color={theme.inactive}>{formatTime(alert.createdAt)}</Text>
        {alert.acknowledged && <Text color={theme.success}>✓ 已确认</Text>}
        <Box flexGrow={1} />
        <Box flexDirection="row" gap={1}>
          {!alert.acknowledged && alert.requiresAcknowledgment && (
            <Box>
              <Text color={theme.success} bold underline>
                [确认]
              </Text>
            </Box>
          )}
          <Box>
            <Text color={theme.inactive} underline>
              [关闭]
            </Text>
          </Box>
        </Box>
      </Box>
      <Box marginTop={0}>
        <Text color={theme.text}>{alert.content}</Text>
      </Box>
      {alert.suggestion && (
        <Box marginTop={0}>
          <Text color={theme.assistant}>💡 建议: {alert.suggestion}</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 警报横幅组件
 *
 * 显示医疗警报信息，包括危急值、药物相互作用、过敏提醒等。
 * 危险级别警报会闪烁提醒用户，支持确认和关闭操作。
 *
 * @example
 * ```tsx
 * <AlertBanner alerts={patientAlerts} />
 * ```
 */
export function AlertBanner({
  alerts = mockAlerts,
  showOnlyUnacknowledged = false,
  onAcknowledge,
  onDismiss,
}: AlertBannerProps): React.ReactElement {
  const theme = useThemeColors();
  const [localAlerts, setLocalAlerts] = useState<AlertItem[]>(alerts);

  const displayAlerts = showOnlyUnacknowledged
    ? localAlerts.filter((a) => !a.acknowledged)
    : localAlerts;

  const dangerCount = localAlerts.filter((a) => a.level === 'danger' && !a.acknowledged).length;
  const warningCount = localAlerts.filter((a) => a.level === 'warning' && !a.acknowledged).length;

  function handleAcknowledge(alertId: string): void {
    setLocalAlerts((prev) =>
      prev.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a)),
    );
    onAcknowledge?.(alertId);
  }

  function handleDismiss(alertId: string): void {
    setLocalAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
    onDismiss?.(alertId);
  }

  if (displayAlerts.length === 0) {
    return (
      <Box borderStyle="round" borderColor={theme.border} paddingX={1}>
        <Text color={theme.success}>✓ 当前无待处理警报</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* 警报汇总 */}
      <Box flexDirection="row" gap={2} marginBottom={0}>
        <Text color={theme.text} bold>
          警报中心
        </Text>
        {dangerCount > 0 && (
          <Text color={theme.alertDanger} bold backgroundColor={theme.criticalValueBg}>
            {' '}
            🚨 {dangerCount} 条危险{' '}
          </Text>
        )}
        {warningCount > 0 && (
          <Text color={theme.alertWarning} bold>
            ⚠ {warningCount} 条警告
          </Text>
        )}
      </Box>

      {/* 警报列表 */}
      {displayAlerts.map((alert) => (
        <AlertItemView
          key={alert.alertId}
          alert={alert}
          onAcknowledge={handleAcknowledge}
          onDismiss={handleDismiss}
        />
      ))}
    </Box>
  );
}
