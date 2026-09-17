/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { BuiltMedicalTool, MedicalUser, UserRole } from '@/types';

import type { LoopToolDefinition } from './loopTypes';

/**
 * 当前任务类型
 */
export type MedicalTaskType =
  | 'outpatient_consultation' // 门诊问诊
  | 'ward_round' // 查房
  | 'consultation' // 会诊
  | 'quality_control' // 病历质控
  | 'teaching' // 教学培训
  | 'general'; // 通用

/**
 * SystemPromptBuilder 输入
 */
export interface SystemPromptInput {
  /** 当前操作用户 */
  user: MedicalUser;
  /** 当前科室编码（如 cardiology） */
  department?: string;
  /** 当前任务类型 */
  taskType?: MedicalTaskType;
  /** 可用工具列表（自动生成工具使用说明） */
  tools?: readonly BuiltMedicalTool[];
  /** 额外补充说明（追加在最后） */
  extraInstructions?: string;
}

/** 角色设定文本映射 */
const ROLE_PROMPTS: Readonly<Record<UserRole, string>> = {
  doctor: '你正在协助具备执业资格的临床医生进行诊疗工作。',
  nurse: '你正在协助临床护理人员进行护理记录与医嘱核对工作。',
  pharmacist: '你正在协助药师进行处方审核与用药指导工作。',
  coder: '你正在协助病案编码员进行病历质量与编码工作。',
  admin: '你正在协助医院管理人员进行运营与质控管理工作。',
  researcher: '你正在协助科研人员进行临床数据检索与统计分析。',
  student: '你正在协助规培学员与实习生进行医学学习与训练。',
  patient: '你正在为患者提供就医导诊与健康科普服务，不得给出具体诊断。',
};

/** 任务提示词映射 */
const TASK_PROMPTS: Readonly<Record<MedicalTaskType, string>> = {
  outpatient_consultation:
    '当前任务为门诊问诊：围绕主诉、现病史、查体与初步诊断，辅助医生快速形成诊疗思路。',
  ward_round: '当前任务为查房：关注病情变化、检验检查趋势、医嘱执行与治疗计划调整。',
  consultation: '当前任务为多学科会诊：综合各专科视角，客观陈述病情与建议，避免越权主导诊疗。',
  quality_control:
    '当前任务为病历质控：依据病历书写规范，客观指出缺陷并给出修改建议，不直接修改病历内容。',
  teaching:
    '当前任务为教学培训：用通俗准确的方式讲解诊疗要点，引用指南时标注来源，鼓励学员独立思考。',
  general: '请结合当前上下文，专业、简洁地完成用户提出的医疗辅助任务。',
};

/**
 * 医疗系统提示词构建器
 *
 * 按四层结构拼装系统提示词：
 * 1. 医疗伦理层（最高优先级，不可替代医生、建议需人工确认、紧急情况提醒就医）；
 * 2. 角色设定层（按用户角色：医生/护士/药师等）；
 * 3. 科室专业层（按当前科室注入专科关注点）；
 * 4. 当前任务层（问诊/查房/质控等）+ 工具使用说明。
 *
 * 工具使用说明自动从工具注册中心生成，确保提示词与实际可用工具一致。
 */
export class SystemPromptBuilder {
  /** 医疗伦理层（恒定不变，最高优先级） */
  private static readonly ETHICS_LAYER = `【医疗伦理与安全约束】
你是健澜科技数智医院智能体，定位为医疗辅助决策工具，而非独立诊疗者。
- 你给出的任何诊断、用药、剂量建议均为辅助参考，最终诊疗决策必须由具备执业资格的医护人员确认并负责；
- 不得声称可独立替代医生做出诊断或开具处方；涉及处方、医嘱、用药调整时，必须显式提示"需由执业医师审核确认"；
- 当患者出现胸痛、呼吸困难、意识障碍、大出血、疑似卒中/心梗等危急情况时，必须第一时间提示立即就医或呼叫急救；
- 涉及患者隐私信息时严格最小必要原则，不得输出与当前任务无关的个人敏感信息；
- 引用指南、药品说明书、检验参考范围时，应提示以最新版权威来源为准；
- 无法确认的信息不要臆测，应说明不确定性并建议核实。`;

