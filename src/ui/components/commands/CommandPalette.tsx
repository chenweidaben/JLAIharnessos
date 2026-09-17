/**
 * 健澜科技数智医院智能体 - 增强命令面板
 *
 * 模糊搜索（中文/英文/拼音）、分类展示、最近使用、交互式参数输入、
 * 键盘导航（↑↓选择，Enter执行，Esc关闭），Ctrl+K / Ctrl+P 触发。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';

import {
  COMMAND_CATEGORIES,
  MEDICAL_COMMANDS,
  searchCommands,
} from '../../commands/medicalCommands';
import { useThemeColors } from '../../theme';
import type { MedicalCommand } from '../../types';

// ============================================================================
// 组件 Props
// ============================================================================

/** CommandPalette 属性 */
export interface CommandPaletteProps {
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 执行命令回调（命令 + 已填参数） */
  onExecute?: (command: MedicalCommand, args: string) => void;
  /** 命令列表（默认全部医疗命令） */
  commands?: MedicalCommand[];
  /** 最多展示行数 */
  maxRows?: number;
}

/** 最近使用记录上限 */
const RECENT_LIMIT = 6;

// ============================================================================
// 组件
// ============================================================================

/**
 * 增强命令面板组件
 *
 * 顶部搜索框支持中文/英文/拼音模糊匹配；下方按分类过滤。
 * 选中带 usage 的命令后进入参数输入子模式。最近使用优先展示。
 *
 * @example
 * ```tsx
 * <CommandPalette visible={open} onClose={close} onExecute={run} />
 * ```
 */
