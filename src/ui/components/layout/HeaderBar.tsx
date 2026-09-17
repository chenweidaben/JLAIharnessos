/**
 * 健澜科技数智医院智能体 - 顶部标题栏
 *
 * 屏幕顶部品牌标题栏：深海蓝背景，左侧产品标题/副标题，
 * 右侧当前科室/用户/日期状态信息，健澜科技品牌标识。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { useThemeColors } from '../../theme';

// ============================================================================
// 组件 Props
// ============================================================================

/** HeaderBar 属性 */
export interface HeaderBarProps {
  /** 主标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 右侧状态文本（如科室 / 用户 / 日期） */
  rightStatus?: string;
  /** 是否显示健澜科技品牌标识，默认 true */
  showBrand?: boolean;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 顶部标题栏组件
 *
 * 以健澜深海蓝为背景的通栏标题条。左侧为产品名与功能模块名，
 * 右侧为当前上下文状态。深色背景上使用反色文本保证对比度。
 *
 * @example
 * ```tsx
 * <HeaderBar title="门诊问诊" subtitle="AI诊疗工作台" rightStatus="心血管内科 · 陈维" />
 * ```
 */
export function HeaderBar({
  title = '健澜科技数智医院智能体',
  subtitle,
  rightStatus,
  showBrand = true,
}: HeaderBarProps): React.ReactElement {
  const theme = useThemeColors();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      backgroundColor={theme.jianlan}
      paddingX={1}
      paddingY={0}
    >
      {/* 左侧：品牌 + 标题 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        {showBrand && (
          <Text color={theme.jianlanShimmer} bold>
            ◆健澜科技
          </Text>
        )}
        {showBrand && <Text color={theme.panelBackground}>│</Text>}
        <Box flexDirection="column">
          <Text color={theme.inverseText} bold>
            {title}
          </Text>
          {subtitle && <Text color={theme.suggestion}>{subtitle}</Text>}
        </Box>
      </Box>

      {/* 右侧：状态 */}
      {rightStatus && <Text color={theme.inverseText}>{rightStatus}</Text>}
    </Box>
  );
}
