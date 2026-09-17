/**
 * 健澜科技数智医院智能体 - 急诊分诊屏幕
 *
 * 急诊胸痛患者分诊工作台：顶部分诊级别/生命体征/时间，
 * 中部问诊处置区，底部快捷操作，危急值警报横幅与绿色通道标记。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { AlertBanner, mockAlerts } from '../components/AlertBanner';
import { Badge } from '../components/common/Badge';
import { FooterBar } from '../components/layout/FooterBar';
import { HeaderBar } from '../components/layout/HeaderBar';
import { useThemeColors } from '../theme';

// ============================================================================
// Mock 数据
// ============================================================================

/** 分诊级别 I-IV */
export type TriageLevel = 'I' | 'II' | 'III' | 'IV';

/** 急诊患者数据 */
export interface EmergencyPatient {
  /** 姓名 */
  name: string;
  /** 性别 */
  gender: string;
  /** 年龄 */
  age: number;
  /** 分诊级别 */
  triage: TriageLevel;
  /** 主诉 */
  complaint: string;
  /** 就诊时间 */
  arrivalTime: string;
  /** 是否绿色通道 */
  greenChannel: boolean;
  /** 生命体征摘要 */
  vitals: string;
}

/** 默认 Mock 急诊胸痛患者 */
export const mockEmergencyPatient: EmergencyPatient = {
  name: '赵国强',
  gender: '男',
  age: 63,
  triage: 'I',
  complaint: '突发胸痛2小时，伴大汗、呼吸困难，向左肩放射',
  arrivalTime: '2026-09-14 09:12:36',
  greenChannel: true,
  vitals: 'T36.8℃ P112次/分 R24次/分 BP168/98mmHg SpO2 91%',
};

/** 分诊级别映射 */
const TRIAGE_MAP: Record<
  TriageLevel,
  { label: string; preset: 'critical' | 'danger' | 'warning' | 'info' | 'muted' }
> = {
  I: { label: 'Ⅰ级 濒危', preset: 'critical' },
  II: { label: 'Ⅱ级 危重', preset: 'danger' },
  III: { label: 'Ⅲ级 急症', preset: 'warning' },
  IV: { label: 'Ⅳ级 非急症', preset: 'muted' },
};

/** 底部快捷操作 */
const QUICK_ACTIONS = [
  { label: '开通静脉通路', key: 'F2', icon: '💉' },
  { label: '12导联心电图', key: 'F3', icon: '💓' },
  { label: '急采血', key: 'F4', icon: '🩸' },
  { label: '心内科会诊', key: 'F5', icon: '👥' },
  { label: '推送导管室', key: 'F6', icon: '🏥' },
];

/** 急诊处置记录 */
const MOCK_ACTIONS = [
  { time: '09:12:36', actor: '分诊护士', content: '到达急诊，分诊Ⅰ级，启动绿色通道' },
  { time: '09:13:10', actor: '急诊医师', content: '心电监护、吸氧、建立静脉通路' },
  { time: '09:14:00', actor: '急诊医师', content: '12导联心电图：II/III/aVF ST段抬高0.2mV' },
  { time: '09:15:30', actor: '检验系统', content: '肌钙蛋白I 5.2ng/mL ↑↑ 危急值回报' },
  { time: '09:16:00', actor: 'AI助手', content: '提示：下壁ST段抬高型心梗，建议立即导管室PCI' },
];

// ============================================================================
// 组件 Props
// ============================================================================

/** EmergencyScreen 属性 */
export interface EmergencyScreenProps {
  /** 急诊患者数据，默认 Mock */
  patient?: EmergencyPatient;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 急诊分诊屏幕组件
 *
 * 顶部展示分诊级别与生命体征，中部问诊处置时间线，底部快捷操作。
 * Ⅰ级/危急值场景叠加闪烁红色警报与绿色通道徽标。
 *
 * @example
 * ```tsx
 * <EmergencyScreen patient={mockEmergencyPatient} />
 * ```
 */
export function EmergencyScreen({
  patient = mockEmergencyPatient,
}: EmergencyScreenProps): React.ReactElement {
  const theme = useThemeColors();
  const triage = TRIAGE_MAP[patient.triage];

  return (
    <Box flexDirection="column" flexGrow={1}>
      <HeaderBar
        title="急诊分诊工作台"
        subtitle="Emergency Triage Console"
        rightStatus={`急诊内科 · 09:12`}
      />

      {/* 急诊信息栏 */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.alertDanger}
        paddingX={1}
        marginTop={0}
      >
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Badge label={triage.label} preset={triage.preset} blink={patient.triage === 'I'} />
          {patient.greenChannel && <Badge label="急诊绿色通道" preset="success" icon="🟢" />}
          <Text color={theme.text} bold>
            {patient.name} {patient.gender}
            {patient.age}岁
          </Text>
          <Text color={theme.inactive}>到院 {patient.arrivalTime}</Text>
          <Box flexGrow={1} />
          <Text color={theme.criticalValue} bold>
            🚨 胸痛中心
          </Text>
        </Box>
        <Box flexDirection="row" gap={1} marginTop={0}>
          <Text color={theme.subtle}>主诉:</Text>
          <Text color={theme.text}>{patient.complaint}</Text>
        </Box>
        <Box flexDirection="row" gap={1} marginTop={0}>
          <Text color={theme.subtle}>体征:</Text>
          <Text color={theme.abnormalHigh} bold>
            {patient.vitals}
          </Text>
        </Box>
      </Box>

      {/* 危急值警报 */}
      <Box marginTop={0}>
        <AlertBanner alerts={mockAlerts.slice(0, 2)} showOnlyUnacknowledged />
      </Box>

      {/* 中部问诊/处置区 */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border}
        paddingX={1}
        marginTop={0}
        flexGrow={1}
      >
        <Text color={theme.jianlan} bold>
          📝 急诊处置时间线
        </Text>
        {MOCK_ACTIONS.map((a, i) => (
          <Box key={i} flexDirection="row" gap={1}>
            <Box width={10}>
              <Text color={theme.inactive}>{a.time}</Text>
            </Box>
            <Box width={10}>
              <Text color={theme.assistant}>{a.actor}</Text>
            </Box>
            <Box flexGrow={1}>
              <Text color={theme.text}>{a.content}</Text>
            </Box>
          </Box>
        ))}
      </Box>

      {/* 底部快捷操作 */}
      <Box flexDirection="row" gap={1} marginTop={0} flexWrap="wrap">
        {QUICK_ACTIONS.map((action) => (
          <Box
            key={action.label}
            borderStyle="single"
            borderColor={theme.borderFocus}
            backgroundColor={theme.hoverBackground}
            paddingX={1}
          >
            <Text color={theme.text} underline>
              {action.icon} {action.label}
              <Text color={theme.inactive}> [{action.key}]</Text>
            </Text>
          </Box>
        ))}
      </Box>

      <FooterBar
        shortcuts={[
          { key: '↑↓', label: '选择' },
          { key: 'Enter', label: '执行' },
        ]}
        pendingCount={4}
        criticalCount={2}
      />
    </Box>
  );
}
