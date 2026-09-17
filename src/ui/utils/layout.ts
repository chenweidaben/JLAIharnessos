/**
 * 健澜科技数智医院智能体 - 布局工具函数
 *
 * 提供终端尺寸检测、响应式布局计算等功能。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 终端尺寸检测
// ============================================================================

/** 终端尺寸信息 */
export interface TerminalSize {
  /** 列数（宽度） */
  columns: number;
  /** 行数（高度） */
  rows: number;
}

/**
 * 获取当前终端尺寸
 * @returns 终端尺寸
 */
export function getTerminalSize(): TerminalSize {
  if (typeof process !== 'undefined' && process.stdout) {
    return {
      columns: process.stdout.columns ?? 80,
      rows: process.stdout.rows ?? 24,
    };
  }
  return { columns: 80, rows: 24 };
}

/**
 * 获取终端宽度
 * @returns 列数
 */
export function getTerminalWidth(): number {
  return getTerminalSize().columns;
}

/**
 * 获取终端高度
 * @returns 行数
 */
export function getTerminalHeight(): number {
  return getTerminalSize().rows;
}

// ============================================================================
// 响应式布局计算
// ============================================================================

/** 布局断点 */
export type LayoutBreakpoint = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * 根据终端宽度获取布局断点
 * @param width - 终端宽度，默认自动检测
 * @returns 布局断点
 */
export function getLayoutBreakpoint(width?: number): LayoutBreakpoint {
  const w = width ?? getTerminalWidth();
  if (w < 80) return 'small';
  if (w < 120) return 'medium';
  if (w < 160) return 'large';
  return 'xlarge';
}

/**
 * 计算面板宽度（占终端宽度的百分比）
 * @param percentage - 百分比 (0-100)
 * @param minWidth - 最小宽度
 * @param maxWidth - 最大宽度
 * @returns 计算后的宽度
 */
export function calcPanelWidth(percentage: number, minWidth = 20, maxWidth?: number): number {
  const terminalWidth = getTerminalWidth();
  let width = Math.floor((terminalWidth * percentage) / 100);
  width = Math.max(width, minWidth);
  if (maxWidth !== undefined) {
    width = Math.min(width, maxWidth);
  }
  return width;
}

/**
 * 计算三栏布局各栏宽度
 * @param leftRatio - 左栏比例
 * @param middleRatio - 中栏比例
 * @param rightRatio - 右栏比例
 * @param gap - 栏间距
 * @returns 各栏宽度
 */
export function calcThreeColumnLayout(
  leftRatio = 25,
  middleRatio = 50,
  rightRatio = 25,
  gap = 0,
): { left: number; middle: number; right: number } {
  const terminalWidth = getTerminalWidth() - gap * 2;
  const total = leftRatio + middleRatio + rightRatio;
  return {
    left: Math.floor((terminalWidth * leftRatio) / total),
    middle: Math.floor((terminalWidth * middleRatio) / total),
    right: Math.floor((terminalWidth * rightRatio) / total),
  };
}

/**
 * 计算两栏布局各栏宽度
 * @param leftRatio - 左栏比例
 * @param rightRatio - 右栏比例
 * @param gap - 栏间距
 * @returns 各栏宽度
 */
export function calcTwoColumnLayout(
  leftRatio = 30,
  rightRatio = 70,
  gap = 0,
): { left: number; right: number } {
  const terminalWidth = getTerminalWidth() - gap;
  const total = leftRatio + rightRatio;
  return {
    left: Math.floor((terminalWidth * leftRatio) / total),
    right: Math.floor((terminalWidth * rightRatio) / total),
  };
}

// ============================================================================
// 内容区域计算
// ============================================================================

/**
 * 计算可用内容区域高度（减去状态栏、输入框等固定区域）
 * @param fixedRows - 固定占用行数
 * @returns 可用内容高度
 */
export function calcContentHeight(fixedRows = 4): number {
  return Math.max(getTerminalHeight() - fixedRows, 5);
}

/**
 * 计算表格列宽
 * @param totalWidth - 总宽度
 * @param columnRatios - 各列比例数组
 * @param gap - 列间距
 * @returns 各列宽度数组
 */
export function calcTableColumnWidths(
  totalWidth: number,
  columnRatios: number[],
  gap = 1,
): number[] {
  const usableWidth = totalWidth - gap * (columnRatios.length - 1);
  const total = columnRatios.reduce((sum, r) => sum + r, 0);
  return columnRatios.map((ratio) => Math.floor((usableWidth * ratio) / total));
}

// ============================================================================
// 文本截断
// ============================================================================

/**
 * 按宽度截断文本（考虑中文字符宽度）
 * @param text - 原始文本
 * @param maxWidth - 最大显示宽度
 * @returns 截断后的文本
 */
export function truncateByWidth(text: string, maxWidth: number): string {
  let width = 0;
  let result = '';
  for (const char of text) {
    const charWidth = isWideChar(char) ? 2 : 1;
    if (width + charWidth > maxWidth - 3) {
      result += '...';
      break;
    }
    result += char;
    width += charWidth;
  }
  return result;
}

/**
 * 判断字符是否为宽字符（中文、日文、韩文等）
 * @param char - 字符
 * @returns 是否为宽字符
 */
export function isWideChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK Radicals etc.
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xfe30 && code <= 0xfe4f) || // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Signs
    (code >= 0x1f300 && code <= 0x1f64f) || // Emoji
    (code >= 0x1f900 && code <= 0x1f9ff) // Supplemental Symbols
  );
}

/**
 * 计算字符串显示宽度
 * @param text - 字符串
 * @returns 显示宽度
 */
export function getStringWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += isWideChar(char) ? 2 : 1;
  }
  return width;
}

/**
 * 用空格填充字符串到指定宽度
 * @param text - 原始文本
 * @param targetWidth - 目标宽度
 * @returns 填充后的字符串
 */
export function padToWidth(text: string, targetWidth: number): string {
  const currentWidth = getStringWidth(text);
  if (currentWidth >= targetWidth) return text;
  return text + ' '.repeat(targetWidth - currentWidth);
}
