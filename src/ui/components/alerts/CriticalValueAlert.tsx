/**
 * 健澜科技数智医院智能体 - 危急值警报组件
 *
 * 大字体展示危急值项目与数值、参考范围/危急阈值、临床意义、
 * 建议处理、患者信息、通知记录，红色闪烁背景，需输入工号确认。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';

import { useThemeColors } from '../../theme';
import type { ClinicalAlert } from './alertTypes';

// ============================================================================
// 组件 Props
// ============================================================================

/** CriticalValueAlert 属性 */
export interface CriticalValueAlertProps {
  /** 是否显示 */
  visible: boolean;
  /** 危急值警报数据 */
  alert: ClinicalAlert;
  /** 确认回调（传入工号） */
  onAcknowledge?: (alertId: string, employeeId: string) => void;
  /** 关闭/忽略回调 */
  onDismiss?: (alertId: string) => void;
}

/**
 * 危急值警报组件
 *
 * 以红色闪烁背景强提醒。需输入工号后按 Enter 确认，记录通知闭环。
 *
 * @example
 * ```tsx
 * <CriticalValueAlert visible={show} alert={critAlert} onAcknowledge={ack} />
 * ```
 */
export function CriticalValueAlert({
  visible,
  alert,
  onAcknowledge,
  onDismiss,
}: CriticalValueAlertProps): React.ReactElement | null {
  const theme = useThemeColors();
  const [blink, setBlink] = useState(true);
  const [employeeId, setEmployeeId] = useState('');

  const data = alert.critical;

  // 红色闪烁（480ms）
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setBlink((b) => !b), 480);
    return () => clearInterval(timer);
  }, [visible]);

  // 键盘：输入工号 / 确认 / 忽略
  useInput(
    (input, key) => {
      if (!visible || !data) return;
      if (key.escape) {
        onDismiss?.(alert.id);
        return;
      }
      if (key.backspace || key.delete) {
        setEmployeeId((e) => e.slice(0, -1));
        return;
      }
      if (key.return) {
        if (employeeId.trim().length >= 3) {
          onAcknowledge?.(alert.id, employeeId.trim());
        }
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setEmployeeId((e) => e + input);
      }
    },
    { isActive: visible },
  );

  if (!visible || !data) return null;

  const bg = blink ? theme.criticalValueBg : theme.panelBackground;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.criticalValue}
      backgroundColor={bg}
      paddingX={2}
      paddingY={1}
    >
      {/* 标题行 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.criticalValue} bold>
          🚨 危急值警报
        </Text>
        <Text color={theme.criticalValue} backgroundColor={theme.criticalValue}>
          <Text color={theme.inverseText} bold>
            {' '}
            CRITICAL{' '}
          </Text>
        </Text>
        <Box flexGrow={1} />
        <Text color={theme.inactive}>{alert.createdAt}</Text>
      </Box>

      {/* 患者信息 */}
      <Box marginTop={0}>
        <Text color={theme.text}>
          患者:{' '}
          <Text color={theme.text} bold>
            {alert.patient.name}
          </Text>
          {alert.patient.age != null && ` · ${alert.patient.age}岁`}
          {alert.patient.gender && ` · ${alert.patient.gender}`}
          {alert.patient.bedNo && ` · 床号${alert.patient.bedNo}`}
          {alert.patient.department && ` · ${alert.patient.department}`}
        </Text>
      </Box>

      {/* 大字体危急值 */}
      <Box
        flexDirection="row"
        alignItems="flex-end"
        gap={1}
        marginTop={0}
        borderStyle="single"
        borderColor={theme.criticalValue}
        paddingX={1}
      >
        <Text color={theme.text}>{data.itemName}:</Text>
        <Text color={theme.criticalValue} bold>
          {data.value}
        </Text>
        <Text color={theme.subtle}>{data.unit}</Text>
      </Box>

      {/* 参考范围 / 阈值 */}
      <Box flexDirection="row" gap={3} marginTop={0}>
        <Text color={theme.subtle}>
          参考范围: <Text color={theme.text}>{data.referenceRange}</Text>
        </Text>
        <Text color={theme.criticalValue}>
          危急阈值:{' '}
          <Text color={theme.criticalValue} bold>
            {data.criticalThreshold}
          </Text>
        </Text>
      </Box>

      {/* 临床意义 */}
      <Box marginTop={0}>
        <Text color={theme.warning} bold>
          ⚠ 临床意义
        </Text>
        <Text color={theme.text}>{data.clinicalMeaning}</Text>
      </Box>

      {/* 建议处理 */}
      <Box flexDirection="column" marginTop={0}>
        <Text color={theme.success} bold>
          建议处理
        </Text>
        {data.suggestedActions.map((action, i) => (
          <Text key={i} color={theme.text}>
            {'  '}
            {i + 1}. {action}
          </Text>
        ))}
      </Box>

      {/* 通知记录 */}
      <Box flexDirection="column" marginTop={0}>
        <Text color={theme.subtle} bold>
          通知记录 ({data.notifyRecords.length})
        </Text>
        {data.notifyRecords.length === 0 ? (
          <Text color={theme.inactive}> 尚未通知临床医生</Text>
        ) : (
          data.notifyRecords.map((r, i) => (
            <Text key={i} color={theme.text}>
              {'  '}• {r.at} {r.notifiedBy}（{r.role}）
            </Text>
          ))
        )}
      </Box>

      {/* 工号确认 */}
      <Box
        flexDirection="row"
        alignItems="center"
        gap={1}
        marginTop={0}
        borderStyle="round"
        borderColor={theme.inputBorder}
        paddingX={1}
      >
        <Text color={theme.suggestion}>🔐 输入工号确认:</Text>
        <Text color={theme.text} bold>
          {employeeId || '________'}
        </Text>
        <Text color={theme.text}>▌</Text>
      </Box>

      {/* 操作提示 */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Text color={theme.inactive}>Enter=确认（工号≥3位） · Esc=忽略</Text>
        <Text color={theme.criticalValue}>本操作将记录审计日志</Text>
      </Box>
    </Box>
  );
}

export default CriticalValueAlert;
