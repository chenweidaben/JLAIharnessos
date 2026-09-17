/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 临床警报系统逻辑
 */

import { describe, it, expect } from 'bun:test'
import {
  sortAlertsByPriority,
  ALERT_LEVEL_PRIORITY,
  beep,
} from '@/ui/components/alerts/alertTypes'
import type { ClinicalAlert } from '@/ui/components/alerts/alertTypes'

function makeAlert(overrides: Partial<ClinicalAlert> = {}): ClinicalAlert {
  return {
    id: 'ALR-TEST',
    level: 'warning',
    kind: 'allergy',
    title: '测试警报',
    patient: { name: '测试' },
    createdAt: '10:00:00',
    acknowledged: false,
    snoozed: false,
    ...overrides,
  }
}

describe('警报优先级', () => {
  it('级别权重 critical > warning > info', () => {
    expect(ALERT_LEVEL_PRIORITY.critical).toBeGreaterThan(ALERT_LEVEL_PRIORITY.warning)
    expect(ALERT_LEVEL_PRIORITY.warning).toBeGreaterThan(ALERT_LEVEL_PRIORITY.info)
  })

  it('排序后 critical 始终在最前', () => {
    const list = [
      makeAlert({ id: 'info1', level: 'info', createdAt: '09:00:00' }),
      makeAlert({ id: 'crit1', level: 'critical', createdAt: '09:30:00' }),
      makeAlert({ id: 'warn1', level: 'warning', createdAt: '09:10:00' }),
    ]
    const sorted = sortAlertsByPriority(list)
    expect(sorted[0].id).toBe('crit1')
    expect(sorted[1].id).toBe('warn1')
    expect(sorted[2].id).toBe('info1')
  })

  it('同级按时间倒序（新的在前）', () => {
    const list = [
      makeAlert({ id: 'old', level: 'warning', createdAt: '09:00:00' }),
      makeAlert({ id: 'new', level: 'warning', createdAt: '11:00:00' }),
    ]
    const sorted = sortAlertsByPriority(list)
    expect(sorted[0].id).toBe('new')
  })
})

describe('终端响铃', () => {
  it('beep 不抛异常', () => {
    expect(() => beep()).not.toThrow()
  })
})
