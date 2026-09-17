/**
 * 健澜科技数智医院智能体 - 查房屏幕
 *
 * 布局：患者列表 + 查房对话区 + 生命体征/医嘱面板
 * 多患者切换，查房记录快速生成。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { MedicalPromptInput } from '../components/input/MedicalPromptInput';
import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { OrderListPanel } from '../components/OrderListPanel';
import { mockPatient, PatientInfoBar } from '../components/PatientInfoBar';
import { VitalSignsPanel } from '../components/VitalSignsPanel';
import { useThemeColors } from '../theme';
import type { MedicalInputMode, PatientInfo } from '../types';

// ============================================================================
// Mock 患者列表
// ============================================================================

const MOCK_PATIENT_LIST: { patient: PatientInfo; summary: string }[] = [
  {
    patient: mockPatient,
    summary: '急性NSTEMI，血钾危急值6.8，需降钾治疗',
  },
  {
    patient: {
      ...mockPatient,
      patientId: 'P20260914002',
      name: '李秀英',
      gender: '女',
      age: 67,
      bedNo: '15床',
      diagnosis: '心力衰竭，心功能III级',
      status: 'monitoring',
      allergies: [],
    },
    summary: '心衰加重，BNP升高，调整利尿剂方案',
  },
  {
    patient: {
      ...mockPatient,
      patientId: 'P20260914003',
      name: '王建国',
      gender: '男',
      age: 72,
      bedNo: '18床',
      diagnosis: '高血压病3级，脑出血恢复期',
      status: 'stable',
      allergies: ['头孢类'],
    },
    summary: '病情稳定，血压控制可，拟明日出院',
  },
  {
    patient: {
      ...mockPatient,
      patientId: 'P20260914004',
      name: '陈美玲',
      gender: '女',
      age: 55,
      bedNo: '20床',
      diagnosis: '心律失常，心房颤动',
      status: 'monitoring',
      allergies: [],
    },
    summary: '房颤复律后，心率偏快，调整β受体阻滞剂',
  },
  {
    patient: {
      ...mockPatient,
      patientId: 'P20260914005',
      name: '刘志强',
      gender: '男',
      age: 61,
      bedNo: '22床',
      diagnosis: '冠心病，PCI术后',
      status: 'stable',
      allergies: [],
    },
    summary: 'PCI术后第3天，恢复良好，继续双抗治疗',
  },
];

// ============================================================================
// Mock 查房记录
// ============================================================================

const MOCK_WARD_NOTES = [
  { time: '08:30', content: '晨间查房开始，共5位患者' },
  { time: '08:35', content: '12床 张明华：胸痛较前减轻，血钾6.8危急值已处理，复查电解质' },
  { time: '08:45', content: '15床 李秀英：呼吸困难减轻，利尿剂加量后尿量可，继续观察' },
  { time: '09:00', content: '18床 王建国：血压135/85，病情稳定，拟明日出院' },
];

// ============================================================================
// 组件 Props
// ============================================================================

/** WardRoundScreen 属性 */
export interface WardRoundScreenProps {
  /** 返回仪表盘回调 */
  onBack?: () => void;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 查房屏幕
 *
 * 左侧患者列表，中间查房对话/记录区，右侧生命体征和医嘱面板。
 * 支持多患者快速切换，查房记录快速生成。
 *
 * @example
 * ```tsx
 * <WardRoundScreen onBack={() => setScreen('dashboard')} />
 * ```
 */
export function WardRoundScreen({ onBack }: WardRoundScreenProps): React.ReactElement {
  const theme = useThemeColors();
  const [selectedPatientIndex, setSelectedPatientIndex] = useState(0);
  const [rightPanel, setRightPanel] = useState<'vitals' | 'order'>('vitals');

  const currentPatient = MOCK_PATIENT_LIST[selectedPatientIndex];

  // 键盘上下键切换患者
  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedPatientIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedPatientIndex((i) => Math.min(MOCK_PATIENT_LIST.length - 1, i + 1));
    }
  });

  function handleSubmit(_text: string, _mode: MedicalInputMode): void {
    // 查房记录提交处理
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* 顶部：当前患者信息 */}
      <PatientInfoBar patient={currentPatient.patient} />

      {/* 操作栏 */}
      <Box flexDirection="row" gap={1} marginTop={0} marginBottom={0}>
        <Box>
          <Text color={theme.inactive} underline>
            ◀ 返回
          </Text>
        </Box>
        <Text color={theme.divider}>|</Text>
        <Text color={theme.text} bold>
          🚶 查房模式
        </Text>
        <Text color={theme.subtle}>
          第 {selectedPatientIndex + 1}/{MOCK_PATIENT_LIST.length} 位患者
        </Text>
        <Text color={theme.divider}>|</Text>
        <Text color={theme.suggestion} underline>
          📝 生成查房记录 [F5]
        </Text>
        <Text color={theme.suggestion} underline>
          📋 开医嘱 [F6]
        </Text>
        <Text color={theme.suggestion} underline>
          🔬 查检验 [F3]
        </Text>
      </Box>

      {/* 主体三栏布局 */}
      <ThreeColumnLayout
        left={
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
            flexGrow={1}
          >
            <Text color={theme.jianlan} bold>
              👥 查房列表 (↑↓)
            </Text>
            <Box flexDirection="column" marginTop={0} flexGrow={1}>
              {MOCK_PATIENT_LIST.map((item, index) => (
                <Box
                  key={item.patient.patientId}
                  flexDirection="column"
                  backgroundColor={
                    index === selectedPatientIndex ? theme.hoverBackground : undefined
                  }
                  borderStyle={index === selectedPatientIndex ? 'single' : undefined}
                  borderColor={index === selectedPatientIndex ? theme.borderFocus : undefined}
                  paddingX={0}
                >
                  <Text
                    color={index === selectedPatientIndex ? theme.text : theme.subtle}
                    bold={index === selectedPatientIndex}
                    underline
                  >
                    {index === selectedPatientIndex ? '▶ ' : '  '}
                    {item.patient.bedNo} {item.patient.name} {item.patient.gender}
                    {item.patient.age}岁
                  </Text>
                  <Text color={theme.inactive}>
                    {'  '}
                    {item.summary}
                  </Text>
                  {item.patient.status === 'critical' && (
                    <Text color={theme.criticalValue} bold>
                      {'  '}🚨 危重
                    </Text>
                  )}
                  {item.patient.allergies.length > 0 && (
                    <Text color={theme.warning}>{'  '}⚠ 过敏</Text>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        }
        middle={
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
            flexGrow={1}
          >
            <Text color={theme.jianlan} bold>
              📝 查房记录
            </Text>
            <Box flexDirection="column" marginTop={0} flexGrow={1}>
              {MOCK_WARD_NOTES.map((note, i) => (
                <Box key={i} flexDirection="row" gap={1}>
                  <Box width={6}>
                    <Text color={theme.inactive}>{note.time}</Text>
                  </Box>
                  <Box flexGrow={1}>
                    <Text color={theme.text}>{note.content}</Text>
                  </Box>
                </Box>
              ))}
              <Box marginTop={0}>
                <Text color={theme.assistant} bold>
                  🤖 AI查房助手
                </Text>
                <Text color={theme.text}>当前患者{currentPatient.patient.name}今日病情变化：</Text>
                <Text color={theme.text}>• 胸痛症状较入院时减轻，硝酸甘油持续泵入中</Text>
                <Text color={theme.abnormalHigh}>
                  • 血钾6.8mmol/L（危急值），已予葡萄糖酸钙+胰岛素降钾
                </Text>
                <Text color={theme.text}>• 肌钙蛋白I 5.2ng/mL，较前升高，建议复查冠脉造影</Text>
                <Text color={theme.subtle}>输入查房意见或按F5生成结构化查房记录...</Text>
              </Box>
            </Box>
          </Box>
        }
        right={
          <Box flexDirection="column">
            <Box flexDirection="row" gap={1} marginBottom={0}>
              <Box>
                <Text
                  color={rightPanel === 'vitals' ? theme.tabActive : theme.inactive}
                  bold={rightPanel === 'vitals'}
                  underline={rightPanel === 'vitals'}
                >
                  [生命体征]
                </Text>
              </Box>
              <Box>
                <Text
                  color={rightPanel === 'order' ? theme.tabActive : theme.inactive}
                  bold={rightPanel === 'order'}
                  underline={rightPanel === 'order'}
                >
                  [医嘱列表]
                </Text>
              </Box>
            </Box>
            {rightPanel === 'vitals' ? <VitalSignsPanel /> : <OrderListPanel />}
          </Box>
        }
      />

      {/* 底部输入 */}
      <Box marginTop={0}>
        <MedicalPromptInput onSubmit={handleSubmit} defaultMode="ward-round" />
      </Box>
    </Box>
  );
}
