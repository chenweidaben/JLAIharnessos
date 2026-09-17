/**
 * 健澜科技数智医院智能体 - 两栏布局
 *
 * 通用左右两栏容器，按比例分配宽度，支持栏宽配置与响应式。
 * 标准 Ink flex 布局，不依赖 margin:auto。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box } from 'ink';
import React from 'react';

import { getLayoutBreakpoint } from '../../utils/layout';

// ============================================================================
// 纯函数
// ============================================================================

/**
 * 按比例计算左右栏宽度
 * @param total - 总宽度
 * @param leftRatio - 左栏比例
 * @param rightRatio - 右栏比例
 * @returns 左右栏宽度
 */
export function splitTwoColumn(
  total: number,
  leftRatio: number,
  rightRatio: number,
): { left: number; right: number } {
  const totalRatio = leftRatio + rightRatio;
  const left = Math.floor((total * leftRatio) / totalRatio);
  const right = total - left;
  return { left, right };
}

// ============================================================================
// 组件 Props
// ============================================================================

/** TwoColumnLayout 属性 */
export interface TwoColumnLayoutProps {
  /** 左栏内容 */
  left: React.ReactNode;
  /** 右栏内容 */
  right: React.ReactNode;
  /** 左栏占比，默认 30 */
  leftRatio?: number;
  /** 右栏占比，默认 70 */
  rightRatio?: number;
  /** 栏间距，默认 1 */
  gap?: number;
  /** 左栏是否隐藏 */
  leftHidden?: boolean;
  /** 右栏是否隐藏 */
  rightHidden?: boolean;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 两栏布局组件
 *
 * 横向 flex 容器，左栏按比例固定宽度，右栏弹性填充。
 * 窄屏（<80 列）时自动堆叠为纵向。
 *
 * @example
 * ```tsx
 * <TwoColumnLayout left={<Sidebar/>} right={<Main/>} leftRatio={30} rightRatio={70} />
 * ```
 */
export function TwoColumnLayout({
  left,
  right,
  leftRatio = 30,
  rightRatio = 70,
  gap = 1,
  leftHidden = false,
  rightHidden = false,
}: TwoColumnLayoutProps): React.ReactElement {
  const narrow = getLayoutBreakpoint() === 'small';

  if (narrow) {
    return (
      <Box flexDirection="column" flexGrow={1} gap={gap}>
        {!leftHidden && left}
        {!rightHidden && right}
      </Box>
    );
  }

  return (
    <Box flexDirection="row" flexGrow={1} gap={gap}>
      {!leftHidden && (
        <Box flexDirection="column" flexGrow={leftRatio} flexShrink={0}>
          {left}
        </Box>
      )}
      {!rightHidden && (
        <Box flexDirection="column" flexGrow={rightRatio} flexShrink={0}>
          {right}
        </Box>
      )}
    </Box>
  );
}
