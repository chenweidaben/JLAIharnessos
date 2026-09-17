/**
 * 健澜科技数智医院智能体 - 医疗确认对话框（增强）
 *
 * 高风险操作二次确认：操作详情、红色风险提示、CDS 检查结果
 * （通过/警告/拦截）、CA 电子签名提示、5 秒强制阅读倒计时、
 * 可选工号验证。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';

import { useThemeColors } from '../theme';

// ============================================================================
// 类型
// ============================================================================

/** CDS 检查结果 */
export type CdsCheckResult = 'passed' | 'warning' | 'blocked';

/** 医疗确认对话框风险等级 */
export type MedicalConfirmRisk = 'low' | 'medium' | 'high' | 'critical';

/** 医疗确认对话框属性 */
export interface MedicalConfirmationDialogProps {
  /** 是否显示 */
  visible: boolean;
  /** 操作标题 */
  title: string;
  /** 操作类型描述（如：开具医嘱 / 开具处方 / 取消医嘱） */
  actionTypeLabel: string;
  /** 风险等级 */
  riskLevel: MedicalConfirmRisk;
  /** 操作详情行 */
  details: string[];
  /** 红色风险提示 */
  riskWarnings?: string[];
  /** 患者姓名 */
  patientName?: string;
  /** CDS 检查结果 */
  cdsResult?: CdsCheckResult;
  /** CDS 备注 */
  cdsMessage?: string;
  /** 是否需要 CA 电子签名 */
  requireCASign?: boolean;
  /** 是否需要工号验证 */
  requireEmployeeId?: boolean;
  /** 强制阅读倒计时秒数，默认 5 */
  readSeconds?: number;
  /** 确认回调（传入工号，若要求验证） */
  onConfirm: (employeeId?: string) => void;
  /** 取消回调 */
  onCancel: () => void;
}

// ============================================================================
// 映射
// ============================================================================

const riskMap: Record<MedicalConfirmRisk, { label: string; colorKey: string }> = {
  low: { label: '低风险', colorKey: 'normalValue' },
  medium: { label: '中风险', colorKey: 'warning' },
  high: { label: '高风险', colorKey: 'abnormalHigh' },
  critical: { label: '极高风险', colorKey: 'criticalValue' },
};

const cdsMap: Record<CdsCheckResult, { label: string; icon: string; colorKey: string }> = {
  passed: { label: 'CDS 通过', icon: '✓', colorKey: 'normalValue' },
  warning: { label: 'CDS 警告', icon: '⚠', colorKey: 'warning' },
  blocked: { label: 'CDS 拦截', icon: '✕', colorKey: 'criticalValue' },
};

// ============================================================================
// 组件
// ============================================================================

/**
 * 医疗确认对话框（增强版）
 *
 * 高风险操作必须等待强制阅读倒计时结束后才可确认；CDS 拦截时禁止
 * 确认。需 CA 签名/工号验证时记录审计。
 *
 * @example
 * ```tsx
 * <MedicalConfirmationDialog
 *   visible={show}
 *   title="开具紧急医嘱"
 *   actionTypeLabel="开具医嘱"
 *   riskLevel="high"
 *   details={['...']}
 *   cdsResult="warning"
 *   requireCASign
 *   onConfirm={ack}
 *   onCancel={cancel}
 * />
 * ```
 */
