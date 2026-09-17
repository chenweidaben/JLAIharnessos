/**
 * 健澜科技数智医院智能体 - 门诊问诊屏幕
 *
 * 三栏布局：左侧患者信息/生命体征，中间 AI 对话区，右侧患者 360 视图。
 * 门诊问诊工作流支持，快捷操作按钮与医疗输入。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { MedicalPromptInput } from '../components/input/MedicalPromptInput';
import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { Patient360View } from '../components/Patient360View';
import { PatientInfoBar } from '../components/PatientInfoBar';
import { VitalSignsPanel } from '../components/VitalSignsPanel';
import { useThemeColors } from '../theme';
import type { MedicalInputMode } from '../types';

// ============================================================================
// Mock 对话消息
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  time: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  {
    role: 'system',
    content: '已加载患者张明华的病历资料，包含既往史、过敏史、近期检验检查结果。',
    time: '14:00:00',
  },
  {
    role: 'user',
    content: '患者今天胸痛加重，结合检验结果分析一下病情',
    time: '14:01:23',
  },
  {
    role: 'assistant',
    content:
      '患者肌钙蛋白I 5.2ng/mL（↑↑危急值），BNP 1850pg/mL（↑），心电图II、III、aVF导联ST段压低。结合胸痛症状持续不缓解，考虑急性非ST段抬高型心肌梗死。\n\n建议：\n1. 立即心电监护，复查心肌酶谱\n2. 抗血小板+抗凝治疗\n3. 心内科急会诊，评估冠脉造影+PCI指征\n4. 注意血钾6.8mmol/L危急值，需降钾治疗',
    time: '14:01:45',
  },
  {
    role: 'user',
    content: '好的，先帮我开心肌酶谱复查和降钾治疗的医嘱',
    time: '14:03:10',
  },
  {
    role: 'assistant',
    content:
      '已为您生成以下医嘱草稿：\n\n1. 心肌酶谱（肌钙蛋白I、CK-MB、肌红蛋白）- 临时医嘱 - 紧急\n2. 10%葡萄糖酸钙注射液10mL 静脉推注 立即\n3. 胰岛素8U+50%葡萄糖40mL 静脉推注 立即\n4. 复查电解质（1小时后）\n\n请确认医嘱内容，确认后将提交HIS系统。',
    time: '14:03:30',
  },
];

// ============================================================================
// 快捷操作
// ============================================================================

const QUICK_ACTIONS = [
  { label: '生成病历', icon: '📄', key: 'F5' },
  { label: '开医嘱', icon: '📋', key: 'F6' },
  { label: '开检验', icon: '🔬', key: 'F3' },
  { label: '查360', icon: '🗂', key: '' },
  { label: '用药咨询', icon: '💊', key: '' },
  { label: '质控检查', icon: '✅', key: 'F7' },
];

// ============================================================================
// 组件 Props
// ============================================================================

/** OutpatientScreen 属性 */
export interface OutpatientScreenProps {
  /** 返回仪表盘回调 */
  onBack?: () => void;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 门诊问诊屏幕
 *
 * 三栏布局：左侧患者信息与生命体征，中间 AI 对话区，右侧患者 360 视图。
 * 支持快捷操作与医疗输入。
 *
 * @example
 * ```tsx
 * <OutpatientScreen onBack={() => setScreen('dashboard')} />
 * ```
 */
export function OutpatientScreen({ onBack }: OutpatientScreenProps): React.ReactElement {
  const theme = useThemeColors();
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);

  function handleSubmit(text: string, _mode: MedicalInputMode): void {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, time },
      {
        role: 'assistant',
        content: '正在分析您的请求，请稍候...（AI回复将在此显示）',
        time,
      },
    ]);
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* 顶部：患者信息栏 */}
      <PatientInfoBar />

      {/* 快捷操作栏 */}
      <Box flexDirection="row" gap={1} marginBottom={0} flexWrap="wrap">
        <Box>
          <Text color={theme.inactive} underline>
            ◀ 返回
          </Text>
        </Box>
        <Text color={theme.divider}>|</Text>
        {QUICK_ACTIONS.map((action) => (
          <Text key={action.label} color={theme.suggestion} underline>
            {action.icon} {action.label}
            {action.key && <Text color={theme.inactive}> [{action.key}]</Text>}
          </Text>
        ))}
      </Box>

      {/* 主体三栏布局 */}
      <ThreeColumnLayout
        left={<VitalSignsPanel />}
        middle={
          <Box
            flexDirection="column"
            flexGrow={1}
            borderStyle="round"
            borderColor={theme.border}
            paddingX={1}
          >
            <Text color={theme.jianlan} bold>
              💬 AI诊疗对话
            </Text>
            <Box flexDirection="column" flexGrow={1}>
              {messages.map((msg, i) => (
                <Box key={i} flexDirection="column">
                  <Box flexDirection="row" gap={1}>
                    <Text
                      color={
                        msg.role === 'user'
                          ? theme.jianlan
                          : msg.role === 'assistant'
                            ? theme.assistant
                            : theme.inactive
                      }
                      bold
                    >
                      {msg.role === 'user'
                        ? '👤 医生'
                        : msg.role === 'assistant'
                          ? '🤖 AI助手'
                          : '⚙ 系统'}
                    </Text>
                    <Text color={theme.inactive}>{msg.time}</Text>
                  </Box>
                  <Text color={theme.text}>{msg.content}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        }
        right={<Patient360View />}
      />

      {/* 底部输入框 */}
      <Box marginTop={0}>
        <MedicalPromptInput onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}
