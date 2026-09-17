/**
 * 健澜科技数智医院智能体 - 对话输入框
 *
 * 多行文本输入，医疗术语联想（诊断/药品/检查），@患者 / #医嘱 / $检验
 * 引用，问诊/医嘱/查房/会诊模式切换，历史记录上下键浏览，
 * Enter 发送 / Shift+Enter 换行。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useThemeColors } from '../../theme';
import type { ChatInputMode, ChatInputModeInfo } from './chatTypes';

// ============================================================================
// 输入模式定义
// ============================================================================

/** 医疗输入模式列表 */
export const CHAT_INPUT_MODES: ChatInputModeInfo[] = [
  {
    mode: 'consultation',
    label: '问诊',
    icon: '💬',
    placeholder: '输入问诊内容，或输入 / 查看命令...',
  },
  {
    mode: 'order',
    label: '医嘱',
    icon: '📋',
    placeholder: '输入医嘱内容，如：阿司匹林肠溶片 100mg po qd...',
  },
  { mode: 'ward-round', label: '查房', icon: '🏥', placeholder: '输入查房记录或患者状态变更...' },
  { mode: 'consultation-md', label: '会诊', icon: '👥', placeholder: '输入会诊目的与邀请科室...' },
];

// ============================================================================
// 医疗术语联想库
// ============================================================================

/** 诊断术语联想 */
const DIAGNOSIS_SUGGESTIONS = [
  '冠状动脉粥样硬化性心脏病',
  '急性非ST段抬高型心肌梗死',
  '高血压病3级（很高危）',
  '2型糖尿病',
  '慢性心力衰竭',
  '心房颤动',
  '社区获得性肺炎',
  '慢性阻塞性肺疾病急性加重',
  '脑梗死（急性期）',
  '急性肾盂肾炎',
];

/** 药品术语联想 */
const DRUG_SUGGESTIONS = [
  '阿司匹林肠溶片',
  '阿托伐他汀钙片',
  '硫酸氢氯吡格雷片',
  '琥珀酸美托洛尔缓释片',
  '苯磺酸氨氯地平片',
  '盐酸二甲双胍片',
  '注射用奥美拉唑钠',
  '头孢曲松钠',
  '低分子肝素钠注射液',
  '呋塞米注射液',
];

/** 检查项目联想 */
const EXAM_SUGGESTIONS = [
  '血常规',
  '生化全套',
  '心肌酶谱',
  '凝血功能四项',
  '十二导联心电图',
  '心脏彩超',
  '胸部CT平扫',
  '冠脉CTA',
  '头颅MRI',
  '腹部B超',
];

/** 引用候选（@患者 / #医嘱 / $检验） */
const PATIENT_REFS = ['张明华 58岁男 心血管内科', '李秀兰 63岁女 呼吸内科'];
const ORDER_REFS = ['长期医嘱-阿司匹林100mg', '临时医嘱-心肌酶谱复查'];
const LAB_REFS = ['肌钙蛋白I 5.2ng/mL ↑↑', '血钾 6.8mmol/L ↑↑'];

// ============================================================================
// 组件 Props
// ============================================================================

