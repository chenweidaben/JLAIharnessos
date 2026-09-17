/**
 * 健澜科技数智医院智能体 - 生命体征面板
 *
 * 显示体温、脉搏、呼吸、血压、血氧等生命体征，
 * 异常值高亮，趋势箭头指示，表格布局展示。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { useThemeColors } from '../theme';
import type { VitalSign, VitalSigns } from '../types';
import { formatTime, getTrendArrow } from '../utils/formatMedical';
import { TrendChart } from './common/TrendChart';

/** 7 天生命体征趋势点 */
export interface VitalTrendPoint {
  /** 日期标签，如 09-08 */
  date: string;
  /** 心率 */
  heartRate: number;
  /** 收缩压 */
  sbp: number;
}

/** 默认 7 天趋势 Mock */
export const mockVitalTrend: VitalTrendPoint[] = [
  { date: '09-08', heartRate: 76, sbp: 128 },
  { date: '09-09', heartRate: 80, sbp: 132 },
  { date: '09-10', heartRate: 84, sbp: 138 },
  { date: '09-11', heartRate: 88, sbp: 142 },
  { date: '09-12', heartRate: 96, sbp: 150 },
  { date: '09-13', heartRate: 98, sbp: 145 },
  { date: '09-14', heartRate: 98, sbp: 145 },
];

// ============================================================================
// Mock 数据
// ============================================================================

/** 默认Mock生命体征数据 */
export const mockVitalSigns: VitalSigns = {
  temperature: {
    name: '体温',
    value: 37.8,
    unit: '℃',
    normalMin: 36.0,
    normalMax: 37.3,
    trend: 'up',
    abnormalLevel: 'abnormal',
    measuredAt: '2026-09-14T14:00:00',
  },
  pulse: {
    name: '脉搏',
    value: 98,
    unit: '次/分',
    normalMin: 60,
    normalMax: 100,
    trend: 'up',
    abnormalLevel: 'borderline',
    measuredAt: '2026-09-14T14:00:00',
  },
  respiration: {
    name: '呼吸',
    value: 22,
    unit: '次/分',
    normalMin: 12,
    normalMax: 20,
    trend: 'up',
    abnormalLevel: 'abnormal',
    measuredAt: '2026-09-14T14:00:00',
  },
  systolicBP: {
    name: '收缩压',
    value: 145,
    unit: 'mmHg',
    normalMin: 90,
    normalMax: 140,
    trend: 'up',
    abnormalLevel: 'abnormal',
    measuredAt: '2026-09-14T14:00:00',
  },
  diastolicBP: {
    name: '舒张压',
    value: 92,
    unit: 'mmHg',
    normalMin: 60,
    normalMax: 90,
    trend: 'stable',
    abnormalLevel: 'borderline',
    measuredAt: '2026-09-14T14:00:00',
  },
  spo2: {
    name: '血氧饱和度',
    value: 94,
    unit: '%',
    normalMin: 95,
    normalMax: 100,
    trend: 'down',
    abnormalLevel: 'abnormal',
    measuredAt: '2026-09-14T14:00:00',
  },
};

// ============================================================================
// 异常等级颜色映射
// ============================================================================

function getAbnormalColor(
  level: VitalSign['abnormalLevel'],
  theme: ReturnType<typeof useThemeColors>,
): string {
  switch (level) {
    case 'critical':
      return theme.criticalValue;
    case 'abnormal':
      return theme.abnormalHigh;
    case 'borderline':
      return theme.borderlineValue;
    default:
      return theme.normalValue;
  }
}

// ============================================================================
// 组件 Props
// ============================================================================

/** VitalSignsPanel 属性 */
export interface VitalSignsPanelProps {
  /** 生命体征数据，默认使用Mock数据 */
  vitals?: VitalSigns;
  /** 面板标题 */
  title?: string;
  /** 是否显示近 7 天趋势，默认 true */
  showTrend?: boolean;
  /** 7 天趋势数据，默认 Mock */
  trendData?: VitalTrendPoint[];
}

// ============================================================================
// 单项体征行组件
// ============================================================================