export function MedicalConfirmationDialog({
  visible,
  title,
  actionTypeLabel,
  riskLevel,
  details,
  riskWarnings = [],
  patientName = '张明华',
  cdsResult = 'passed',
  cdsMessage,
  requireCASign = false,
  requireEmployeeId = false,
  readSeconds = 5,
  onConfirm,
  onCancel,
}: MedicalConfirmationDialogProps): React.ReactElement | null {
  const theme = useThemeColors();
  const [selected, setSelected] = useState(0); // 0=确认 1=取消
  const [countdown, setCountdown] = useState(readSeconds);
  const [employeeId, setEmployeeId] = useState('');

  const risk = riskMap[riskLevel];
  const riskColor = theme[risk.colorKey as keyof typeof theme];
  const cds = cdsMap[cdsResult];
  const cdsColor = theme[cds.colorKey as keyof typeof theme];
  const blocked = cdsResult === 'blocked';
  const needCASign = requireCASign || riskLevel === 'critical';
  const canConfirm =
    countdown <= 0 && !blocked && (!requireEmployeeId || employeeId.trim().length >= 3);

  // 倒计时
  useEffect(() => {
    if (!visible || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, countdown]);

  // 重置
  useEffect(() => {
    if (visible) {
      setCountdown(readSeconds);
      setSelected(0);
      setEmployeeId('');
    }
  }, [visible, readSeconds]);

  useInput(
    (input, key) => {
      if (!visible) return;
      if (key.escape || input === 'n' || input === 'N') {
        onCancel();
        return;
      }
      // 工号输入
      if (requireEmployeeId && countdown > 0) {
        if (key.backspace || key.delete) {
          setEmployeeId((e) => e.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setEmployeeId((e) => e + input);
          return;
        }
      }
      if (key.leftArrow || key.tab) {
        setSelected((i) => (i === 0 ? 1 : 0));
        return;
      }
      if (key.rightArrow) {
        setSelected((i) => (i === 1 ? 0 : 1));
        return;
      }
      if (input === 'y' || input === 'Y' || (key.return && selected === 0)) {
        if (canConfirm) onConfirm(requireEmployeeId ? employeeId.trim() : undefined);
        return;
      }
      if (key.return && selected === 1) {
        onCancel();
        return;
      }
    },
    { isActive: visible },
  );

  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={riskColor}
      backgroundColor={theme.background}
      paddingX={2}
      paddingY={1}
      width={72}
    >
      {/* 标题 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={riskColor} bold>
          ⚠ {title}
        </Text>
        <Text color={riskColor} backgroundColor={theme.panelBackground}>
          {' '}
          {risk.label}{' '}
        </Text>
        <Box flexGrow={1} />
        <Text color={theme.inactive}>{actionTypeLabel}</Text>
      </Box>

      <Text color={theme.subtle}>
        患者: <Text color={theme.text}>{patientName}</Text>
      </Text>

      <Text color={theme.divider}>────────────────────────────────────────────────────</Text>

      {/* 操作详情 */}
      <Text color={theme.assistant} bold>
        操作详情
      </Text>
      {details.map((d, i) => (
        <Text key={i} color={theme.text}>
          {'  '}• {d}
        </Text>
      ))}

      {/* 风险提示 */}
      {riskWarnings.length > 0 && (
        <React.Fragment>
          <Text color={theme.error} bold>
            ⚠ 风险提示
          </Text>
          {riskWarnings.map((w, i) => (
            <Text key={i} color={theme.error}>
              {'  '}• {w}
            </Text>
          ))}
        </React.Fragment>
      )}

      {/* CDS 结果 */}
      <Box marginTop={0} borderStyle="round" borderColor={cdsColor} paddingX={1}>
        <Text color={cdsColor} bold>
          {cds.icon} {cds.label}
        </Text>
        {cdsMessage && <Text color={theme.subtle}>{cdsMessage}</Text>}
        {blocked && (
          <Text color={theme.criticalValue} bold>
            该操作已被 CDS 拦截，无法确认。
          </Text>
        )}
      </Box>

      {/* CA 签名 */}
      {needCASign && (
        <Text color={theme.criticalValue} bold>
          🔐 本操作需 CA 数字签名，将记录审计日志
        </Text>
      )}

      {/* 工号输入 */}
      {requireEmployeeId && (
        <Box
          flexDirection="row"
          alignItems="center"
          borderStyle="round"
          borderColor={theme.inputBorder}
          paddingX={1}
        >
          <Text color={theme.suggestion}>工号:</Text>
          <Text color={theme.text} bold>
            {employeeId || '________'}
          </Text>
          <Text color={theme.text}>▌</Text>
        </Box>
      )}

      {/* 倒计时 */}
      {countdown > 0 ? (
        <Text color={theme.warning}>请仔细阅读操作详情，{countdown} 秒后可确认...</Text>
      ) : blocked ? (
        <Text color={theme.criticalValue} bold>
          操作已被 CDS 拦截，仅可取消。
        </Text>
      ) : (
        <Text color={theme.success} bold>
          ✓ 已可确认
        </Text>
      )}

      <Text color={theme.divider}>────────────────────────────────────────────────────</Text>

      {/* 按钮 */}
      <Box flexDirection="row" justifyContent="center" gap={4}>
        <Box
          backgroundColor={selected === 0 ? theme.buttonPrimary : theme.panelBackground}
          paddingX={1}
        >
          <Text
            color={
              selected === 0
                ? canConfirm
                  ? theme.buttonPrimaryText
                  : theme.inactive
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
          backgroundColor={selected === 1 ? theme.buttonDanger : theme.panelBackground}
          paddingX={1}
        >
          <Text color={selected === 1 ? theme.buttonDangerText : theme.error} bold>
            [N] 取消
          </Text>
        </Box>
      </Box>

      <Text color={theme.inactive}>快捷键: Y=确认 · N/Esc=取消 · ←→/Tab=切换</Text>
    </Box>
  );
}

export default MedicalConfirmationDialog;
