/**
 * MEDMUSE 工具注册表 - 内置工具元数据、完整 JSON Schema 与骨架执行器。
 *
 * 医疗安全：所有写类工具（createNoteDraft/suggestDiagnosis）均为 warning，必须经
 * Sentinel 二次确认后才允许真正写入；本切片只返回结构化占位结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { ToolDefinition } from './modelProvider';

export type RiskLevel = 'info' | 'warning' | 'critical';

/** 工具执行上下文 */
export interface ToolContext {
  userId: string;
  userRealName?: string;
  sessionId: string;
  patientId?: string | null;
  /** 用户是否已对本次 warning 操作二次确认（Sentinel 校验用） */
  confirmed?: boolean;
}

export interface ToolExecuteResult {
  ok: boolean;
  result: unknown;
  error?: string;
}

export interface ToolMeta {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  openAiSchema: ToolDefinition;
}

/** 5 个内置工具（完整 JSON Schema，与 200-medmuse-core.sql 种子对齐） */
export const MEDMUSE_TOOL_DEFS: ToolMeta[] = [
  {
    name: 'listMyPatients',
    description: '列出当前医生在管的住院患者',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'listMyPatients',
        description: '列出当前医生在管的住院患者',
        parameters: {
          type: 'object',
          properties: {
            department: { type: 'string', description: '科室编码，可空' },
            onlyAbnormal: { type: 'boolean', description: '仅返回生命体征/检验异常者' },
          },
        },
      },
    },
  },
  {
    name: 'getVisitDetail',
    description: '获取某次就诊的完整概要（诊断、用药、检验、护理）',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'getVisitDetail',
        description: '获取某次就诊的完整概要',
        parameters: {
          type: 'object',
          properties: {
            visitId: { type: 'string', description: '就诊ID' },
            includeSections: {
              type: 'array',
              items: { type: 'string', enum: ['notes', 'orders', 'labs', 'imaging'] },
              description: '返回的板块',
            },
          },
          required: ['visitId'],
        },
      },
    },
  },
  {
    name: 'createNoteDraft',
    description: '为指定就诊生成病历草稿（需医生确认后写入）',
    riskLevel: 'warning',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'createNoteDraft',
        description: '为指定就诊生成病历草稿（需医生确认后写入）',
        parameters: {
          type: 'object',
          properties: {
            visitId: { type: 'string', description: '就诊ID' },
            noteType: {
              type: 'string',
              enum: ['admission', 'progress', 'discharge', 'consult'],
              description: '病历类型',
            },
            content: { type: 'string', description: '草稿正文' },
          },
          required: ['visitId', 'noteType'],
        },
      },
    },
  },
  {
    name: 'suggestDiagnosis',
    description: '基于当前就诊信息给出鉴别诊断建议',
    riskLevel: 'warning',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'suggestDiagnosis',
        description: '基于当前就诊信息给出鉴别诊断建议',
        parameters: {
          type: 'object',
          properties: {
            visitId: { type: 'string', description: '就诊ID' },
            topK: { type: 'integer', description: '返回条目数，默认 5', default: 5 },
          },
          required: ['visitId'],
        },
      },
    },
  },
  {
    name: 'listPendingTasks',
    description: '列出当前用户的待办（待查房/待审病历/待处理会诊）',
    riskLevel: 'info',
    openAiSchema: {
      type: 'function',
      function: {
        name: 'listPendingTasks',
        description: '列出当前用户的待办事项',
        parameters: {
          type: 'object',
          properties: {
            taskType: {
              type: 'string',
              enum: ['rounds', 'review', 'consult', 'all'],
              description: '任务类型过滤',
            },
            limit: { type: 'integer', description: '返回上限', default: 20 },
          },
        },
      },
    },
  },
];

export interface ToolExecutor {
  execute(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecuteResult>;
}

function requireUser(ctx: ToolContext): void {
  if (!ctx.userId) throw new Error('UNAUTHORIZED');
}

function placeholder(ctx: ToolContext, label: string): ToolExecuteResult {
  return {
    ok: true,
    result: {
      _placeholder: true,
      tool: label,
      operatorId: ctx.userId,
      sessionId: ctx.sessionId,
      patientId: ctx.patientId ?? null,
      note: 'M89-A 骨架占位结果，未接入业务库；M89-B 接入真实 Repository。',
      items: [],
    },
  };
}

export class DefaultToolExecutor implements ToolExecutor {
  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecuteResult> {
    requireUser(ctx);
    switch (name) {
      case 'listMyPatients':
        // TODO(M89-B): 接入 patientRepo.listMyInpatients({ doctorId, department, onlyAbnormal })
        return placeholder(ctx, 'listMyPatients');
      case 'getVisitDetail':
        // TODO(M89-B): 接入 visitRepo.getDetail({ visitId, includeSections })
        return placeholder(ctx, 'getVisitDetail');
      case 'createNoteDraft':
        // TODO(M89-B): 实际调用前必须经 Sentinel 二次确认
        return placeholder(ctx, 'createNoteDraft');
      case 'suggestDiagnosis':
        // TODO(M89-B): 实际调用前必须经 Sentinel 二次确认
        return placeholder(ctx, 'suggestDiagnosis');
      case 'listPendingTasks':
        // TODO(M89-B): 接入 workbenchRepo.listMyTasks({ userId, taskType, limit })
        return placeholder(ctx, 'listPendingTasks');
      default:
        return { ok: false, result: null, error: `unknown tool: ${name}` };
    }
  }
}

export const defaultToolExecutor: ToolExecutor = new DefaultToolExecutor();

export function getTool(name: string): ToolMeta | undefined {
  return MEDMUSE_TOOL_DEFS.find((t) => t.name === name);
}

export function listTools(riskLevelFilter?: RiskLevel): ToolMeta[] {
  if (!riskLevelFilter) return [...MEDMUSE_TOOL_DEFS];
  return MEDMUSE_TOOL_DEFS.filter((t) => t.riskLevel === riskLevelFilter);
}

export function listOpenAiTools(): ToolDefinition[] {
  return MEDMUSE_TOOL_DEFS.map((t) => t.openAiSchema);
}
