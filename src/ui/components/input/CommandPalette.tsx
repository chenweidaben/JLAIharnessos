/**
 * 健澜科技数智医院智能体 - 命令面板
 *
 * 医疗命令快速执行（/patient, /order, /lab, /record等），
 * 模糊搜索，分类展示，快捷键触发（Ctrl+K / Ctrl+P）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';

import { useThemeColors } from '../../theme';
import type { MedicalCommand } from '../../types';

// ============================================================================
// 内置命令列表
// ============================================================================

/** 内置医疗命令 */
export const BUILTIN_COMMANDS: MedicalCommand[] = [
  // 患者管理
  {
    name: 'patient',
    description: '查询/切换患者',
    aliases: ['p'],
    type: 'local-jsx',
    category: '患者管理',
    usage: '/patient [姓名/住院号]',
  },
  {
    name: 'current',
    description: '显示当前患者信息',
    aliases: ['cur'],
    type: 'local',
    category: '患者管理',
    usage: '/current',
  },
  {
    name: 'summary',
    description: '生成患者摘要',
    aliases: ['sum'],
    type: 'prompt',
    category: '患者管理',
    usage: '/summary',
  },

  // 病历
  {
    name: 'record',
    description: '生成/查看病历',
    aliases: ['r'],
    type: 'local-jsx',
    category: '病历',
    usage: '/record [类型]',
  },
  { name: 'qa', description: '病历质控检查', type: 'prompt', category: '病历', usage: '/qa' },

  // 医嘱
  {
    name: 'order',
    description: '开医嘱/查看医嘱',
    aliases: ['o'],
    type: 'local-jsx',
    category: '医嘱',
    usage: '/order [内容]',
  },
  {
    name: 'vitals',
    description: '查看/录入生命体征',
    aliases: ['v'],
    type: 'local',
    category: '医嘱',
    usage: '/vitals',
  },

  // 检验检查
  {
    name: 'lab',
    description: '查检验/开检验',
    aliases: ['l'],
    type: 'prompt',
    category: '检验检查',
    usage: '/lab [项目]',
  },
  {
    name: 'imaging',
    description: '查影像/AI分析',
    aliases: ['img'],
    type: 'local-jsx',
    category: '检验检查',
    usage: '/imaging [检查类型]',
  },

  // 用药
  {
    name: 'drug',
    description: '查药品/相互作用',
    aliases: ['d'],
    type: 'prompt',
    category: '用药',
    usage: '/drug [药品名]',
  },

  // 警报
  {
    name: 'alert',
    description: '查看/处理警报',
    aliases: ['a'],
    type: 'local',
    category: '警报',
    usage: '/alert',
  },

  // 模式切换
  {
    name: 'mode',
    description: '切换工作模式',
    aliases: ['m'],
    type: 'local',
    category: '系统',
    usage: '/mode [门诊/查房/会诊]',
  },

  // 系统
  {
    name: 'help',
    description: '显示帮助',
    aliases: ['h', '?'],
    type: 'local-jsx',
    category: '系统',
    usage: '/help',
  },
  { name: 'clear', description: '清空对话', type: 'local', category: '系统', usage: '/clear' },
  { name: 'theme', description: '切换主题', type: 'local-jsx', category: '系统', usage: '/theme' },
  {
    name: 'settings',
    description: '系统设置',
    type: 'local-jsx',
    category: '系统',
    usage: '/settings',
  },
  {
    name: 'exit',
    description: '退出程序',
    aliases: ['quit', 'q'],
    type: 'local',
    category: '系统',
    usage: '/exit',
  },
];

// ============================================================================
// 组件 Props
// ============================================================================

/** CommandPalette 属性 */
export interface CommandPaletteProps {
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 命令选择回调 */
  onSelect?: (command: MedicalCommand) => void;
  /** 自定义命令列表 */
  commands?: MedicalCommand[];
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 命令面板组件
 *
 * 提供医疗命令的快速搜索和执行入口，支持模糊搜索、分类浏览，
 * 通过Ctrl+K或Ctrl+P触发。
 *
 * @example
 * ```tsx
 * <CommandPalette visible={showPalette} onClose={() => setShowPalette(false)} />
 * ```
 */
export function CommandPalette({
  visible,
  onClose,
  onSelect,
  commands = BUILTIN_COMMANDS,
}: CommandPaletteProps): React.ReactElement | null {
  const theme = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  // 获取所有分类
  const categories = useMemo(() => {
    const cats = new Set(commands.map((c) => c.category));
    return ['全部', ...Array.from(cats)];
  }, [commands]);

  // 过滤命令
  const filteredCommands = useMemo(() => {
    let result = commands;
    if (selectedCategory !== '全部') {
      result = result.filter((c) => c.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace(/^\//, '');
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [commands, searchQuery, selectedCategory]);

  // 重置选择
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedCategory, visible]);

  // 键盘输入
  useInput(
    (input, key) => {
      if (!visible) return;

      if (key.escape) {
        onClose();
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (key.return) {
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          onSelect?.(cmd);
          onClose();
        }
        return;
      }

      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((q) => q + input);
        return;
      }
    },
    { isActive: visible },
  );

  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.borderFocus}
      backgroundColor={theme.background}
      paddingX={1}
      paddingY={0}
      width={60}
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
        <Box>
          <Text color={theme.inactive} underline>
            [Esc 关闭]
          </Text>
        </Box>
      </Box>

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
            {searchQuery || <Text color={theme.inactive}>搜索命令...</Text>}
            <Text color={theme.text}>▌</Text>
          </Text>
        </Box>
      </Box>

      {/* 分类标签 */}
      <Box flexDirection="row" flexWrap="wrap" gap={1} marginTop={0}>
        {categories.map((cat) => (
          <Box key={cat}>
            <Text
              color={selectedCategory === cat ? theme.tabActive : theme.inactive}
              bold={selectedCategory === cat}
              underline={selectedCategory === cat}
            >
              [{cat}]
            </Text>
          </Box>
        ))}
      </Box>

      {/* 分隔线 */}
      <Box marginTop={0}>
        <Text color={theme.divider}>──────────────────────────────────────────────────</Text>
      </Box>

      {/* 命令列表 */}
      <Box flexDirection="column" marginTop={0}>
        {filteredCommands.length === 0 ? (
          <Text color={theme.inactive}>未找到匹配的命令</Text>
        ) : (
          filteredCommands.slice(0, 12).map((cmd, i) => (
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
              <Box width={14}>
                <Text color={theme.jianlan} bold>
                  /{cmd.name}
                </Text>
              </Box>
              <Box flexGrow={1}>
                <Text color={i === selectedIndex ? theme.text : theme.subtle}>
                  {cmd.description}
                </Text>
              </Box>
              <Box width={8}>
                <Text color={theme.inactive}>{cmd.category}</Text>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* 底部提示 */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Text color={theme.inactive}>{filteredCommands.length} 个命令</Text>
        <Text color={theme.inactive}>↑↓导航 · Enter执行 · Esc关闭</Text>
      </Box>
    </Box>
  );
}