export function CommandPalette({
  visible,
  onClose,
  onExecute,
  commands = MEDICAL_COMMANDS,
  maxRows = 12,
}: CommandPaletteProps): React.ReactElement | null {
  const theme = useThemeColors();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [category, setCategory] = useState<string>('全部');
  const [recent, setRecent] = useState<string[]>([]);
  const [awaitingArgs, setAwaitingArgs] = useState<MedicalCommand | null>(null);
  const [argBuffer, setArgBuffer] = useState('');

  // 重置
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      setCategory('全部');
      setAwaitingArgs(null);
      setArgBuffer('');
    }
  }, [visible]);

  // 分类列表
  const categories = useMemo(() => {
    const set = new Set(commands.map((c) => c.category));
    return ['全部', ...Array.from(new Set([...COMMAND_CATEGORIES, ...set]))];
  }, [commands]);

  // 过滤：最近使用 + 分类 + 搜索
  const filtered = useMemo(() => {
    let result = query.trim() ? searchCommands(query) : [...commands];
    if (category !== '全部') {
      result = result.filter((c) => c.category === category);
    }
    // 最近使用置顶
    if (!query.trim() && category === '全部' && recent.length > 0) {
      const recents = recent
        .map((n) => commands.find((c) => c.name === n))
        .filter((c): c is MedicalCommand => !!c);
      const rest = result.filter((c) => !recent.includes(c.name));
      result = [...recents, ...rest];
    }
    return result;
  }, [commands, query, category, recent]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, category, visible]);

  const limited = filtered.slice(0, maxRows);

  function execute(cmd: MedicalCommand): void {
    // 记录最近使用
    setRecent((prev) => [cmd.name, ...prev.filter((n) => n !== cmd.name)].slice(0, RECENT_LIMIT));

    // 需要参数且尚未提供 → 进入参数输入
    if (cmd.usage && /\[.*\]/.test(cmd.usage) && !awaitingArgs) {
      setAwaitingArgs(cmd);
      setArgBuffer('');
      return;
    }
    onExecute?.(cmd, awaitingArgs ? argBuffer.trim() : '');
    onClose();
  }

  // 键盘
  useInput(
    (input, key) => {
      if (!visible) return;

      // 参数输入子模式
      if (awaitingArgs) {
        if (key.escape) {
          setAwaitingArgs(null);
          setArgBuffer('');
          return;
        }
        if (key.return) {
          onExecute?.(awaitingArgs, argBuffer.trim());
          onClose();
          return;
        }
        if (key.backspace || key.delete) {
          setArgBuffer((a) => a.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setArgBuffer((a) => a + input);
          return;
        }
        return;
      }

      if (key.escape) {
        onClose();
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(i + 1, limited.length - 1));
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      // Tab 切换分类
      if (key.tab) {
        const idx = categories.indexOf(category);
        setCategory(categories[(idx + 1) % categories.length] ?? '全部');
        return;
      }
      if (key.return) {
        const cmd = limited[selectedIndex];
        if (cmd) execute(cmd);
        return;
      }
      if (key.backspace || key.delete) {
        setQuery((q) => q.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setQuery((q) => q + input);
      }
    },
    { isActive: visible },
  );

  if (!visible) return null;

  const current = limited[selectedIndex];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.borderFocus}
      backgroundColor={theme.background}
      paddingX={1}
      width={72}
    >
      {/* 标题 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={theme.jianlan} bold>
          ⌘
        </Text>
        <Text color={theme.text} bold>
          命令面板
        </Text>
        <Text color={theme.inactive}>(Ctrl+K / Ctrl+P)</Text>
        <Box flexGrow={1} />
        <Text color={theme.inactive} underline>
          [Esc 关闭]
        </Text>
      </Box>

      {/* 参数输入子模式 */}
      {awaitingArgs ? (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.inputBorder}
          paddingX={1}
          marginTop={0}
        >
          <Text color={theme.jianlan} bold>
            /{awaitingArgs.name}
          </Text>
          <Text color={theme.subtle}>{awaitingArgs.usage}</Text>
          <Text color={theme.text}>
            参数: {argBuffer || <Text color={theme.inactive}>输入参数...</Text>}
            <Text color={theme.text}>▌</Text>
          </Text>
          <Text color={theme.inactive}>Enter=执行 · Esc=返回</Text>
        </Box>
      ) : (
        <React.Fragment>
          {/* 搜索框 */}
          <Box
            flexDirection="row"
            alignItems="center"
            borderStyle="single"
            borderColor={theme.inputBorder}
            paddingX={1}
            marginTop={0}
          >
            <Text color={theme.subtle}>🔍</Text>
            <Box marginLeft={1}>
              <Text color={theme.text}>
                {query || <Text color={theme.inactive}>搜索命令（中文/英文/拼音）...</Text>}
                <Text color={theme.text}>▌</Text>
              </Text>
            </Box>
          </Box>

          {/* 分类 */}
          <Box flexDirection="row" flexWrap="wrap" gap={1}>
            {categories.slice(0, 10).map((cat) => (
              <Text
                key={cat}
                color={category === cat ? theme.tabActive : theme.inactive}
                bold={category === cat}
                underline={category === cat}
              >
                [{cat}]
              </Text>
            ))}
          </Box>

          <Text color={theme.divider}>────────────────────────────────────────────────────</Text>

          {/* 命令列表 */}
          {limited.length === 0 ? (
            <Text color={theme.inactive}>未找到匹配的命令</Text>
          ) : (
            limited.map((cmd, i) => {
              const isRecent = recent.includes(cmd.name);
              return (
                <Box
                  key={cmd.name}
                  flexDirection="row"
                  alignItems="center"
                  backgroundColor={i === selectedIndex ? theme.hoverBackground : undefined}
                  paddingX={0}
                >
                  <Box width={3}>
                    <Text color={i === selectedIndex ? theme.assistant : theme.inactive}>
                      {i === selectedIndex ? '▶' : ''}
                    </Text>
                  </Box>
                  <Box width={16}>
                    <Text color={theme.jianlan} bold>
                      /{cmd.name}
                    </Text>
                  </Box>
                  <Box flexGrow={1}>
                    <Text color={i === selectedIndex ? theme.text : theme.subtle}>
                      {cmd.description}
                    </Text>
                  </Box>
                  {isRecent && <Text color={theme.memory}>★</Text>}
                  <Box width={8}>
                    <Text color={theme.inactive}>{cmd.category}</Text>
                  </Box>
                </Box>
              );
            })
          )}

          {/* 选中命令用法 */}
          {current && (
            <Box marginTop={0}>
              <Text color={theme.suggestion}>
                {current.usage}
                {current.aliases &&
                  current.aliases.length > 0 &&
                  `  别名: ${current.aliases.map((a) => '/' + a).join(' ')}`}
              </Text>
            </Box>
          )}
        </React.Fragment>
      )}

      {/* 底部提示 */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.inactive}>{filtered.length} 个命令</Text>
        <Text color={theme.inactive}>↑↓导航 · Tab分类 · Enter执行 · Esc关闭</Text>
      </Box>
    </Box>
  );
}

export default CommandPalette;
