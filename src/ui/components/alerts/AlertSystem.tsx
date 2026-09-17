/**
 * 健澜科技数智医院智能体 - 临床警报系统
 *
 * 警报队列管理：critical 顶部横幅/模态弹窗（闪烁+响铃），
 * warning/info 侧边堆叠通知，优先级排序，确认/关闭/延迟，
 * 警报历史记录。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useThemeColors } from '../../theme';
import { beep, type ClinicalAlert, sortAlertsByPriority } from './alertTypes';
import { AllergyAlert } from './AllergyAlert';
import { CriticalValueAlert } from './CriticalValueAlert';
import { DrugInteractionAlert } from './DrugInteractionAlert';

// ============================================================================
// Mock 数据：血钾危急值 + 药物相互作用 + 过敏警报
// ============================================================================

/** 默认 Mock 临床警报 */
export const MOCK_CLINICAL_ALERTS: ClinicalAlert[] = [
  {
    id: 'ALR-CRIT-001',
    level: 'critical',
    kind: 'critical-value',
    title: '血钾危急值',
    patient: { name: '张明华', age: 58, gender: '男', bedNo: '1203-5', department: '心血管内科' },
    createdAt: '06:35:10',
    acknowledged: false,
    snoozed: false,
    critical: {
      itemName: '血钾 (K⁺)',
      value: '6.8',
      unit: 'mmol/L',
      referenceRange: '3.5 - 5.3 mmol/L',
      criticalThreshold: '≥ 6.0 mmol/L',
      clinicalMeaning:
        '血钾显著升高，可导致心肌兴奋性异常、恶性心律失常（室速/室颤）甚至心搏骤停，需紧急处理。',
      suggestedActions: [
        '立即复查电解质确认',
        '10%葡萄糖酸钙 10mL 静脉推注（稳定心肌）',
        '胰岛素8U + 50%葡萄糖 40mL 静脉推注',
        '呋塞米 20mg 静推，必要时急诊透析',
        '持续心电监护，复查血钾 q1h',
      ],
      notifyRecords: [{ notifiedBy: '检验中心 李技术员', role: '检验科', at: '06:35' }],
    },
  },
  {
    id: 'ALR-IX-001',
    level: 'warning',
    kind: 'drug-interaction',
    title: '华法林 × 阿司匹林 相互作用',
    patient: { name: '张明华', age: 58, gender: '男', bedNo: '1203-5' },
    createdAt: '09:05:00',
    acknowledged: false,
    snoozed: false,
    interaction: {
      drugA: '华法林钠片 3mg qn',
      drugB: '阿司匹林肠溶片 100mg qd',
      interactionType: '抗凝 + 抗血小板叠加出血风险',
      severity: 'major',
      clinicalMeaning: '两药联用显著增加消化道及颅内出血风险，INR 易波动。',
      suggestedActions: [
        '评估出血风险，考虑降阶为单抗',
        '密切监测 INR（目标 2.0-2.5）',
        '加用 PPI 保护胃黏膜',
      ],
      referenceSource: 'Micromedex / 健澜合理用药知识库 v3.2',
    },
  },
  {
    id: 'ALR-ALL-001',
    level: 'critical',
    kind: 'allergy',
    title: '青霉素过敏史触发',
    patient: { name: '李秀兰', age: 63, gender: '女', bedNo: '1108-2', department: '呼吸内科' },
    createdAt: '09:10:00',
    acknowledged: false,
    snoozed: false,
    allergy: {
      allergen: '青霉素G',
      reactionType: '皮疹伴喉头水肿（既往）',
      severity: 'severe',
      crossReactivity: ['阿莫西林', '氨苄西林', '头孢氨苄（交叉过敏风险）'],
      suggestedActions: [
        '处方自动过滤青霉素类及交叉过敏药物',
        '已替换为左氧氟沙星抗感染',
        '床旁悬挂过敏标识',
      ],
    },
  },
  {
    id: 'ALR-INFO-001',
    level: 'info',
    kind: 'allergy',
    title: '检查预约提醒',
    patient: { name: '张明华' },
    createdAt: '08:00:00',
    acknowledged: true,
    snoozed: false,
    allergy: {
      allergen: '心脏彩超',
      reactionType: '今日 10:30 预约',
      severity: 'mild',
      crossReactivity: [],
      suggestedActions: ['提前 10 分钟到检查室'],
    },
  },
];

// ============================================================================
// 组件 Props
// ============================================================================

