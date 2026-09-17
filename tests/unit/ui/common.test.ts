/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 通用 UI 组件纯函数单元测试
 */

import { describe, test, expect } from 'bun:test'

import { nextTabIndex, parseDigitTab } from '@/ui/components/common/TabView'
import { clampRowIndex, getPageCount, paginateRows } from '@/ui/components/common/DataTable'
import {
  clampPercent,
  buildProgressCells,
  resolveProgressStatus,
} from '@/ui/components/common/ProgressBar'
import {
  scalePoint,
  computeRange,
  buildTrendChart,
} from '@/ui/components/common/TrendChart'
import { resolveBadgeColors, BADGE_PRESET_COLORS } from '@/ui/components/common/Badge'
import { jianlanDarkTheme } from '@/ui/theme'

describe('TabView 纯函数', () => {
  test('nextTabIndex 循环切换', () => {
    expect(nextTabIndex(0, 6, 1)).toBe(1)
    expect(nextTabIndex(5, 6, 1)).toBe(0)
    expect(nextTabIndex(0, 6, -1)).toBe(5)
    expect(nextTabIndex(2, 6, -1)).toBe(1)
  })

  test('nextTabIndex 越界输入归一', () => {
    expect(nextTabIndex(-3, 4, 1)).toBe(2)
  })

  test('parseDigitTab 数字键直达', () => {
    expect(parseDigitTab('1', 6)).toBe(0)
    expect(parseDigitTab('6', 6)).toBe(5)
    expect(parseDigitTab('9', 6)).toBeNull()
    expect(parseDigitTab('a', 6)).toBeNull()
    expect(parseDigitTab('0', 6)).toBeNull()
  })
})

describe('DataTable 纯函数', () => {
  test('clampRowIndex 边界钳制', () => {
    expect(clampRowIndex(-1, 10)).toBe(0)
    expect(clampRowIndex(20, 10)).toBe(9)
    expect(clampRowIndex(3, 10)).toBe(3)
    expect(clampRowIndex(0, 0)).toBe(0)
  })

  test('getPageCount 分页计算', () => {
    expect(getPageCount(0, 8)).toBe(1)
    expect(getPageCount(10, 8)).toBe(2)
    expect(getPageCount(16, 8)).toBe(2)
    expect(getPageCount(17, 8)).toBe(3)
  })

  test('paginateRows 切片', () => {
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(paginateRows(rows, 0, 4)).toEqual([1, 2, 3, 4])
    expect(paginateRows(rows, 2, 4)).toEqual([9, 10])
    expect(paginateRows(rows, 0, 0)).toEqual(rows)
  })
})

describe('ProgressBar 纯函数', () => {
  test('clampPercent 钳制', () => {
    expect(clampPercent(50)).toBe(50)
    expect(clampPercent(150)).toBe(100)
    expect(clampPercent(-10)).toBe(0)
    expect(clampPercent(Number.NaN)).toBe(0)
  })

  test('buildProgressCells 格数', () => {
    const { filled, empty } = buildProgressCells(50, 20)
    expect(filled).toBe(10)
    expect(empty).toBe(10)
  })

  test('resolveProgressStatus 阈值', () => {
    expect(resolveProgressStatus(50)).toBe('normal')
    expect(resolveProgressStatus(85)).toBe('warning')
    expect(resolveProgressStatus(99)).toBe('danger')
  })
})

describe('TrendChart 纯函数', () => {
  test('scalePoint 映射到行', () => {
    expect(scalePoint(0, 0, 100, 6)).toBe(5)
    expect(scalePoint(100, 0, 100, 6)).toBe(0)
    expect(scalePoint(50, 0, 100, 6)).toBe(3)
  })

  test('computeRange 含留白', () => {
    const { min, max } = computeRange([{ label: 'a', points: [0, 10] }])
    expect(min).toBeLessThan(0)
    expect(max).toBeGreaterThan(10)
  })

  test('buildTrendChart 行数与宽度', () => {
    const chart = buildTrendChart([{ label: 'a', points: [1, 2, 3, 4, 5] }], 6, [4])
    expect(chart.lines.length).toBe(6)
    expect(chart.width).toBe(5)
  })
})

describe('Badge 纯函数', () => {
  test('resolveBadgeColors 预设映射到主题色', () => {
    const { fg, bg } = resolveBadgeColors('critical', jianlanDarkTheme)
    expect(fg).toBe(jianlanDarkTheme.criticalValue)
    expect(bg).toBe(jianlanDarkTheme.criticalValueBg)
    const def = resolveBadgeColors('muted', jianlanDarkTheme)
    expect(def.fg).toBe(jianlanDarkTheme.patientDischarged)
  })

  test('BADGE_PRESET_COLORS 覆盖全部预设', () => {
    for (const preset of ['default', 'success', 'warning', 'danger', 'critical', 'info', 'muted']) {
      expect(BADGE_PRESET_COLORS[preset as keyof typeof BADGE_PRESET_COLORS]).toBeDefined()
    }
  })
})
