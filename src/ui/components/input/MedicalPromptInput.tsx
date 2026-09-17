/**
 * 健澜科技数智医院智能体 - 医疗场景输入框
 *
 * 基于原始PromptInput的医疗化定制，支持医疗术语联想、
 * @患者引用、#医嘱引用、输入模式切换、快捷键提示。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useRef, useState } from 'react';

import { useThemeColors } from '../../theme';
import type { InputModeInfo, MedicalInputMode } from '../../types';

// ============================================================================
// 输入模式定义
// ============================================================================

/** 医疗输入模式列表 */
export const INPUT_MODES: InputModeInfo[] = [
  {
    mode: 'consultation',
    label: '问诊',
    prefix: '',
    description: '自由问诊/病情咨询模式',
    placeholder: '输入问诊内容，或输入 / 查看命令...',
  },
  {
    mode: 'order',
    label: '医嘱',
    prefix: '@',
    description: '开具医嘱/处方/检查申请模式',
    placeholder: '@ 输入医嘱内容，如：阿司匹林肠溶片100mg qd...',
  },
  {
    mode: 'ward-round',
    label: '查房',
    prefix: '!',
    description: '快速查房/批量患者处理模式',
    placeholder: '! 输入查房记录或患者状态变更...',
  },
  {
    mode: 'consultation-md',
    label: '会诊',
    prefix: '$',
    description: '发起多学科会诊/远程会诊模式',
    placeholder: '$ 输入会诊目的和邀请科室...',
  },
];

// ============================================================================
// 医疗术语联想数据
// ============================================================================

/** 诊断术语联想 */
const DIAGNOSIS_SUGGESTIONS = [
  '冠状动脉粥样硬化性心脏病',
  '急性心肌梗死',
  '高血压病',
  '2型糖尿病',
  '心力衰竭',
  '心律失常',
  '肺炎',
  '慢性阻塞性肺疾病',
  '脑梗死',
  '急性胃肠炎',
];

/** 药品术语联想 */
const DRUG_SUGGESTIONS = [
  '阿司匹林肠溶片',
  '阿托伐他汀钙片',
  '硝酸甘油注射液',
  '美托洛尔缓释片',
  '氨氯地平片',
  '二甲双胍片',
  '奥美拉唑肠溶胶囊',
  '头孢曲松钠',
  '低分子肝素钠',
  '呋塞米注射液',
];

/** 检查项目联想 */
const EXAM_SUGGESTIONS = [
  '血常规',
  '生化全套',
  '心肌酶谱',
  '凝血功能',
  '心电图',
  '心脏彩超',
  '胸部CT',
  '冠脉CTA',
  '头颅MRI',
  '腹部B超',
];

// ============================================================================
// 组件 Props
// ============================================================================