/** ChatInput 属性 */
export interface ChatInputProps {
  /** 提交回调（文本 + 模式） */
  onSubmit?: (text: string, mode: ChatInputMode) => void;
  /** 中断回调 */
  onInterrupt?: () => void;
  /** 是否禁用输入 */
  disabled?: boolean;
  /** 默认输入模式 */
  defaultMode?: ChatInputMode;
  /** 当前患者姓名 */
  patientName?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 对话输入框组件
 *
 * 多行医疗输入。Enter 发送，Shift+Enter 换行；↑↓ 在历史记录间浏览
 * （联想弹出时切换联想项）；Ctrl+E 切换模式；@/#/$ 插入引用。
 *
 * @example
 * ```tsx
 * <ChatInput onSubmit={(text, mode) => send(text, mode)} />
 * ```
 */
export function ChatInput({
  onSubmit,
  onInterrupt,
  disabled = false,
  defaultMode = 'consultation',
  patientName = '张明华',
}: ChatInputProps): React.ReactElement {
  const theme = useThemeColors();
  const [buffer, setBuffer] = useState('');
  const [mode, setMode] = useState<ChatInputMode>(defaultMode);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bufferRef = useRef(buffer);
  bufferRef.current = buffer;

  const modeInfo = CHAT_INPUT_MODES.find((m) => m.mode === mode) ?? CHAT_INPUT_MODES[0];

  // 根据当前词生成联想
  useEffect(() => {
    const currentWord = buffer.split(/[\s\n]/).pop() ?? '';
    if (currentWord.length < 2) {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }
    const pool =
      mode === 'order'
        ? [...DRUG_SUGGESTIONS, ...EXAM_SUGGESTIONS]
        : mode === 'consultation-md'
          ? [...DIAGNOSIS_SUGGESTIONS, ...EXAM_SUGGESTIONS]
          : [...DIAGNOSIS_SUGGESTIONS, ...DRUG_SUGGESTIONS];
    const matched = pool.filter((s) => s.includes(currentWord)).slice(0, 5);
    if (matched.length > 0) {
      setSuggestions(matched);
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [buffer, mode]);

  /** 接受联想：用选中项替换当前词 */
  function acceptSuggestion(suggestion: string): void {
    const lines = buffer.split('\n');
    const last = lines[lines.length - 1] ?? '';
    const replaced = last.replace(/[\S]*$/, suggestion);
    lines[lines.length - 1] = replaced;
    setBuffer(lines.join('\n') + ' ');
    setShowSuggestions(false);
  }

  /** 插入引用 */
  function insertRef(kind: 'patient' | 'order' | 'lab'): void {
    const label =
      kind === 'patient' ? PATIENT_REFS[0] : kind === 'order' ? ORDER_REFS[0] : LAB_REFS[0];
    const prefix = kind === 'patient' ? '@' : kind === 'order' ? '#' : '$';
    setBuffer((b) => `${b}${prefix}${label} `);
  }

  // 键盘输入
  useInput(
    (input, key) => {
      if (disabled) return;

      // Ctrl+C 中断
      if (key.ctrl && input === 'c') {
        onInterrupt?.();
        return;
      }

      // 联想弹出时优先处理导航
      if (showSuggestions) {
        if (key.downArrow) {
          setSuggestionIndex((i) => (i + 1) % suggestions.length);
          return;
        }
        if (key.upArrow) {
          setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (key.tab || (key.return && !key.shift)) {
          if (suggestions[suggestionIndex]) acceptSuggestion(suggestions[suggestionIndex]);
          return;
        }
        if (key.escape) {
          setShowSuggestions(false);
          return;
        }
      }

      // Enter（无 Shift）= 发送；Shift+Enter = 换行
      if (key.return && !key.shift) {
        const text = buffer.trim();
        if (text) {
          onSubmit?.(text, mode);
          setHistory((h) => [...h, text]);
          setBuffer('');
          setHistoryIndex(-1);
        }
        return;
      }
      if (key.return && key.shift) {
        setBuffer((b) => b + '\n');
        return;
      }

      // 历史记录浏览（↑↓）
      if (key.upArrow) {
        if (history.length === 0) return;
        const idx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(idx);
        setBuffer(history[idx] ?? '');
        return;
      }
      if (key.downArrow) {
        if (historyIndex === -1) return;
        const idx = historyIndex + 1;
        if (idx >= history.length) {
          setHistoryIndex(-1);
          setBuffer('');
        } else {
          setHistoryIndex(idx);
          setBuffer(history[idx] ?? '');
        }
        return;
      }

      // 模式切换 Ctrl+E
      if (key.ctrl && input === 'e') {
        const modes = CHAT_INPUT_MODES.map((m) => m.mode);
        const next = modes[(modes.indexOf(mode) + 1) % modes.length];
        setMode(next);
        return;
      }

      // 引用触发
      if (input === '@') {
        insertRef('patient');
        return;
      }
      if (input === '#') {
        insertRef('order');
        return;
      }
      if (input === '$') {
        insertRef('lab');
        return;
      }

      // 退格
      if (key.backspace || key.delete) {
        setBuffer((b) => b.slice(0, -1));
        return;
      }

      // 普通字符
      if (input && !key.ctrl && !key.meta) {
        setBuffer((b) => b + input);
        return;
      }
    },
    { isActive: !disabled },
  );

  const modeColor = useMemo(() => {
    if (mode === 'order') return theme.permission;
    if (mode === 'ward-round') return theme.fastMode;
    if (mode === 'consultation-md') return theme.merged;
    return theme.assistant;
  }, [mode, theme]);

  const lineCount = buffer.split('\n').length;

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
        flexDirection="column"
        borderStyle="round"
        borderColor={disabled ? theme.border : theme.inputBorder}
        backgroundColor={theme.background}
        paddingX={1}
      >
        {/* 模式行 */}
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Text color={modeColor} bold backgroundColor={theme.panelBackground}>
            {' '}
            {modeInfo.icon} {modeInfo.label}{' '}
          </Text>
          <Text color={theme.inactive}>[{patientName}]</Text>
          <Box flexGrow={1} />
          <Text color={theme.inactive}>@患者 #医嘱 $检验</Text>
        </Box>

        {/* 多行内容 */}
        <Text color={disabled ? theme.inactive : theme.text}>
          {buffer || (
            <Text color={theme.inactive} dimColor>
              {modeInfo.placeholder}
            </Text>
          )}
          {!disabled && <Text color={theme.text}>▌</Text>}
        </Text>
      </Box>

      {/* 底部快捷键提示 */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.inactive}>
          <Text color={theme.suggestion}>[Enter]</Text> 发送
          <Text color={theme.suggestion}> [Shift+Enter]</Text> 换行
          <Text color={theme.suggestion}> [Ctrl+E]</Text> 模式
          <Text color={theme.suggestion}> [↑↓]</Text> 历史
        </Text>
        <Text color={theme.inactive}>
          {buffer.length} 字 · {lineCount} 行
        </Text>
      </Box>
    </Box>
  );
}

export default ChatInput;
