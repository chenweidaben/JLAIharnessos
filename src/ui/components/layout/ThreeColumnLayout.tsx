/**
 * 健澜科技数智医院智能体 - 三栏布局
 *
 * 左栏（固定）+ 中栏（弹性）+ 右栏（固定）通用容器，
 * 支持栏宽配置、栏显示/隐藏与窄屏响应式堆叠。
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
 * 按比例计算三栏宽度
 * @param total - 总宽度
 * @param leftRatio - 左栏比例
 * @param middleRatio - 中栏比例
 * @param rightRatio - 右栏比例
 * @returns 三栏宽度
 */
export function splitThreeColumn(
  total: number,
  leftRatio: number,
  middleRatio: number,
  rightRatio: number,
): { left: number; middle: number; right: number } {
  const sum = leftRatio + middleRatio + rightRatio;
  const left = Math.floor((total * leftRatio) / sum);
  const right = Math.floor((total * rightRatio) / sum);
  const middle = total - left - right;
  return { left, middle, right };
}

// ============================================================================
// 组件 Props
// ============================================================================

/** ThreeColumnLayout 属性 */
export interface ThreeColumnLayoutProps {
  /** 左栏内容（如患者列表） */
  left: React.ReactNode;
  /** 中栏内容（主工作区，弹性） */
  middle: React.ReactNode;
  /** 右栏内容（如检验/医嘱面板） */
  right: React.ReactNode;
  /** 左栏比例，默认 22 */
  leftRatio?: number;
  /** 中栏比例，默认 56 */
  middleRatio?: number;
  /** 右栏比例，默认 22 */
  rightRatio?: number;
  /** 栏间距，默认 1 */
  gap?: number;
  /** 左栏隐藏 */
  leftHidden?: boolean;
  /** 右栏隐藏 */
  rightHidden?: boolean;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 三栏布局组件
 *
 * 左/右栏按比例固定，中栏弹性填充。窄屏时退化为两栏（左+中），
 * 超窄屏堆叠为纵向。适合查房、门诊、质控等主工作区。
 *
 * @example
 * ```tsx
 * <ThreeColumnLayout left={<List/>} middle={<Main/>} right={<Panel/>} />
 * ```
 */
export function ThreeColumnLayout({
  left,
  middle,
  right,
  leftRatio = 22,
  middleRatio = 56,
  rightRatio = 22,
  gap = 1,
  leftHidden = false,
  rightHidden = false,
}: ThreeColumnLayoutProps): React.ReactElement {
  const breakpoint = getLayoutBreakpoint();

  // 超窄屏：纵向堆叠
  if (breakpoint === 'small') {
    return (
      <Box flexDirection="column" flexGrow={1} gap={gap}>
        {!leftHidden && left}
        {middle}
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
      <Box flexDirection="column" flexGrow={middleRatio} flexShrink={1}>
        {middle}
      </Box>
      {!rightHidden && breakpoint !== 'medium' && (
        <Box flexDirection="column" flexGrow={rightRatio} flexShrink={0}>
          {right}
        </Box>
      )}
    </Box>
  );
}
