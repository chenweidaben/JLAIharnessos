/**
 * 健澜科技数智医院智能体 - 流式文本组件
 *
 * AI 回复逐字显示动画，带闪烁光标，支持基本 Markdown 格式
 * （粗体、列表、代码块），可暂停/继续。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Text } from 'ink';
import React, { useEffect, useState } from 'react';

import type { JianlanTheme } from '../../theme';
import { useThemeColors } from '../../theme';

// ============================================================================
// 流式文本 Hook
// ============================================================================

/** useStreamingText 返回值 */
export interface StreamingTextState {
  /** 已显示的文本（逐字增长） */
  displayed: string;
  /** 是否流式输出完成 */
  done: boolean;
  /** 光标是否可见（闪烁） */
  cursorVisible: boolean;
}

/**
 * 逐字流式输出 Hook
 *
 * 通过 setTimeout 模拟 LLM 流式返回，按固定步长逐字显示文本，
 * 光标按固定频率闪烁。paused 时暂停增长与闪烁。
 *
 * @param fullText - 完整目标文本
 * @param speedMs - 每字间隔（毫秒），默认 18ms
 * @param paused - 是否暂停
 * @returns 流式状态
 */
export function useStreamingText(
  fullText: string,
  speedMs = 18,
  paused = false,
): StreamingTextState {
  const [displayed, setDisplayed] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const done = displayed.length >= fullText.length;

  // fullText 变化时重置
  useEffect(() => {
    setDisplayed('');
    setCursorVisible(true);
  }, [fullText]);

  // 逐字增长
  useEffect(() => {
    if (paused || done) return;
    const timer = setTimeout(() => {
      setDisplayed((d) => fullText.slice(0, d.length + 1));
    }, speedMs);
    return () => clearTimeout(timer);
  }, [displayed, fullText, speedMs, paused, done]);

  // 光标闪烁（530ms）
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(timer);
  }, [paused]);

  return { displayed, done, cursorVisible };
}

// ============================================================================
// 轻量 Markdown 渲染（纯函数，注入主题）
// ============================================================================

/**
 * 渲染行内 Markdown：**粗体** 与 `行内代码`
 *
 * @param line - 单行文本
 * @param theme - 主题对象
 * @returns React 节点数组
 */
export function renderInlineMarkdown(line: string, theme: JianlanTheme): React.ReactNode[] {
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <Text key={key++} bold color={theme.text}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else {
      parts.push(
        <Text key={key++} color={theme.suggestion} backgroundColor={theme.panelBackground}>
          {token.slice(1, -1)}
        </Text>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts;
}

/**
 * 将 Markdown 文本渲染为多行 React 节点
 *
 * 支持：代码块（```...```）、无序列表（- / *）、有序列表（1.）、
 * 空行段落分隔。粗体/行内代码通过 renderInlineMarkdown 处理。
 *
 * @param text - Markdown 文本
 * @param theme - 主题对象
 * @returns React 节点数组（每行一个）
 */
export function renderMarkdown(text: string, theme: JianlanTheme): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      nodes.push(
        <Text key={i} color={theme.inactive}>
          {line}
        </Text>,
      );
      continue;
    }

    if (inCodeBlock) {
      nodes.push(
        <Text key={i} color={theme.assistant} backgroundColor={theme.panelBackground}>
          {'  '}
          {line}
        </Text>,
      );
      continue;
    }

    // 无序列表
    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, '');
      nodes.push(
        <Text key={i} color={theme.text}>
          <Text color={theme.assistant}>• </Text>
          {renderInlineMarkdown(content, theme)}
        </Text>,
      );
      continue;
    }

    // 有序列表
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const m = /^(\s*\d+[.)])\s+(.*)$/.exec(line);
      const marker = m?.[1] ?? '';
      const content = m?.[2] ?? '';
      nodes.push(
        <Text key={i} color={theme.text}>
          <Text color={theme.jianlan} bold>
            {marker}{' '}
          </Text>
          {renderInlineMarkdown(content, theme)}
        </Text>,
      );
      continue;
    }

    // 普通段落行
    nodes.push(
      <Text key={i} color={theme.text}>
        {renderInlineMarkdown(line, theme)}
      </Text>,
    );
  }

  return nodes;
}

// ============================================================================
// 组件
// ============================================================================

/** StreamingText 属性 */
export interface StreamingTextProps {
  /** 完整文本（Markdown） */
  text: string;
  /** 每字间隔毫秒 */
  speedMs?: number;
  /** 是否暂停流式与光标 */
  paused?: boolean;
  /** 是否显示闪烁光标 */
  showCursor?: boolean;
  /** 是否在未开始流式时直接显示全文（测试/静态） */
  instant?: boolean;
}

/**
 * 流式文本组件
 *
 * 逐字显示 AI 回复内容，带闪烁光标，支持基本 Markdown。
 * 暂停时光标与增长停止；instant=true 时一次性渲染全文。
 *
 * @example
 * ```tsx
 * <StreamingText text={assistantContent} speedMs={16} />
 * ```
 */
export function StreamingText({
  text,
  speedMs = 18,
  paused = false,
  showCursor = true,
  instant = false,
}: StreamingTextProps): React.ReactElement {
  const theme = useThemeColors();
  const stream = useStreamingText(text, speedMs, paused);
  const { displayed, done, cursorVisible } = stream;

  const renderedText = instant ? text : displayed;

  return (
    <React.Fragment>
      {renderMarkdown(renderedText, theme)}
      {showCursor && !done && !instant && (
        <Text color={cursorVisible ? theme.assistant : theme.inactive}>▌</Text>
      )}
    </React.Fragment>
  );
}

export default StreamingText;
