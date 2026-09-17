/**
 * 健澜科技数智医院智能体 - 科室管理屏幕
 *
 * 科室主任/护士长工作台：顶部科室概览，中部床位图与患者列表，
 * 底部运营指标。Mock 心内科 30 张床位数据。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { FooterBar } from '../components/layout/FooterBar';
import { HeaderBar } from '../components/layout/HeaderBar';
import { useThemeColors } from '../theme';

// ============================================================================
// Mock 数据
// ============================================================================

/** 床位状态 */
export type BedStatus = 'empty' | 'occupied' | 'surgery' | 'isolation' | 'reserved';

/** 患者病情等级 */
export type Severity = 'stable' | 'monitoring' | 'critical';

/** 床位/患者行 */
export interface BedRow {
  /** 床号 */
  bedNo: number;
  /** 床位状态 */
  status: BedStatus;
  /** 姓名（空床为空） */
  name: string;
  /** 诊断 */
  diagnosis: string;
  /** 病情等级 */
  severity: Severity;
  /** 主管医生 */
  doctor: string;
}

/** 科室概览指标 */
export interface DeptOverview {
  /** 在院人数 */
  inHospital: number;
  /** 今日入院 */
  admittedToday: number;
  /** 今日出院 */
  dischargedToday: number;
  /** 今日手术台次 */
  surgeries: number;
  /** 危急值数 */
  criticalValues: number;
  /** 平均住院日 */
  avgStayDays: number;
  /** 床位使用率(%) */
  bedOccupancy: number;
  /** 药占比(%) */
  drugRatio: number;
}

/** 床位状态映射 */
const BED_MAP: Record<
  BedStatus,
  { label: string; char: string; preset: 'success' | 'default' | 'danger' | 'warning' | 'info' }
> = {
  empty: { label: '空床', char: '·', preset: 'success' },
  occupied: { label: '在院', char: '◉', preset: 'default' },
  surgery: { label: '手术中', char: '◆', preset: 'danger' },
  isolation: { label: '隔离', char: '◐', preset: 'warning' },
  reserved: { label: '预留', char: '○', preset: 'info' },
};

/** 病情等级映射 */
const SEVERITY_MAP: Record<
  Severity,
  { label: string; preset: 'success' | 'warning' | 'critical' }
> = {
  stable: { label: '稳定', preset: 'success' },
  monitoring: { label: '监护', preset: 'warning' },
  critical: { label: '危重', preset: 'critical' },
};

/** 生成心内科 30 张床位 Mock 数据 */
function buildMockBeds(): BedRow[] {
  const rows: BedRow[] = [];
  const occupied: Omit<BedRow, 'bedNo' | 'status'>[] = [
    { name: '张明华', diagnosis: '急性NSTEMI', severity: 'critical', doctor: '李建国' },
    { name: '李秀英', diagnosis: '心力衰竭', severity: 'monitoring', doctor: '李建国' },
    { name: '王建国', diagnosis: '高血压脑出血恢复期', severity: 'stable', doctor: '王芳' },
    { name: '陈美玲', diagnosis: '心房颤动', severity: 'monitoring', doctor: '王芳' },
    { name: '刘志强', diagnosis: 'PCI术后', severity: 'stable', doctor: '张伟' },
    { name: '赵丽娟', diagnosis: '不稳定型心绞痛', severity: 'monitoring', doctor: '张伟' },
    { name: '孙文博', diagnosis: '心律失常', severity: 'stable', doctor: '李建国' },
    { name: '周雅芝', diagnosis: '心功能不全', severity: 'monitoring', doctor: '王芳' },
  ];
  let oi = 0;
  for (let bed = 1; bed <= 30; bed++) {
    // 设定若干特殊床位
    if (bed === 12 || bed === 25) {
      rows.push({
        bedNo: bed,
        status: 'surgery',
        name: '手术中',
        diagnosis: '',
        severity: 'stable',
        doctor: '',
      });
    } else if (bed === 8) {
      rows.push({
        bedNo: bed,
        status: 'isolation',
        name: '隔离观察',
        diagnosis: '',
        severity: 'stable',
        doctor: '',
      });
    } else if (bed === 30) {
      rows.push({
        bedNo: bed,
        status: 'reserved',
        name: '预留',
        diagnosis: '',
        severity: 'stable',
        doctor: '',
      });
    } else if (oi < occupied.length) {
      rows.push({ bedNo: bed, status: 'occupied', ...occupied[oi++] });
    } else {
      rows.push({
        bedNo: bed,
        status: 'empty',
        name: '',
        diagnosis: '',
        severity: 'stable',
        doctor: '',
      });
    }
  }
  return rows;
}

/** 默认 Mock 床位 */
export const mockDeptBeds: BedRow[] = buildMockBeds();

/** 默认 Mock 科室概览 */
export const mockDeptOverview: DeptOverview = {
  inHospital: 22,
  admittedToday: 3,
  dischargedToday: 2,
  surgeries: 2,
  criticalValues: 1,
  avgStayDays: 7.6,
  bedOccupancy: 92,
  drugRatio: 28.4,
};

// ============================================================================
// 组件 Props
// ============================================================================

