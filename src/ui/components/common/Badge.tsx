/**
 * 健澜科技数智医院智能体 - 状态徽章
 *
 * 通用状态徽章组件，支持预设颜色、文字标签与危急值闪烁效果。
 * 用于患者状态、医嘱状态、检验等级等场景的紧凑标记。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Text } from 'ink';
import React, { useEffect, useState } from 'react';

import type { JianlanTheme } from '../../theme';
import { useThemeColors } from '../../theme';

// ============================================================================
// 预设与纯函数
// ============================================================================

/** 徽章预设类型 */
export type BadgePreset =
  'default' | 'success' | 'warning' | 'danger' | 'critical' | 'info' | 'muted';

/** 徽章预设到主题色键的映射 */
export const BADGE_PRESET_COLORS: Record<
  BadgePreset,
  { fg: keyof JianlanTheme; bg: keyof JianlanTheme | null }
> = {
  default: { fg: 'jianlan', bg: 'panelBackground' },
  success: { fg: 'success', bg: 'panelBackground' },
  warning: { fg: 'warning', bg: 'panelBackground' },
  danger: { fg: 'error', bg: 'panelBackground' },
  critical: { fg: 'criticalValue', bg: 'criticalValueBg' },
  info: { fg: 'alertInfo', bg: 'panelBackground' },
  muted: { fg: 'patientDischarged', bg: 'panelBackground' },
};

/**
 * 解析徽章前景/背景色
 *
 * @param preset - 徽章预设
 * @param theme - 主题对象
 * @returns 前景色与背景色
 */
export function resolveBadgeColors(
  preset: BadgePreset,
  theme: JianlanTheme,
): { fg: string; bg: string | undefined } {
  const entry = BADGE_PRESET_COLORS[preset] ?? BADGE_PRESET_COLORS.default;
  return {
    fg: theme[entry.fg],
    bg: entry.bg ? theme[entry.bg] : undefined,
  };
}

// ============================================================================
// 组件 Props
// ============================================================================

/** Badge 属性 */
export interface BadgeProps {
  /** 徽章文字 */
  label: string;
  /** 颜色预设，默认 default */
  preset?: BadgePreset;
  /** 是否闪烁（危急值场景），默认 false */
  blink?: boolean;
  /** 是否加粗，默认 true */
  bold?: boolean;
  /** 前缀图标（如 🚨） */
  icon?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 状态徽章组件
 *
 * 以带背景色的紧凑矩形展示一个状态标签。critical 预设或 blink=true 时，
 * 危急值以红色背景闪烁提醒。
 *
 * @example
 * ```tsx
 * <Badge label="危急值" preset="critical" blink />
 * <Badge label="稳定" preset="success" />
 * ```
 */
export function Badge({
  label,
  preset = 'default',
  blink = false,
  bold = true,
  icon,
}: BadgeProps): React.ReactElement {
  const theme = useThemeColors();
  const [on, setOn] = useState(true);

  // 闪烁效果
  useEffect(() => {
    if (!blink) return;
    const timer = setInterval(() => setOn((b) => !b), 500);
    return () => clearInterval(timer);
  }, [blink]);

  const { fg, bg } = resolveBadgeColors(preset, theme);
  const background = blink ? (on ? (bg ?? theme.panelBackground) : theme.panelBackground) : bg;

  return (
    <Text color={fg} backgroundColor={background} bold={bold}>
      {` ${icon ? `${icon} ` : ''}${label} `}
    </Text>
  );
}
