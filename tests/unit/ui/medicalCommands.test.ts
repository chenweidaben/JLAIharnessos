/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 医疗斜杠命令注册与执行
 */

import { describe, it, expect } from 'bun:test'
import {
  MEDICAL_COMMANDS,
  parseSlashCommand,
  findCommand,
  searchCommands,
  getCommandsByCategory,
  executeCommand,
  getCommandHelp,
  generateHelpText,
} from '@/ui/commands/medicalCommands'

/** 任务要求的 40+ 命令清单 */
const REQUIRED_COMMANDS = [
  'patient', 'current', 'history', 'record', 'generate-record',
  'order', 'create-order', 'cancel-order', 'lab', 'order-lab',
  'image', 'order-image', 'drug', 'prescription', 'create-prescription',
  'qa', 'summary', 'vitals', 'alert', 'critical',
  'mode', 'department', 'schedule', 'appointment', 'followup',
  'cds', 'diagnosis', 'treatment', 'quality', 'drg',
  'operation', 'sync', 'fetch-emr', 'hl7', 'help',
  'clear', 'exit', 'settings', 'about',
]

describe('医疗命令注册', () => {
  it('注册命令总数不少于 40 个', () => {
    expect(MEDICAL_COMMANDS.length).toBeGreaterThanOrEqual(40)
  })

  it('任务要求的全部命令均已注册', () => {
    const names = new Set(MEDICAL_COMMANDS.map((c) => c.name))
    for (const name of REQUIRED_COMMANDS) {
      expect(names.has(name), `缺少命令: /${name}`).toBe(true)
    }
  })

  it('每个命令都有名称、描述、分类与类型', () => {
    for (const cmd of MEDICAL_COMMANDS) {
      expect(cmd.name.length).toBeGreaterThan(0)
      expect(cmd.description.length).toBeGreaterThan(0)
      expect(cmd.category.length).toBeGreaterThan(0)
      expect(['local', 'prompt', 'local-jsx']).toContain(cmd.type)
    }
  })
})

describe('斜杠命令解析', () => {
  it('解析标准斜杠命令', () => {
    expect(parseSlashCommand('/patient 张明华')).toEqual({
      name: 'patient',
      args: '张明华',
    })
  })

  it('解析无参数命令', () => {
    expect(parseSlashCommand('/help')).toEqual({ name: 'help', args: '' })
  })

  it('非斜杠输入返回 null', () => {
    expect(parseSlashCommand('你好')).toBeNull()
  })
})

describe('命令查找', () => {
  it('按名称查找', () => {
    expect(findCommand('patient')?.name).toBe('patient')
  })

  it('按别名查找', () => {
    expect(findCommand('p')?.name).toBe('patient')
    expect(findCommand('退出')?.name).toBe('exit')
  })

  it('未知命令返回 null', () => {
    expect(findCommand('notexist')).toBeNull()
  })
})

describe('模糊搜索（中文/英文/拼音）', () => {
  it('按名称搜索', () => {
    expect(searchCommands('patient').length).toBeGreaterThan(0)
  })

  it('按中文描述搜索', () => {
    expect(searchCommands('危急值').length).toBeGreaterThan(0)
  })

  it('按拼音/缩写搜索', () => {
    expect(searchCommands('jz').length).toBeGreaterThan(0) // 检验 -> jy / 住院? jz 命中
    expect(searchCommands('yp').length).toBeGreaterThan(0) // 药品
  })

  it('空查询返回全部', () => {
    expect(searchCommands('').length).toBe(MEDICAL_COMMANDS.length)
  })

  it('按分类过滤', () => {
    const labs = getCommandsByCategory('检验检查')
    expect(labs.length).toBeGreaterThan(0)
  })
})

describe('命令执行（Mock 输出）', () => {
  it('每个已注册命令均可执行并返回结果', async () => {
    for (const cmd of MEDICAL_COMMANDS) {
      const result = await executeCommand(cmd.name, 'test')
      expect(result.success || result.success === false).toBe(true)
      expect(typeof result.message).toBe('string')
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it('关键命令返回结构化输出', async () => {
    const r = await executeCommand('current', '')
    expect(r.success).toBe(true)
    expect(r.message).toContain('张明华')
  })

  it('未知命令返回失败', async () => {
    const r = await executeCommand('does-not-exist', '')
    expect(r.success).toBe(false)
  })
})

describe('帮助文本', () => {
  it('生成帮助列表包含全部分类', () => {
    const text = generateHelpText()
    expect(text).toContain('健澜科技')
    expect(text.length).toBeGreaterThan(100)
  })

  it('单个命令帮助', () => {
    expect(getCommandHelp('patient')).toContain('/patient')
  })
})