/** AlertSystem 属性 */
export interface AlertSystemProps {
  /** 初始警报队列，默认使用 Mock 数据 */
  initialAlerts?: ClinicalAlert[];
  /** 是否启用键盘交互（确认/延迟/关闭） */
  interactive?: boolean;
  /** 确认回调 */
  onAcknowledge?: (alertId: string) => void;
  /** 关闭回调 */
  onDismiss?: (alertId: string) => void;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 临床警报系统组件
 *
 * 管理警报队列与历史。新危急值自动响铃并以闪烁模态弹窗强提醒；
 * warning/info 以堆叠卡片呈现。按 y 确认、s 延迟、n 关闭。
 *
 * @example
 * ```tsx
 * <AlertSystem interactive initialAlerts={MOCK_CLINICAL_ALERTS} />
 * ```
 */
export function AlertSystem({
  initialAlerts = MOCK_CLINICAL_ALERTS,
  interactive = true,
  onAcknowledge,
  onDismiss,
}: AlertSystemProps): React.ReactElement {
  const theme = useThemeColors();
  const [alerts, setAlerts] = useState<ClinicalAlert[]>(initialAlerts);
  const [history, setHistory] = useState<ClinicalAlert[]>([]);
  const [ackId, setAckId] = useState<string | null>(null);
  const beepedRef = useRef<Set<string>>(new Set());

  // 新危急值到达时响铃
  useEffect(() => {
    for (const a of alerts) {
      if (a.level === 'critical' && !a.acknowledged && !beepedRef.current.has(a.id)) {
        beep();
        beepedRef.current.add(a.id);
      }
    }
  }, [alerts]);

  // 排序：critical 优先
  const sorted = useMemo(() => sortAlertsByPriority(alerts), [alerts]);

  const activeCritical = sorted.find((a) => a.level === 'critical' && !a.acknowledged);
  const stackAlerts = sorted.filter((a) => !(a === activeCritical));

  const criticalCount = alerts.filter((a) => a.level === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.level === 'warning' && !a.acknowledged).length;

  /** 将警报移入历史 */
  function archive(alertId: string): void {
    setAlerts((prev) => {
      const target = prev.find((a) => a.id === alertId);
      if (target) setHistory((h) => [...h, target]);
      return prev.filter((a) => a.id !== alertId);
    });
  }

  /** 确认 */
  function acknowledge(alertId: string, employeeId?: string): void {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)));
    setAckId(employeeId ?? alertId);
    onAcknowledge?.(alertId);
  }

  /** 延迟（10分钟） */
  function snooze(alertId: string): void {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, snoozed: true } : a)));
  }

  /** 关闭并归档 */
  function dismiss(alertId: string): void {
    archive(alertId);
    onDismiss?.(alertId);
  }

  // 键盘：处理堆叠卡片（危急值由 CriticalValueAlert 自己处理）
  useInput(
    (input, key) => {
      if (!interactive || activeCritical) return;
      if (stackAlerts.length === 0) return;
      const top = stackAlerts[0];
      if (!top) return;
      const lower = input.toLowerCase();
      if (lower === 'y') {
        acknowledge(top.id);
        return;
      }
      if (lower === 's') {
        snooze(top.id);
        return;
      }
      if (lower === 'n' || key.escape) {
        dismiss(top.id);
        return;
      }
    },
    { isActive: interactive },
  );

  return (
    <Box flexDirection="column">
      {/* 警报汇总行 */}
      <Box flexDirection="row" gap={2}>
        <Text color={theme.text} bold>
          警报中心
        </Text>
        {criticalCount > 0 && (
          <Text color={theme.criticalValue} backgroundColor={theme.criticalValueBg}>
            {' '}
            🚨 {criticalCount} 危急{' '}
          </Text>
        )}
        {warningCount > 0 && <Text color={theme.alertWarning}>⚠ {warningCount} 警告</Text>}
        {history.length > 0 && <Text color={theme.inactive}>📜 历史 {history.length}</Text>}
        {ackId && <Text color={theme.success}>✓ 已确认 {ackId}</Text>}
      </Box>

      {/* 危急值模态（最高优先级） */}
      {activeCritical?.kind === 'critical-value' && (
        <CriticalValueAlert
          visible
          alert={activeCritical}
          onAcknowledge={(id) => acknowledge(id, 'DOC')}
          onDismiss={dismiss}
        />
      )}

      {/* 其他 critical（过敏等）+ warning + info 堆叠 */}
      {stackAlerts.map((a) => {
        if (a.kind === 'drug-interaction') {
          return (
            <DrugInteractionAlert
              key={a.id}
              visible={!a.snoozed && !a.acknowledged}
              alert={a}
              onConfirm={() => acknowledge(a.id)}
              onIgnore={() => dismiss(a.id)}
            />
          );
        }
        if (a.kind === 'allergy') {
          return (
            <AllergyAlert
              key={a.id}
              visible={!a.snoozed && !a.acknowledged}
              alert={a}
              onConfirm={() => acknowledge(a.id)}
            />
          );
        }
        // 通用 critical 横幅
        return (
          <Box
            key={a.id}
            flexDirection="row"
            borderStyle="round"
            borderColor={theme.alertDanger}
            paddingX={1}
          >
            <Text color={theme.alertDanger} bold>
              🚨 {a.title}
            </Text>
            <Box flexGrow={1} />
            <Text color={theme.inactive}>{a.createdAt}</Text>
          </Box>
        );
      })}

      {/* 空态 */}
      {sorted.length === 0 && (
        <Box borderStyle="round" borderColor={theme.border} paddingX={1}>
          <Text color={theme.success}>✓ 当前无待处理警报</Text>
        </Box>
      )}
    </Box>
  );
}

export default AlertSystem;
