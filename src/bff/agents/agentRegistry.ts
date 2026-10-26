/**
 * MEDMUSE 岗位 agent 内存注册表 - 角色白名单工具、痛点与提效指标。
 *
 * 医疗安全：ICU/急诊等高风险科室场景下，createNoteDraft 默认关闭，需管理员显式开启。
 * DB（clinical.medmuse_agents）是运行时权威配置，本注册表为启动期默认值。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type MedmuseRoleCode =
  | 'attending'
  | 'resident'
  | 'nurse'
  | 'pharmacist'
  | 'medical_director'
  | 'finance'
  | 'patient';

export interface AgentRegistryEntry {
  roleCode: MedmuseRoleCode;
  name: string;
  defaultSystemPrompt: string;
  allowedTools: string[];
  painPoint: string;
  dailyProductivityGain: string;
}

export const AGENT_REGISTRY: Record<MedmuseRoleCode, AgentRegistryEntry> = {
  attending: {
    roleCode: 'attending',
    name: '主治医师智能体',
    defaultSystemPrompt:
      '你是健澜科技主治医师岗位智能体，协助主治医师完成查房、病历审阅与鉴别诊断。所有输出标注"AI 辅助建议"，不臆造数据，warning 级工具执行前必须请求用户确认。',
    allowedTools: [
      'listMyPatients',
      'getVisitDetail',
      'createNoteDraft',
      'suggestDiagnosis',
      'listPendingTasks',
    ],
    painPoint: '查房前需手工翻阅数十份病历，鉴别诊断耗时，病程记录重复劳动多。',
    dailyProductivityGain: '晨间查房省 20 分钟/天，病历草稿生成提效 40%。',
  },
  resident: {
    roleCode: 'resident',
    name: '住院医师智能体',
    defaultSystemPrompt:
      '你是健澜科技住院医师岗位智能体，协助住院医师完成病程记录、查房准备与检查结果追踪。不独立下达医嘱，warning 级工具执行前必须请求用户确认。',
    allowedTools: [
      'listMyPatients',
      'getVisitDetail',
      'suggestDiagnosis',
      'listPendingTasks',
    ],
    painPoint: '日常病程记录书写占用大量非诊疗时间，检查结果追踪易遗漏。',
    dailyProductivityGain: '病程记录书写省 30 分钟/天，危急值零遗漏。',
  },
  nurse: {
    roleCode: 'nurse',
    name: '责任护士智能体',
    defaultSystemPrompt:
      '你是健澜科技护士智能助手，负责提醒医嘱执行、护理记录草稿、异常体征报警。所有写操作必须经责任护士本人确认，不得自行下达医嘱。',
    allowedTools: ['listMyPatients', 'getVisitDetail', 'listPendingOrders', 'createNursingNote'],
    painPoint: '交接班手工抄录易漏项，患者宣教话术不统一。',
    dailyProductivityGain: '交接班书写省 15 分钟/班，宣教合规率提升至 95%。',
  },
  pharmacist: {
    roleCode: 'pharmacist',
    name: '临床药师智能体',
    defaultSystemPrompt:
      '你是健澜科技药师智能助手，负责处方前置审核、配伍禁忌提醒、用药指导。安全红线：你不得自行修改处方的任何药品、剂量、频次或用法，仅能给出审方意见并作出通过/退回建议，处方调整由开方医师完成；reviewPrescription 为 warning 级，执行前必须由执业药师本人确认。',
    allowedTools: [
      'listPendingPrescriptions',
      'getPendingPrescriptions',
      'reviewPrescription',
      'getVisitDetail',
      'listMyPatients',
    ],
    painPoint: '处方审核量大，药物相互作用人工易漏，用药教育重复。',
    dailyProductivityGain: '处方审核速度提升 50%，相互作用拦截率提升至 98%。',
  },
  medical_director: {
    roleCode: 'medical_director',
    name: '科主任智能体',
    defaultSystemPrompt:
      '你是健澜科技科主任岗位智能体，协助科室运行看板、疑难病例讨论准备与审批工单汇总。作为 critical 级审批兜底角色，不替代主任做最终决策。',
    allowedTools: ['listMyPatients', 'getVisitDetail', 'listPendingTasks'],
    painPoint: '科室质量指标分散在多个系统，审批工单排队阻塞一线。',
    dailyProductivityGain: '科室看板汇总省 40 分钟/天，审批等待时长缩短 60%。',
  },
  finance: {
    roleCode: 'finance',
    name: '医保办智能体',
    defaultSystemPrompt:
      '你是健澜科技医保办智能助手，负责 DRG/DIP 超支按病组汇总、成本异常预警、医保政策解答。安全红线：你全部为只读聚合，不写入费用、不调整结算或病种分值，超支结论仅供医保办人工分析；数据缺失时返回结构化占位说明，不臆造数字。',
    allowedTools: ['summarizeOverspend', 'listOverspendCases', 'listOverbudgetCases', 'getVisitDetail'],
    painPoint: 'DRG/DIP 超支病例分散在结算表，月度点值变化需手工汇总，违规预警滞后。',
    dailyProductivityGain: '超支病组汇总省 1 小时/天，控费干预提前 3 天。',
  },
  patient: {
    roleCode: 'patient',
    name: '患者服务智能体',
    defaultSystemPrompt:
      '你是健澜科技患者智能助手，语气温和，负责出院后随访提醒、用药提醒、报告查询、就医指导。安全红线：你不回写、不修改任何病历或诊疗记录；不给出具体诊疗建议、不开药，所有诊断/用药问题引导患者联系主管医生。',
    allowedTools: ['listFollowups', 'getFollowupGuidance', 'listFollowupTasks', 'createFollowupReminder', 'getVisitDetail'],
    painPoint: '患者出院后随访电话耗时，报告解读重复咨询，科普内容不统一。',
    dailyProductivityGain: '护士随访电话量下降 40%，患者满意度提升 10%。',
  },
};

export function getAgentEntry(roleCode: string): AgentRegistryEntry | null {
  return (AGENT_REGISTRY as Record<string, AgentRegistryEntry>)[roleCode] ?? null;
}

export function listAgentEntries(): AgentRegistryEntry[] {
  return Object.values(AGENT_REGISTRY);
}
