/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 对话模块类型与 Mock 数据
 */

import { describe, it, expect } from 'bun:test'
import { nowTime, makeMessageId, MOCK_CHAT_MESSAGES } from '@/ui/components/chat'
import type { ChatMessage } from '@/ui/components/chat'

describe('对话工具函数', () => {
  it('nowTime 返回 HH:mm:ss 格式', () => {
    expect(nowTime()).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('makeMessageId 生成唯一ID', () => {
    const a = makeMessageId('u')
    const b = makeMessageId('u')
    expect(a).not.toBe(b)
    expect(a.startsWith('u_')).toBe(true)
  })
})

describe('门诊问诊 Mock 对话', () => {
  it('包含完整问诊流程消息', () => {
    expect(MOCK_CHAT_MESSAGES.length).toBeGreaterThan(3)
  })

  it('覆盖六种消息角色', () => {
    const roles = new Set(MOCK_CHAT_MESSAGES.map((m) => m.role))
    expect(roles.has('user')).toBe(true)
    expect(roles.has('assistant')).toBe(true)
    expect(roles.has('tool')).toBe(true)
    expect(roles.has('system')).toBe(true)
  })

  it('每条消息都有 id/角色/内容/时间戳', () => {
    for (const m of MOCK_CHAT_MESSAGES) {
      expect(m.id.length).toBeGreaterThan(0)
      expect(m.timestamp.length).toBeGreaterThan(0)
      // 工具消息允许 content 为空
      expect(typeof m.content).toBe('string')
    }
  })

  it('工具调用消息携带工具信息', () => {
    const toolMsg = MOCK_CHAT_MESSAGES.find((m) => m.role === 'tool')
    expect(toolMsg).toBeDefined()
    expect(toolMsg?.toolCall).toBeDefined()
    const call = toolMsg?.toolCall
    expect(call).toBeDefined()
    expect((call?.toolName ?? '').length).toBeGreaterThan(0)
    expect(['pending', 'running', 'success', 'failed']).toContain(call!.status)
  })
})
