/**
 * 健澜科技数智医院智能体 - 通用数据表格
 *
 * 终端文本表格组件：可配置列宽与对齐，支持行选中高亮、
 * 键盘上下导航、左右翻页与分页显示。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text, useInput } from 'ink';
import React, { useCallback, useState } from 'react';

import { useThemeColors } from '../../theme';
import { padToWidth } from '../../utils/layout';

// ============================================================================
// 纯函数
// ============================================================================

/** 列对齐方式 */
export type ColumnAlign = 'left' | 'right' | 'center';

/**
 * 将行下标钳制到合法范围
 * @param index - 原始下标
 * @param rowCount - 总行数
 * @returns 钳制后的下标
 */
export function clampRowIndex(index: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  if (index < 0) return 0;
  if (index >= rowCount) return rowCount - 1;
  return index;
}

/**
 * 计算总页数
 * @param rowCount - 总行数
 * @param pageSize - 每页行数
 * @returns 总页数（至少 1）
 */
export function getPageCount(rowCount: number, pageSize: number): number {
  if (rowCount <= 0) return 1;
  return Math.max(1, Math.ceil(rowCount / pageSize));
}

/**
 * 对行数据分页切片
 * @param rows - 全部行
 * @param page - 当前页码（从 0 开始）
 * @param pageSize - 每页行数
 * @returns 当前页行切片
 */
export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) return rows;
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

// ============================================================================
// 类型
// ============================================================================

/** 列定义 */
export interface TableColumn {
  /** 列键（对应行对象字段） */
  key: string;
  /** 列标题 */
  title: string;
  /** 列显示宽度（字符数） */
  width: number;
  /** 对齐方式，默认 left */
  align?: ColumnAlign;
}

// ============================================================================
// 组件 Props
// ============================================================================

/** DataTable 属性 */
export interface DataTableProps {
  /** 列定义 */
  columns: TableColumn[];
  /** 行数据（每行为键值对象） */
  rows: Record<string, string>[];
  /** 当前选中行下标（受控） */
  selectedIndex?: number;
  /** 默认选中行下标（非受控） */
  defaultSelectedIndex?: number;
  /** 选中行变化回调 */
  onSelect?: (index: number, row: Record<string, string>) => void;
  /** 每页行数，<=0 表示不分页，默认 0 */
  pageSize?: number;
  /** 是否启用键盘导航，默认 false */
  keyboardEnabled?: boolean;
  /** 行键字段名（用于 React key），默认使用行下标 */
  rowKey?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 通用数据表格组件
 *
 * 渲染带表头、分隔线与对齐列的文本表格。键盘方向键上下移动选中行，
 * PageUp/PageDown 翻页。选中行以高亮背景标记。
 *
 * @example
 * ```tsx
 * <DataTable columns={cols} rows={rows} keyboardEnabled pageSize={8} />
 * ```
 */
export function DataTable({
  columns,
  rows,
  selectedIndex,
  defaultSelectedIndex = 0,
  onSelect,
  pageSize = 0,
  keyboardEnabled = false,
  rowKey,
}: DataTableProps): React.ReactElement {
  const theme = useThemeColors();
  const [internalIndex, setInternalIndex] = useState(defaultSelectedIndex);
  const [page, setPage] = useState(0);

  const controlled = selectedIndex !== undefined;
  const current = controlled ? selectedIndex : internalIndex;

  const paged = pageSize > 0;
  const totalPages = paged ? getPageCount(rows.length, pageSize) : 1;
  const pageRows = paged ? paginateRows(rows, page, pageSize) : rows;
  const pageOffset = paged ? page * pageSize : 0;

  /** 解析某行的渲染文本与对齐 */
  function renderCell(value: string, align: ColumnAlign, width: number): string {
    const v = value ?? '';
    if (align === 'right') {
      // 右对齐：左侧补空格
      const w = padToWidth('', Math.max(0, width - stringWidth(v))) + v;
      return w.slice(0, width);
    }
    return padToWidth(v, width).slice(0, width);
  }

  const handleSelect = useCallback(
    (index: number) => {
      const clamped = clampRowIndex(index, rows.length);
      if (!controlled) setInternalIndex(clamped);
      onSelect?.(clamped, rows[clamped]);
    },
    [rows, controlled, onSelect],
  );

  useInput(
    (_input, key) => {
      if (key.upArrow) {
        handleSelect(current - 1);
      } else if (key.downArrow) {
        handleSelect(current + 1);
      } else if (key.pageUp) {
        if (paged) setPage((p) => Math.max(0, p - 1));
        else handleSelect(current - (pageSize || rows.length));
      } else if (key.pageDown) {
        if (paged) setPage((p) => Math.min(totalPages - 1, p + 1));
        else handleSelect(current + (pageSize || rows.length));
      }
    },
    { isActive: keyboardEnabled },
  );

  const header = (
    <Box flexDirection="row">
      {columns.map((col) => (
        <Box key={col.key} width={col.width}>
          <Text color={theme.inactive} bold>
            {renderCell(col.title, col.align ?? 'left', col.width)}
          </Text>
        </Box>
      ))}
    </Box>
  );

  const separator = (
    <Text color={theme.divider}>{columns.map((c) => '─'.repeat(c.width)).join('')}</Text>
  );

  return (
    <Box flexDirection="column">
      {header}
      {separator}
      {pageRows.length === 0 && <Text color={theme.subtle}>（无数据）</Text>}
      {pageRows.map((row, i) => {
        const absoluteIndex = pageOffset + i;
        const isSelected = absoluteIndex === current;
        return (
          <Box
            key={rowKey ? row[rowKey] : absoluteIndex}
            flexDirection="row"
            backgroundColor={isSelected ? theme.hoverBackground : undefined}
          >
            {columns.map((col) => (
              <Box key={col.key} width={col.width}>
                <Text color={isSelected ? theme.text : theme.subtle} bold={isSelected}>
                  {renderCell(row[col.key] ?? '', col.align ?? 'left', col.width)}
                </Text>
              </Box>
            ))}
          </Box>
        );
      })}
      {paged && totalPages > 1 && (
        <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
          <Text color={theme.inactive}>共 {rows.length} 条</Text>
          <Text color={theme.suggestion}>
            第 {page + 1}/{totalPages} 页
          </Text>
        </Box>
      )}
    </Box>
  );
}

/** 字符串宽度（轻量本地实现，避免循环依赖） */
function stringWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ch.codePointAt(0)! > 0x2e00 ? 2 : 1;
  return w;
}
