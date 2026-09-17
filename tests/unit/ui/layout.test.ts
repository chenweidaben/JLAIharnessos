/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 布局组件纯函数单元测试
 */

import { describe, test, expect } from 'bun:test'
import { splitTwoColumn } from '@/ui/components/layout/TwoColumnLayout'
import { splitThreeColumn } from '@/ui/components/layout/ThreeColumnLayout'

describe('TwoColumnLayout 纯函数', () => {
  test('splitTwoColumn 按比例分配', () => {
    const { left, right } = splitTwoColumn(100, 30, 70)
    expect(left).toBe(30)
    expect(right).toBe(70)
    expect(left + right).toBe(100)
  })

  test('splitTwoColumn 不等比例', () => {
    const { left, right } = splitTwoColumn(120, 1, 3)
    expect(left).toBe(30)
    expect(right).toBe(90)
  })
})

describe('ThreeColumnLayout 纯函数', () => {
  test('splitThreeColumn 按比例分配且总和等于总宽', () => {
    const r = splitThreeColumn(100, 22, 56, 22)
    expect(r.left + r.middle + r.right).toBe(100)
    expect(r.left).toBe(22)
    expect(r.right).toBe(22)
    expect(r.middle).toBe(56)
  })

  test('splitThreeColumn 非整除时中栏吸收余量', () => {
    const r = splitThreeColumn(99, 1, 1, 1)
    expect(r.left + r.middle + r.right).toBe(99)
  })
})
