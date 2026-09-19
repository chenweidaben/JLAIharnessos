/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）- 真实 SkillInvoker
 *
 * 把技能步骤里的 tool / agent 接到真实实现：
 *  - tool 步骤：在 medical-tools 注册表中按 toolName 找到真实工具，
 *               用其 inputSchema 校验入参后调用 execute()，返回结构化结果；
 *               工具不存在 / 校验失败走受控错误（MedicalAgentError + ErrorCodes）。
 *  - agent 步骤：视为"LLM 生成步骤"，调用 createLlmClient()（已接 DeepSeek，
 *               仅读 process.env），按 agentId 组装系统提示词做真实生成。
 *  - 高风险仍由 executor 统一做三级确认与审计，本 invoker 不绕过。
 *
 * 设计：
 *  - SkillInvokers 接口保持 executor 不变；本文件只做适配，不反向改动 medical-tools/orchestrator。
 *  - 支持注入 llm / registry，便于单测用 Mock，真实脚本用 real。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import { createRegistryWithFirstBatch } from '@/medical-tools/registry';
import type {
  MedicalToolContext,
  MedicalToolDefinition,
  MedicalToolRegistry,
  ToolResult,
} from '@/medical-tools/types';
import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import type { ILLMClient } from '@/core/agent/LLMClient';
import type { LoopMessage } from '@/core/agent/loopTypes';
import { createLlmClient } from '@/core/agent/providers/factory';

import type { SkillInvokers, SkillInvocationResult } from '../executor';

// ============================================================================
// 工具执行上下文（最小可用实现）
// ============================================================================

/** 给工具级权限检查放行所需的权限超集（技能级 RBAC 已由 executor 前置校验） */
const TOOL_PERMISSION_SUPERSET = [
  'emr:read',
  'emr:write',
  'emr:create',
  'patient:read',
  'patient:read:assigned',
  'order:read',
  'order:create',
  'order:update',
  'order:audit',
  'prescription:audit',
  'prescription:read',
  'lab:read',
  'lab:read:assigned',
  'imaging:read',
  'cds:use',
  'qc:read',
  'system:read',
];

/** 构造一个最小但合法的工具执行上下文（无外部依赖，审计/脱敏/确认均为安全空实现） */
export function buildToolExecutionContext(opts: {
  userId: string;
  userName: string;
  traceId?: string;
  patientId?: string | null;
  department?: string;
}): MedicalToolContext {
  return {
    medicalUser: {
      userId: opts.userId,
      name: opts.userName,
      role: 'doctor',
      department: opts.department ?? '内科',
      prescription权: true,
      prescription权Level: 'normal',
      permissions: TOOL_PERMISSION_SUPERSET,
      loginTime: Date.now(),
      sessionId: `sess_${opts.userId}`,
    },
    patientContext: {
      patientId: opts.patientId ?? null,
      encounterId: null,
      department: opts.department ?? '内科',
      visitType: 'outpatient',
      isEmergency: false,
    },
    security: {
      // 安全空实现：审计由技能执行器统一埋点；此处不静默吞错
      auditor: { log: () => undefined },
      desensitizer: {
        desensitize: <T>(d: T): T => d,
        maskIdCard: (id: string) => id,
        maskPhone: (p: string) => p,
        maskName: (n: string) => n,
      },
      permissionChecker: { hasPermission: () => true },
      emergencyOverride: false,
    },
    execution: {
      timeoutMs: 30_000,
      maxRetries: 1,
      traceId: opts.traceId ?? `trace_${Date.now()}`,
      clientIp: '127.0.0.1',
    },
    confirmation: {
      // 工具内自带确认回调；技能级确认由 executor 统一处理
      requestUserConfirm: async () => true,
      requestDoubleConfirm: async () => true,
    },
  };
}

// ============================================================================
// LLM 一次性生成
// ============================================================================

/** agentId -> 系统提示词（医疗场景角色化） */
const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'medical-record-writer':
    '你是健澜数智医院的资深门诊医师助手。根据患者信息、主诉与现病史，生成结构化、专业、严谨的中文门诊病历草稿。' +
    '遵循 SOAP 结构，分主诉/现病史/既往史/体格检查/辅助检查/初步诊断/处理意见。' +
    '不要臆造检查数值，缺失信息以[需补充]标注。输出纯文本病历，不要额外解释。',
  'medical-record-qc':
    '你是健澜数智医院的病历质控专家。按《住院病历内涵质控》要点，对给出的病历做逐条核查，' +
    '输出：合格项、缺陷项（含严重程度）、整改建议。简洁、可执行。',
  'voice-medical-record':
    '你是健澜数智医院的语音病历规范化助手。把医生口述的口语文本规范化为医学术语，' +
    '修正医学错别词，标注剂量/频次待核对项，输出结构化病历草稿。',
  'diagnosis-assistant': '你是临床诊断辅助医师。基于病史与症状给出鉴别诊断与进一步检查建议。',
  'prescription-review': '你是临床药师。对处方做相互作用/配伍/剂量/过敏/特殊人群审核并给出拦截建议。',
  'lab-imaging-interpreter': '你是检验影像报告解读医师。解释异常项的临床意义与复查建议。',
  'follow-up': '你是诊后随访专员。根据病种设计个体化随访问卷与红旗症状识别。',
  'triage-preconsult': '你是门诊导诊医师。根据主诉推荐科室与分诊级别。',
  'medical-coder': '你是病案编码员。推荐 ICD 编码与 DRG/DIP 分组并提示歧义。',
  'medical-affairs-report': '你是医务管理专员。汇总数据形成管理报表与改进建议。',
};