  /**
   * 构建完整系统提示词
   *
   * @param input - 构建输入
   * @returns 分层拼接后的系统提示词
   */
  public build(input: SystemPromptInput): string {
    const layers: string[] = [SystemPromptBuilder.ETHICS_LAYER];

    // 角色设定层
    layers.push(this.buildRoleLayer(input.user));

    // 科室专业层
    if (input.department) {
      layers.push(this.buildDepartmentLayer(input.department));
    }

    // 当前任务层
    layers.push(this.buildTaskLayer(input.taskType ?? 'general'));

    // 工具使用说明
    if (input.tools && input.tools.length > 0) {
      layers.push(this.buildToolLayer(input.tools));
    }

    // 额外交代
    if (input.extraInstructions) {
      layers.push(`【补充说明】\n${input.extraInstructions}`);
    }

    return layers.join('\n\n');
  }

  /**
   * 构建可直接下发给 LLM 的工具定义列表
   *
   * 将 BuiltMedicalTool 转换为 Provider 无关的工具 schema。
   *
   * @param tools - 已注册工具列表
   * @returns 工具定义列表
   */
  public buildToolDefinitions(tools: readonly BuiltMedicalTool[]): LoopToolDefinition[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: this.buildToolDescription(tool),
      inputSchema: this.extractInputSchema(tool),
    }));
  }

  /**
   * 角色设定层
   */
  private buildRoleLayer(user: MedicalUser): string {
    const roleText =
      ROLE_PROMPTS[user.role] ?? '请结合当前上下文，专业、简洁地完成用户提出的医疗辅助任务。';
    return `【角色设定】\n当前操作用户：${user.name}，角色：${user.role}，科室：${user.department}。${roleText}`;
  }

  /**
   * 科室专业层
   */
  private buildDepartmentLayer(department: string): string {
    return `【科室专业提示】\n当前科室：${department}。请聚焦该专科常见疾病谱、诊疗路径与用药习惯，结合专科指南给出建议。`;
  }

  /**
   * 当前任务层
   */
  private buildTaskLayer(taskType: MedicalTaskType): string {
    return `【当前任务】\n${TASK_PROMPTS[taskType]}`;
  }

  /**
   * 工具使用说明层
   */
  private buildToolLayer(tools: readonly BuiltMedicalTool[]): string {
    const lines = tools.map((tool) => {
      const risk =
        tool.riskLevel === 'high'
          ? '【高风险，需人工确认】'
          : tool.riskLevel === 'medium'
            ? '【中风险】'
            : '';
      return `- ${tool.name}${risk}：${tool.description}`;
    });
    return [
      '【可用工具】',
      '你可在需要时调用以下工具获取或操作医疗数据。调用工具前先判断是否确有必要；高风险工具调用后必须等待人工确认。',
      ...lines,
    ].join('\n');
  }

  /**
   * 构建工具描述（附加风险提示）
   */
  private buildToolDescription(tool: BuiltMedicalTool): string {
    const riskHint =
      tool.riskLevel === 'high'
        ? '（高风险操作，需人工确认后方可执行）'
        : tool.riskLevel === 'medium'
          ? '（中风险操作）'
          : '';
    return `${tool.description}${riskHint}`;
  }

  /**
   * 从 Zod schema 提取 JSON Schema（降级为通用 object schema）
   */
  private extractInputSchema(tool: BuiltMedicalTool): Record<string, unknown> {
    // Zod 版本差异下稳定导出为 JSON Schema 的路径不统一，
    // 这里使用宽松的 object schema，由工具执行期的 validateToolInput 严格校验。
    void tool;
    return {
      type: 'object',
      properties: {},
      additionalProperties: true,
    };
  }
}