function VitalSignRow({
  vital,
  theme,
}: {
  vital: VitalSign;
  theme: ReturnType<typeof useThemeColors>;
}): React.ReactElement {
  const color = getAbnormalColor(vital.abnormalLevel, theme);
  const isAbnormal = vital.abnormalLevel !== 'normal';
  const trendArrow = getTrendArrow(vital.trend);

  return (
    <Box flexDirection="row" gap={1}>
      <Box width={12}>
        <Text color={theme.subtle}>{vital.name}</Text>
      </Box>
      <Box width={14}>
        <Text color={color} bold={isAbnormal}>
          {vital.value} {vital.unit}
        </Text>
      </Box>
      <Box width={4}>
        <Text color={color}>{trendArrow}</Text>
      </Box>
      <Box width={20}>
        <Text color={theme.inactive}>
          {vital.normalMin}-{vital.normalMax} {vital.unit}
        </Text>
      </Box>
      <Box width={10}>
        <Text color={theme.inactive}>{formatTime(vital.measuredAt)}</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 生命体征面板组件
 *
 * 以表格形式展示患者的体温、脉搏、呼吸、血压、血氧饱和度等
 * 生命体征指标。异常值以红色/橙色高亮显示，并显示趋势箭头。
 *
 * @example
 * ```tsx
 * <VitalSignsPanel vitals={patientVitals} />
 * ```
 */
export function VitalSignsPanel({
  vitals = mockVitalSigns,
  title = '生命体征',
  showTrend = true,
  trendData = mockVitalTrend,
}: VitalSignsPanelProps): React.ReactElement {
  const theme = useThemeColors();

  // 计算异常项数量
  const vitalList = Object.values(vitals) as VitalSign[];
  const abnormalCount = vitalList.filter((v) => v.abnormalLevel !== 'normal').length;

  // 异常项说明
  const abnormalSigns = vitalList.filter((v) => v.abnormalLevel !== 'normal');

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      paddingX={1}
      paddingY={0}
    >
      {/* 标题行 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.jianlan} bold>
          📊
        </Text>
        <Text color={theme.text} bold>
          {title}
        </Text>
        {abnormalCount > 0 && (
          <Text color={theme.abnormalHigh} bold>
            ({abnormalCount}项异常)
          </Text>
        )}
      </Box>

      {/* 表头 */}
      <Box flexDirection="row" gap={1} marginTop={0}>
        <Box width={12}>
          <Text color={theme.inactive} bold>
            项目
          </Text>
        </Box>
        <Box width={14}>
          <Text color={theme.inactive} bold>
            结果
          </Text>
        </Box>
        <Box width={4}>
          <Text color={theme.inactive} bold>
            趋势
          </Text>
        </Box>
        <Box width={20}>
          <Text color={theme.inactive} bold>
            参考范围
          </Text>
        </Box>
        <Box width={10}>
          <Text color={theme.inactive} bold>
            测量时间
          </Text>
        </Box>
      </Box>

      {/* 分隔线 */}
      <Box>
        <Text color={theme.divider}>──────────────────────────────────────────────</Text>
      </Box>

      {/* 数据行 */}
      <VitalSignRow vital={vitals.temperature} theme={theme} />
      <VitalSignRow vital={vitals.pulse} theme={theme} />
      <VitalSignRow vital={vitals.respiration} theme={theme} />
      <Box flexDirection="row" gap={1}>
        <Box width={12}>
          <Text color={theme.subtle}>血压</Text>
        </Box>
        <Box width={14}>
          <Text
            color={getAbnormalColor(vitals.systolicBP.abnormalLevel, theme)}
            bold={vitals.systolicBP.abnormalLevel !== 'normal'}
          >
            {vitals.systolicBP.value}/{vitals.diastolicBP.value} mmHg
          </Text>
        </Box>
        <Box width={4}>
          <Text color={getAbnormalColor(vitals.systolicBP.abnormalLevel, theme)}>
            {getTrendArrow(vitals.systolicBP.trend)}
          </Text>
        </Box>
        <Box width={20}>
          <Text color={theme.inactive}>90-140/60-90 mmHg</Text>
        </Box>
        <Box width={10}>
          <Text color={theme.inactive}>{formatTime(vitals.systolicBP.measuredAt)}</Text>
        </Box>
      </Box>
      <VitalSignRow vital={vitals.spo2} theme={theme} />

      {/* 异常值说明 */}
      {abnormalSigns.length > 0 && (
        <Box flexDirection="column" marginTop={0}>
          <Text color={theme.abnormalHigh} bold>
            ⚠ 异常说明:
          </Text>
          {abnormalSigns.map((v, i) => (
            <Text key={i} color={theme.abnormalHigh}>
              {'  '}· {v.name} {v.value}
              {v.unit}（参考 {v.normalMin}-{v.normalMax}）
            </Text>
          ))}
        </Box>
      )}

      {/* 近 7 天趋势 */}
      {showTrend && (
        <Box marginTop={0}>
          <TrendChart
            title="近7天趋势"
            height={4}
            series={[
              { label: '心率', points: trendData.map((t) => t.heartRate) },
              { label: '收缩压', points: trendData.map((t) => t.sbp) },
            ]}
            timeLabels={trendData.map((t) => t.date)}
          />
        </Box>
      )}
    </Box>
  );
}
