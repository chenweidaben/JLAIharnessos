/**
 * 健澜科技数智医院智能体 - 确认对话框
 *
 * 高风险操作确认（医嘱/处方），显示操作详情和风险提示，
 * 确认/取消按钮，CA签名提示，模态框效果。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';

import { useThemeColors } from '../theme';

// ============================================================================
// 类型定义
// ============================================================================

/** 确认对话框风险等级 */
export type ConfirmationRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** 确认对话框操作类型 */
export type ConfirmationActionType =
  | 'order'
  | 'prescription'
  | 'lab-test'
  | 'imaging'
  | 'surgery'
  | 'blood-transfusion'
  | 'discharge'
  | 'transfer'
  | 'other';

/** 确认对话框属性 */
export interface ConfirmationDialogProps {
  /** 是否显示 */
  visible: boolean;
  /** 操作标题 */
  title: string;
  /** 操作类型 */
  actionType: ConfirmationActionType;
  /** 风险等级 */
  riskLevel: ConfirmationRiskLevel;
  /** 操作详情 */
  details: string[];
  /** 风险提示 */
  riskWarnings?: string[];
  /** 患者姓名 */
  patientName?: string;
  /** 是否需要CA签名（高风险操作） */
  requireCASign?: boolean;
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

// ============================================================================
// 映射
// ============================================================================

const actionTypeMap: Record<ConfirmationActionType, { label: string; icon: string }> = {
  order: { label: '医嘱', icon: '📋' },
  prescription: { label: '处方', icon: '💊' },
  'lab-test': { label: '检验', icon: '🔬' },
  imaging: { label: '检查', icon: '🩻' },
  surgery: { label: '手术', icon: '🏥' },
  'blood-transfusion': { label: '输血', icon: '🩸' },
  discharge: { label: '出院', icon: '🚪' },
  transfer: { label: '转科', icon: '🔄' },
  other: { label: '操作', icon: '⚙️' },
};

const riskLevelMap: Record<ConfirmationRiskLevel, { label: string; color: string }> = {
  low: { label: '低风险', color: 'success' },
  medium: { label: '中风险', color: 'warning' },
  high: { label: '高风险', color: 'abnormalHigh' },
  critical: { label: '极高风险', color: 'criticalValue' },
};

// ============================================================================
// 组件
// ============================================================================

/**
 * 确认对话框组件
 *
 * 用于高风险医疗操作的二次确认，显示操作详情、风险提示，
 * 极高风险操作需要CA数字签名。支持键盘快捷键（Y确认/N取消）。
 *
 * @example
 * ```tsx
 * <ConfirmationDialog
 *   visible={showConfirm}
 *   title="开具紧急医嘱"
 *   actionType="order"
 *   riskLevel="high"
 *   details={['硝酸甘油注射液 5mg 静脉滴注 立即']}
 *   riskWarnings={['可能引起血压下降', '需密切监测血压']}
 *   onConfirm={handleConfirm}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function ConfirmationDialog({
  visible,
  title,
  actionType,
  riskLevel,
  details,
  riskWarnings = [],
  patientName = '张明华',
  requireCASign = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps): React.ReactElement | null {
  const theme = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [countdown, setCountdown] = useState(requireCASign ? 3 : 0);

  const actionInfo = actionTypeMap[actionType];
  const riskInfo = riskLevelMap[riskLevel];
  const needCASign = requireCASign || riskLevel === 'critical';

  // 倒计时（高风险操作强制阅读）
  useEffect(() => {
    if (!visible || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, countdown]);

  // 键盘输入
  useInput(
    (input, key) => {
      if (!visible) return;
      if (input === 'y' || input === 'Y' || (key.return && selectedIndex === 0)) {
        if (countdown <= 0) onConfirm();
        return;
      }
      if (input === 'n' || input === 'N' || key.escape || (key.return && selectedIndex === 1)) {
        onCancel();
        return;
      }
      if (key.leftArrow || key.tab) {
        setSelectedIndex((i) => (i === 0 ? 1 : 0));
      }
      if (key.rightArrow) {
        setSelectedIndex((i) => (i === 1 ? 0 : 1));
      }
    },
    { isActive: visible },
  );

  if (!visible) return null;

  const riskColor =
    riskLevel === 'critical'
      ? theme.criticalValue
      : riskLevel === 'high'
        ? theme.abnormalHigh
        : riskLevel === 'medium'
          ? theme.warning
          : theme.success;

  const canConfirm = countdown <= 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={riskColor}
      backgroundColor={theme.background}
      paddingX={2}
      paddingY={1}
      width={70}
    >
      {/* 标题 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={riskColor} bold>
          {actionInfo.icon}
        </Text>
        <Text color={theme.text} bold>
          {title}
        </Text>
        <Text color={riskColor} bold backgroundColor={theme.panelBackground}>
          {' '}
          {riskInfo.label}{' '}
        </Text>
      </Box>

      {/* 患者信息 */}
      <Box marginTop={0}>
        <Text color={theme.subtle}>
          患者: <Text color={theme.text}>{patientName}</Text>
        </Text>
      </Box>

      {/* 分隔线 */}
      <Box marginTop={0}>
        <Text color={theme.divider}>──────────────────────────────────────────────────────</Text>
      </Box>

      {/* 操作详情 */}
      <Box flexDirection="column" marginTop={0}>
        <Text color={theme.assistant} bold>
          操作详情:
        </Text>
        {details.map((detail, i) => (
          <Text key={i} color={theme.text}>
            {'  '}• {detail}
          </Text>
        ))}
      </Box>

      {/* 风险提示 */}
      {riskWarnings.length > 0 && (
        <Box flexDirection="column" marginTop={0}>
          <Text color={theme.warning} bold>
            ⚠ 风险提示:
          </Text>
          {riskWarnings.map((warning, i) => (
            <Text key={i} color={theme.warning}>
              {'  '}• {warning}
            </Text>
          ))}
        </Box>
      )}

      {/* CA签名提示 */}
      {needCASign && (
        <Box marginTop={0}>
          <Text color={theme.criticalValue} bold>
            🔐 本操作需CA数字签名确认，将记录操作审计日志
          </Text>
        </Box>
      )}

      {/* 倒计时提示 */}
      {countdown > 0 && (
        <Box marginTop={0}>
          <Text color={theme.warning}>请仔细阅读操作详情，{countdown}秒后可确认...</Text>
        </Box>
      )}

      {/* 分隔线 */}
      <Box marginTop={0}>
        <Text color={theme.divider}>──────────────────────────────────────────────────────</Text>
      </Box>

      {/* 按钮 */}
      <Box flexDirection="row" justifyContent="center" gap={4} marginTop={0}>
        <Box
          backgroundColor={selectedIndex === 0 ? theme.buttonPrimary : theme.panelBackground}
          paddingX={1}
        >
          <Text
            color={
              selectedIndex === 0
                ? theme.buttonPrimaryText
                : canConfirm
                  ? theme.success
                  : theme.inactive
            }
            bold
          >
            [Y] 确认{needCASign ? '并签名' : ''}
          </Text>
        </Box>
        <Box
          backgroundColor={selectedIndex === 1 ? theme.buttonDanger : theme.panelBackground}
          paddingX={1}
        >
          <Text color={selectedIndex === 1 ? theme.buttonDangerText : theme.error} bold>
            [N] 取消
          </Text>
        </Box>
      </Box>

      {/* 快捷键提示 */}
      <Box marginTop={0}>
        <Text color={theme.inactive}>快捷键: Y=确认, N=取消, Esc=取消, ←→/Tab=切换按钮</Text>
      </Box>
    </Box>
  );
}
