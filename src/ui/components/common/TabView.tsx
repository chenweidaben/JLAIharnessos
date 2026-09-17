/**
 * 健澜科技数智医院智能体 - 通用 Tab 视图
 *
 * 通用标签页切换容器，支持键盘左右箭头切换、数字键 1-9 直达，
 * 活跃标签高亮。Tab 内容由调用方通过 children 或 render 函数提供。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useCallback, useState } from 'react';

import { useThemeColors } from '../../theme';

// ============================================================================
// 纯函数
// ============================================================================

/**
 * 计算下一个标签下标（循环）
 * @param current - 当前下标
 * @param length - 标签总数
 * @param delta - 偏移量（+1 右，-1 左）
 * @returns 新下标
 */
export function nextTabIndex(current: number, length: number, delta: number): number {
  if (length <= 0) return 0;
  const mod = ((current % length) + length) % length;
  return (mod + delta + length) % length;
}

/**
 * 从键盘输入字符解析数字键直达的标签下标
 * @param input - 键盘输入字符
 * @param length - 标签总数
 * @returns 下标（从 0 开始），若不是有效数字键返回 null
 */
export function parseDigitTab(input: string, length: number): number | null {
  if (!/^[1-9]$/.test(input)) return null;
  const idx = Number(input) - 1;
  return idx >= 0 && idx < length ? idx : null;
}

// ============================================================================
// 类型
// ============================================================================

/** 单个 Tab 定义 */
export interface TabItem {
  /** 唯一标识 */
  id: string;
  /** 标题 */
  label: string;
  /** 角标（如数量） */
  badge?: string;
}

// ============================================================================
// 组件 Props
// ============================================================================

/** TabView 属性 */
export interface TabViewProps {
  /** 标签列表 */
  tabs: TabItem[];
  /** 当前激活标签 id（受控） */
  activeId?: string;
  /** 默认激活标签 id（非受控） */
  defaultActiveId?: string;
  /** 切换回调 */
  onChange?: (tabId: string, index: number) => void;
  /** 标签栏下方内容 */
  children?: React.ReactNode;
  /** 是否启用键盘交互，默认 true */
  keyboardEnabled?: boolean;
  /** 是否显示数字快捷键提示，默认 true */
  showHotkeys?: boolean;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 通用 Tab 视图组件
 *
 * 渲染一行可切换的标签。左右箭头循环切换，数字键 1-9 直达对应标签。
 * 标签内容（children）由调用方控制，本组件只负责标签头与交互。
 *
 * @example
 * ```tsx
 * <TabView tabs={tabs} activeId={active} onChange={setActive}>
 *   {active === 'lab' ? <LabPanel/> : <OrderPanel/>}
 * </TabView>
 * ```
 */
export function TabView({
  tabs,
  activeId,
  defaultActiveId,
  onChange,
  children,
  keyboardEnabled = true,
  showHotkeys = true,
}: TabViewProps): React.ReactElement {
  const theme = useThemeColors();

  const [internalId, setInternalId] = useState(defaultActiveId ?? tabs[0]?.id ?? '');
  const controlled = activeId !== undefined;
  const currentId = controlled ? activeId : internalId;
  const currentIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === currentId),
  );

  const activate = useCallback(
    (index: number) => {
      const clamped = ((index % tabs.length) + tabs.length) % tabs.length;
      const tab = tabs[clamped];
      if (!tab) return;
      if (!controlled) setInternalId(tab.id);
      onChange?.(tab.id, clamped);
    },
    [tabs, controlled, onChange],
  );

  // 键盘交互
  useInput(
    (input, key) => {
      if (key.leftArrow) {
        activate(nextTabIndex(currentIndex, tabs.length, -1));
      } else if (key.rightArrow) {
        activate(nextTabIndex(currentIndex, tabs.length, 1));
      } else {
        const idx = parseDigitTab(input, tabs.length);
        if (idx !== null) activate(idx);
      }
    },
    { isActive: keyboardEnabled && tabs.length > 0 },
  );

  return (
    <Box flexDirection="column">
      {/* 标签栏 */}
      <Box flexDirection="row" gap={1}>
        <Text color={theme.divider}> </Text>
        {tabs.map((tab, i) => {
          const active = tab.id === currentId;
          const title = showHotkeys ? `${i + 1}.${tab.label}` : tab.label;
          return (
            <Box key={tab.id}>
              <Text
                color={active ? theme.tabActive : theme.tabInactive}
                bold={active}
                underline={active}
                backgroundColor={active ? theme.selectionBg : undefined}
              >
                {` ${title}${tab.badge ? `(${tab.badge})` : ''} `}
              </Text>
            </Box>
          );
        })}
      </Box>
      {/* 内容区 */}
      {children}
    </Box>
  );
}