/** MedicalPromptInput 属性 */
export interface MedicalPromptInputProps {
  /** 提交回调 */
  onSubmit?: (text: string, mode: MedicalInputMode) => void;
  /** 中断回调 */
  onInterrupt?: () => void;
  /** 是否禁用输入 */
  disabled?: boolean;
  /** 默认输入模式 */
  defaultMode?: MedicalInputMode;
  /** 当前患者姓名（用于@引用显示） */
  patientName?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 医疗场景输入框组件
 *
 * 支持多种医疗输入模式（问诊/医嘱/查房/会诊），提供医疗术语联想，
 * 支持@患者引用和#医嘱引用，显示快捷键提示。
 *
 * @example
 * ```tsx
 * <MedicalPromptInput onSubmit={handleSubmit} />
 * ```
 */
export function MedicalPromptInput({
  onSubmit,
  onInterrupt,
  disabled = false,
  defaultMode = 'consultation',
  patientName = '张明华',
}: MedicalPromptInputProps): React.ReactElement {
  const theme = useThemeColors();
  const [inputValue, setInputValue] = useState('');
  const [currentMode, setCurrentMode] = useState<MedicalInputMode>(defaultMode);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef(inputValue);
  inputRef.current = inputValue;

  const modeInfo = INPUT_MODES.find((m) => m.mode === currentMode) ?? INPUT_MODES[0];

  // 根据输入内容生成联想
  useEffect(() => {
    if (inputValue.length < 2) {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    let matched: string[] = [];
    if (currentMode === 'order') {
      // 医嘱模式：药品和检查
      matched = [
        ...DRUG_SUGGESTIONS.filter((d) => d.includes(inputValue)),
        ...EXAM_SUGGESTIONS.filter((e) => e.includes(inputValue)),
      ].slice(0, 5);
    } else {
      // 问诊模式：诊断
      matched = DIAGNOSIS_SUGGESTIONS.filter((d) => d.includes(inputValue)).slice(0, 5);
    }

    if (matched.length > 0) {
      setSuggestions(matched);
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, currentMode]);

  // 键盘输入处理
  useInput(
    (input, key) => {
      if (disabled) return;

      // Ctrl+C 中断
      if (key.ctrl && input === 'c') {
        onInterrupt?.();
        return;
      }

      // 提交
      if (key.return && !key.shift) {
        if (showSuggestions && suggestions[suggestionIndex]) {
          // 接受联想
          setInputValue(suggestions[suggestionIndex]);
          setShowSuggestions(false);
        } else if (inputValue.trim()) {
          onSubmit?.(inputValue, currentMode);
          setInputValue('');
        }
        return;
      }

      // 联想导航
      if (showSuggestions) {
        if (key.downArrow) {
          setSuggestionIndex((i) => (i + 1) % suggestions.length);
          return;
        }
        if (key.upArrow) {
          setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (key.tab) {
          if (suggestions[suggestionIndex]) {
            setInputValue(suggestions[suggestionIndex]);
            setShowSuggestions(false);
          }
          return;
        }
        if (key.escape) {
          setShowSuggestions(false);
          return;
        }
      }

      // 模式切换 (Ctrl+E)
      if (key.ctrl && input === 'e') {
        const modes = INPUT_MODES.map((m) => m.mode);
        const currentIndex = modes.indexOf(currentMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        setCurrentMode(nextMode);
        return;
      }

      // @患者引用
      if (input === '@') {
        setInputValue((prev) => prev + `@${patientName} `);
        return;
      }

      // 普通字符输入
      if (input && !key.ctrl && !key.meta) {
        setInputValue((prev) => prev + input);
        return;
      }

      // 退格
      if (key.backspace || key.delete) {
        setInputValue((prev) => prev.slice(0, -1));
        return;
      }
    },
    { isActive: !disabled },
  );

  const modeColor =
    currentMode === 'order'
      ? theme.permission
      : currentMode === 'ward-round'
        ? theme.fastMode
        : currentMode === 'consultation-md'
          ? theme.merged
          : theme.assistant;

  return (
    <Box flexDirection="column">
      {/* 联想下拉 */}
      {showSuggestions && suggestions.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.borderFocus}
          backgroundColor={theme.panelBackground}
          paddingX={1}
          marginBottom={0}
        >
          <Text color={theme.subtle} bold>
            💡 医疗术语联想 (↑↓导航, Tab/Enter接受, Esc关闭)
          </Text>
          {suggestions.map((s, i) => (
            <Text
              key={s}
              color={i === suggestionIndex ? theme.text : theme.inactive}
              backgroundColor={i === suggestionIndex ? theme.hoverBackground : undefined}
              bold={i === suggestionIndex}
            >
              {i === suggestionIndex ? '▶ ' : '  '}
              {s}
            </Text>
          ))}
        </Box>
      )}

      {/* 输入框 */}
      <Box
        flexDirection="row"
        alignItems="center"
        borderStyle="round"
        borderColor={disabled ? theme.border : theme.inputBorder}
        backgroundColor={theme.background}
        paddingX={1}
        paddingY={0}
      >
        {/* 模式指示器 */}
        <Box marginRight={1}>
          <Text color={modeColor} bold backgroundColor={theme.panelBackground}>
            {' '}
            {modeInfo.prefix || '●'} {modeInfo.label}{' '}
          </Text>
        </Box>

        {/* 输入内容 */}
        <Box flexGrow={1}>
          <Text color={disabled ? theme.inactive : theme.text}>
            {inputValue || (
              <Text color={theme.inactive} dimColor>
                {modeInfo.placeholder}
              </Text>
            )}
            {!disabled && <Text color={theme.text}>▌</Text>}
          </Text>
        </Box>

        {/* 引用提示 */}
        <Box marginLeft={1}>
          <Text color={theme.inactive}>@患者 #医嘱</Text>
        </Box>
      </Box>

      {/* 底部快捷键提示 */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Text color={theme.inactive}>
          <Text color={theme.suggestion}>[Enter]</Text> 提交
          <Text color={theme.suggestion}> [Ctrl+E]</Text> 切换模式
          <Text color={theme.suggestion}> [Ctrl+C]</Text> 中断
          <Text color={theme.suggestion}> [Ctrl+P]</Text> 命令面板
        </Text>
        <Text color={theme.inactive}>{inputValue.length} 字符</Text>
      </Box>
    </Box>
  );
}