/** DepartmentManagementScreen 属性 */
export interface DepartmentManagementScreenProps {
  /** 床位数据，默认 Mock 心内科 30 床 */
  beds?: BedRow[];
  /** 概览指标，默认 Mock */
  overview?: DeptOverview;
  /** 科室名，默认 心血管内科 */
  departmentName?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 科室管理屏幕组件
 *
 * 顶部科室概览指标，中部以格子床位图展示 30 张床位状态并附患者列表，
 * 底部平均住院日、床位使用率、药占比等运营指标。
 *
 * @example
 * ```tsx
 * <DepartmentManagementScreen beds={beds} overview={overview} />
 * ```
 */
export function DepartmentManagementScreen({
  beds = mockDeptBeds,
  overview = mockDeptOverview,
  departmentName = '心血管内科',
}: DepartmentManagementScreenProps): React.ReactElement {
  const theme = useThemeColors();

  const occupiedBeds = beds.filter((b) => b.status === 'occupied');

  function bedColor(status: BedStatus): string {
    const s = BED_MAP[status];
    switch (status) {
      case 'empty':
        return theme.success;
      case 'occupied':
        return theme.chartBlue;
      case 'surgery':
        return theme.criticalValue;
      case 'isolation':
        return theme.warning;
      case 'reserved':
        return theme.inactive;
    }
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <HeaderBar
        title="科室管理"
        subtitle="Department Operations"
        rightStatus={`${departmentName} · 30床`}
      />

      {/* 顶部科室概览 */}
      <Box
        flexDirection="row"
        gap={3}
        borderStyle="round"
        borderColor={theme.border}
        paddingX={1}
        marginTop={0}
      >
        <Box flexDirection="column">
          <Text color={theme.text} bold>
            {overview.inHospital}
          </Text>
          <Text color={theme.subtle}>在院人数</Text>
        </Box>
        <Box flexDirection="column">
          <Text color={theme.success} bold>
            +{overview.admittedToday}
          </Text>
          <Text color={theme.subtle}>今日入院</Text>
        </Box>
        <Box flexDirection="column">
          <Text color={theme.inactive} bold>
            -{overview.dischargedToday}
          </Text>
          <Text color={theme.subtle}>今日出院</Text>
        </Box>
        <Box flexDirection="column">
          <Text color={theme.chartOrange} bold>
            {overview.surgeries}
          </Text>
          <Text color={theme.subtle}>手术台次</Text>
        </Box>
        <Box flexDirection="column">
          <Text color={theme.criticalValue} bold backgroundColor={theme.criticalValueBg}>
            {' '}
            {overview.criticalValues}{' '}
          </Text>
          <Text color={theme.subtle}>危急值</Text>
        </Box>
      </Box>

      {/* 床位图 */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border}
        paddingX={1}
        marginTop={0}
      >
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Text color={theme.jianlan} bold>
            🛏 床位图
          </Text>
          <Box flexGrow={1} />
          {(Object.keys(BED_MAP) as BedStatus[]).map((k) => (
            <Box key={k} flexDirection="row" gap={0}>
              <Text color={bedColor(k)} bold>
                {BED_MAP[k].char}
              </Text>
              <Text color={theme.subtle}>{BED_MAP[k].label}</Text>
            </Box>
          ))}
        </Box>
        {/* 6 列床位矩阵 */}
        <Box flexDirection="row" flexWrap="wrap" gap={1} marginTop={0}>
          {beds.map((bed) => (
            <Box key={bed.bedNo} width={6}>
              <Text color={bedColor(bed.status)}>
                {String(bed.bedNo).padStart(2, '0')}
                {BED_MAP[bed.status].char}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 患者列表 */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border}
        paddingX={1}
        marginTop={0}
        flexGrow={1}
      >
        <Text color={theme.jianlan} bold>
          👥 在院患者 ({occupiedBeds.length})
        </Text>
        {occupiedBeds.map((b) => {
          const sev = SEVERITY_MAP[b.severity];
          return (
            <Box key={b.bedNo} flexDirection="row" gap={1}>
              <Box width={6}>
                <Text color={theme.subtle}>{b.bedNo}床</Text>
              </Box>
              <Box width={8}>
                <Text color={theme.text} bold>
                  {b.name}
                </Text>
              </Box>
              <Box width={18}>
                <Text color={theme.text}>{b.diagnosis}</Text>
              </Box>
              <Box width={8}>
                <Badge label={sev.label} preset={sev.preset} />
              </Box>
              <Box flexGrow={1}>
                <Text color={theme.inactive}>{b.doctor}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* 底部运营指标 */}
      <Box
        flexDirection="row"
        gap={3}
        borderStyle="round"
        borderColor={theme.border}
        paddingX={1}
        marginTop={0}
      >
        <Box flexDirection="column">
          <Text color={theme.text} bold>
            {overview.avgStayDays} 天
          </Text>
          <Text color={theme.subtle}>平均住院日</Text>
        </Box>
        <ProgressBar value={overview.bedOccupancy} label="床位使用率" />
        <ProgressBar value={overview.drugRatio} label="药占比" />
      </Box>

      <FooterBar
        shortcuts={[{ key: '↑↓', label: '浏览' }]}
        criticalCount={overview.criticalValues}
      />
    </Box>
  );
}
