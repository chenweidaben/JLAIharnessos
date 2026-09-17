/**
 * 健澜科技数智医院智能体 - 患者信息栏
 *
 * 显示当前患者基本信息，包含过敏史醒目标记、危急值提醒、
 * 患者状态标签，支持折叠/展开。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { useThemeColors } from '../theme';
import type { PatientInfo, PatientStatus } from '../types';
import { formatDate } from '../utils/formatMedical';

// ============================================================================
// Mock 数据
// ============================================================================

/** 默认Mock患者信息 */
export const mockPatient: PatientInfo = {
  patientId: 'P20260914001',
  visitNo: 'ZY202609140089',
  name: '张明华',
  gender: '男',
  age: 58,
  department: '心血管内科',
  bedNo: '12床',
  diagnosis: '冠状动脉粥样硬化性心脏病；急性非ST段抬高型心肌梗死；2型糖尿病',
  allergies: ['青霉素', '磺胺类药物'],
  visitType: '住院',
  status: 'monitoring',
  attendingDoctor: '李建国 主任医师',
  admissionTime: '2026-09-12T08:30:00',
};

// ============================================================================
// 患者状态映射
// ============================================================================

const patientStatusMap: Record<PatientStatus, { label: string; color: string }> = {
  stable: { label: '稳定', color: 'patientStable' },
  monitoring: { label: '监护中', color: 'patientMonitoring' },
  critical: { label: '危重', color: 'patientCritical' },
  discharged: { label: '已出院', color: 'patientDischarged' },
};

// ============================================================================
// 组件 Props
// ============================================================================

/** PatientInfoBar 属性 */
export interface PatientInfoBarProps {
  /** 患者信息，默认使用Mock数据 */
  patient?: PatientInfo;
  /** 是否显示危急值提醒 */
  showCriticalAlert?: boolean;
  /** 危急值提醒内容 */
  criticalAlertText?: string;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 患者信息栏组件
 *
 * 在屏幕顶部显示当前患者的基本信息，包括姓名、性别、年龄、科室、
 * 床号、诊断等。过敏史以红色徽章醒目标记，支持折叠/展开。
 *
 * @example
 * ```tsx
 * <PatientInfoBar patient={patientInfo} />
 * ```
 */
export function PatientInfoBar({
  patient = mockPatient,
  showCriticalAlert = true,
  criticalAlertText = '血钾 6.8 mmol/L ↑↑ 危急值',
  defaultExpanded = true,
}: PatientInfoBarProps): React.ReactElement {
  const theme = useThemeColors();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const statusInfo = patientStatusMap[patient.status];
  const hasAllergies = patient.allergies.length > 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      paddingX={1}
      paddingY={0}
    >
      {/* 第一行：核心信息 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.jianlan} bold>
          👤
        </Text>
        <Text color={theme.text} bold>
          {patient.name}
        </Text>
        <Text color={theme.subtle}>
          {patient.gender} · {patient.age}岁
        </Text>
        <Text color={theme.inactive}>|</Text>
        <Text color={theme.text}>{patient.department}</Text>
        <Text color={theme.inactive}>|</Text>
        <Text color={theme.text}>{patient.bedNo}</Text>
        <Text color={theme.inactive}>|</Text>
        <Text color={theme.subtle}>住院号: {patient.visitNo}</Text>

        {/* 患者状态标签 */}
        <Box marginLeft={1}>
          <Text
            color={theme[statusInfo.color as keyof typeof theme]}
            bold
            backgroundColor={theme.panelBackground}
          >
            {' '}
            {statusInfo.label}{' '}
          </Text>
        </Box>

        {/* 就诊类型 */}
        <Box>
          <Text color={theme.assistant} bold backgroundColor={theme.panelBackground}>
            {' '}
            {patient.visitType}{' '}
          </Text>
        </Box>

        {/* 过敏史徽章 */}
        {hasAllergies && (
          <Box>
            <Text color={theme.criticalValue} bold backgroundColor={theme.criticalValueBg}>
              {' '}
              ⚠ 过敏: {patient.allergies.join('、')}{' '}
            </Text>
          </Box>
        )}

        {/* 折叠按钮 */}
        <Box flexGrow={1} />
        <Box>
          <Text color={theme.suggestion} underline>
            {expanded ? '收起 ▲' : '展开 ▼'}
          </Text>
        </Box>
      </Box>

      {/* 第二行：诊断和详细信息（展开时显示） */}
      {expanded && (
        <Box flexDirection="column" marginTop={0}>
          <Box flexDirection="row" gap={1} marginTop={0}>
            <Text color={theme.subtle} bold>
              诊断:
            </Text>
            <Text color={theme.text}>{patient.diagnosis}</Text>
          </Box>
          <Box flexDirection="row" gap={3} marginTop={0}>
            <Text color={theme.subtle}>
              主治: <Text color={theme.text}>{patient.attendingDoctor}</Text>
            </Text>
            <Text color={theme.subtle}>
              入院: <Text color={theme.text}>{formatDate(patient.admissionTime)}</Text>
            </Text>
            <Text color={theme.subtle}>
              患者ID: <Text color={theme.text}>{patient.patientId}</Text>
            </Text>
          </Box>
        </Box>
      )}

      {/* 危急值提醒横幅 */}
      {showCriticalAlert && expanded && (
        <Box marginTop={0} marginBottom={0}>
          <Text color={theme.criticalValue} bold backgroundColor={theme.criticalValueBg}>
            {' '}
            🚨 危急值提醒: {criticalAlertText} 请立即处理！{' '}
          </Text>
        </Box>
      )}
    </Box>
  );
}