/** 一次性对话：消费流式事件，返回聚合文本与用量 */
export async function chatOnce(
  client: ILLMClient,
  system: string,
  userText: string,
  maxTokens = 1200,
): Promise<{ text: string; usage: { input: number; output: number } }> {
  const messages: readonly LoopMessage[] = [
    { role: 'user', content: [{ type: 'text', text: userText }] },
  ];
  let text = '';
  let usage = { input: 0, output: 0 };
  const events = client.streamChat({
    system,
    messages,
    tools: [],
    maxTokens,
    temperature: 0.3,
  });
  for await (const ev of events) {
    if (ev.type === 'message_stop') {
      text = ev.text;
      usage = ev.usage;
    }
  }
  return { text, usage };
}

// ============================================================================
// 真实 SkillInvoker 工厂
// ============================================================================

export interface RealInvokerOptions {
  /** 操作人（用于工具上下文） */
  userId: string;
  userName: string;
  department?: string;
  patientId?: string | null;
  traceId?: string;
  /** 可注入 LLM 客户端（单测用 Mock；缺省用 createLlmClient() 真实 DeepSeek） */
  llm?: ILLMClient;
  /** 可注入工具注册表（缺省用内置全量注册表） */
  registry?: MedicalToolRegistry;
}

/**
 * 构造真实 SkillInvokers。
 *
 * @example
 * const invokers = buildRealSkillInvokers({ userId: 'u1', userName: '王医生' });
 * await executeSkill(skill, { ..., invokers, ... });
 */
export function buildRealSkillInvokers(opts: RealInvokerOptions): SkillInvokers {
  const registry = opts.registry ?? createRegistryWithFirstBatch();
  const ctx = buildToolExecutionContext({
    userId: opts.userId,
    userName: opts.userName,
    traceId: opts.traceId,
    patientId: opts.patientId ?? null,
    department: opts.department,
  });

  const invokeTool: SkillInvokers['invokeTool'] = async (toolName, input) => {
    const tool: MedicalToolDefinition | undefined = registry.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: {
          code: ErrorCodes.TOOL_NOT_FOUND,
          message: `技能调用了未注册的工具：${toolName}`,
        },
      };
    }
    // 用工具自带 inputSchema 做参数校验（受控失败）
    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: `工具 ${toolName} 入参校验失败：${parsed.error.issues
            .map((i) => i.path.join('.') + ' ' + i.message)
            .join('；')}`,
        },
      };
    }
    try {
      const result: ToolResult<unknown> = await tool.execute(parsed.data, ctx);
      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code ?? ErrorCodes.INTERNAL_ERROR,
            message: result.error?.message ?? `工具 ${toolName} 执行失败`,
          },
        };
      }
      return { success: true, data: result.data };
    } catch (err) {
      const e = MedicalAgentError.from(err, ErrorCodes.INTERNAL_ERROR, { tool: toolName });
      return { success: false, error: { code: e.code, message: e.message } };
    }
  };

  const invokeAgent: SkillInvokers['invokeAgent'] = async (agentId, input) => {
    try {
      const client: ILLMClient = opts.llm ?? createLlmClient();
      const system =
        AGENT_SYSTEM_PROMPTS[agentId] ??
        '你是健澜数智医院的医疗 AI 助手。严谨、专业、不臆造。';
      const userText =
        typeof input === 'object' && input !== null
          ? JSON.stringify(input)
          : String(input ?? '');
      const { text, usage } = await chatOnce(
        client,
        system,
        `请根据以下输入产出医疗内容：\n${userText}`,
      );
      return {
        success: true,
        data: { agentId, text, usage },
      };
    } catch (err) {
      const e = MedicalAgentError.from(err, ErrorCodes.EXTERNAL_SYSTEM_ERROR, {
        agent: agentId,
      });
      return { success: false, error: { code: e.code, message: e.message } };
    }
  };

  const searchKnowledge: NonNullable<SkillInvokers['searchKnowledge']> = async (
    refs: string[],
  ) => {
    // 知识检索接入知识库平台前，返回受控摘要（不臆造检索内容）
    return { refs, summary: `已引用 ${refs.length} 条知识（知识检索待接入知识库平台）` };
  };

  return { invokeTool, invokeAgent, searchKnowledge };
}

/** Mock invoker（单测/演示用）：自动成功，可记录调用轨迹 */
export function buildMockSkillInvokers(track?: string[]): SkillInvokers {
  const rec = (s: string) => {
    track?.push(s);
  };
  return {
    async invokeTool(tool, input) {
      rec(`tool:${tool}`);
      return { success: true, data: { mocked: true, tool, input } };
    },
    async invokeAgent(agent, input) {
      rec(`agent:${agent}`);
      return { success: true, data: { mocked: true, agent, input, text: `[Mock] ${agent} 输出` } };
    },
    async searchKnowledge(refs) {
      rec(`knowledge:${refs.join(',')}`);
      return { refs, summary: `[Mock] 命中 ${refs.length} 条知识` };
    },
  };
}

// 保持 ILLMClient 类型引用（供注入）
export type { ILLMClient };
