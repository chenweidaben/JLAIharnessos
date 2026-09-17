/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 核心制度质控工具
 * ---------------------------------------------------------------------------
 * 工具名：core_system_check
 * 检查医疗质量安全核心制度执行情况：三级查房、疑难病例讨论、死亡病例讨论、
 * 术前讨论、交接班等。当前为 Mock 实现，返回模拟执行情况。
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// Schema
// ============================================================================

const CoreSystemCheckInput = z.object({
  department: z.string().optional().describe('科室（缺省全部科室）'),
  timeRange: z
    .object({
      from: z.string().describe('起始日期 ISO'),
      to: z.string().describe('结束日期 ISO'),
    })
    .optional()
    .describe('统计时间范围'),
  checkType: z
    .enum(['三级查房', '疑难病例讨论', '死亡病例讨论', '术前讨论', '交接班', '全部'])
    .default('全部')
    .describe('检查的核心制度类型'),
});

const CoreSystemItem = z.object({
  systemName: z.string().describe('核心制度名称'),
  required: z.number().describe('应执行次数'),
  executed: z.number().describe('实际执行次数'),
  complianceRate: z.number().describe('执行率（0~1）'),
  status: z.enum(['达标', '基本达标', '不达标']),
  issues: z.array(z.string()),
});

const CoreSystemCheckOutput = z.object({
  success: z.boolean(),
  department: z.string().nullable(),
  timeRange: z.object({ from: z.string(), to: z.string() }).nullable(),
  items: z.array(CoreSystemItem),
  overallComplianceRate: z.number().describe('总体执行率'),
  summary: z.string(),
  disclaimer: z.string().default('核心制度执行数据为模拟值，实际以质控系统台账为准'),
  checkedAt: z.string(),
});

// ============================================================================
// Mock 数据
// ============================================================================

/** 各核心制度 Mock 执行情况 */
const MOCK_SYSTEM_DATA: readonly {
  systemName: string;
  required: number;
  executed: number;
  issues: string[];
}[] = [
  {
    systemName: '三级查房',
    required: 120,
    executed: 118,
    issues: ['2份运行病历缺少副主任医师以上查房记录'],
  },
  {
    systemName: '疑难病例讨论',
    required: 8,
    executed: 8,
    issues: [],
  },
  {
    systemName: '死亡病例讨论',
    required: 3,
    executed: 2,
    issues: ['1例死亡病例未在规定时间内（死亡后1周内）完成讨论'],
  },
  {
    systemName: '术前讨论',
    required: 15,
    executed: 13,
    issues: ['2例三/四级手术缺少完整术前讨论记录'],
  },
  {
    systemName: '交接班',
    required: 200,
    executed: 196,
    issues: ['4次夜班交接班记录不规范，缺少重点患者交接内容'],
  },
];

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 核心制度质控：根据 checkType 过滤并计算执行率。
 */
async function executeCoreSystemCheck(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = CoreSystemCheckInput.parse(input);

  const scoped =
    parsed.checkType === '全部'
      ? MOCK_SYSTEM_DATA
      : MOCK_SYSTEM_DATA.filter((d) => d.systemName === parsed.checkType);

  const items = scoped.map((d) => {
    const complianceRate = d.required === 0 ? 1 : d.executed / d.required;
    const status = complianceRate >= 0.98 ? '达标' : complianceRate >= 0.9 ? '基本达标' : '不达标';
    return {
      systemName: d.systemName,
      required: d.required,
      executed: d.executed,
      complianceRate: Math.round(complianceRate * 100) / 100,
      status,
      issues: d.issues,
    };
  });

  const totalRequired = items.reduce((s, i) => s + i.required, 0);
  const totalExecuted = items.reduce((s, i) => s + i.executed, 0);
  const overall = totalRequired === 0 ? 1 : totalExecuted / totalRequired;

  const problemItems = items.filter((i) => i.status !== '达标');
  const summary =
    problemItems.length === 0
      ? '各项核心制度执行率均达标。'
      : `共 ${problemItems.length} 项制度需改进：${problemItems.map((i) => i.systemName).join('、')}。`;

  return {
    success: true,
    data: {
      success: true,
      department: parsed.department ?? null,
      timeRange: parsed.timeRange ?? null,
      items,
      overallComplianceRate: Math.round(overall * 100) / 100,
      summary,
      disclaimer: '核心制度执行数据为模拟值，实际以质控系统台账为准',
      checkedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// 导出
// ============================================================================

export const coreSystemCheckTool = buildMedicalTool({
  name: 'core_system_check',
  description:
    '检查医疗质量安全核心制度执行情况：三级查房、疑难病例讨论、死亡病例讨论、术前讨论、交接班等，输出各制度执行率与问题清单。可按科室与时间范围过滤。结果为模拟数据。',
  category: MedicalToolCategory.QC,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: [],
  inputSchema: CoreSystemCheckInput,
  outputSchema: CoreSystemCheckOutput,
  execute: executeCoreSystemCheck,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '核心制度质控',
  getActivityDescription: () => '核心制度执行情况检查',
});

export type CoreSystemCheckInputType = z.infer<typeof CoreSystemCheckInput>;
export type CoreSystemCheckOutputType = z.infer<typeof CoreSystemCheckOutput>;
