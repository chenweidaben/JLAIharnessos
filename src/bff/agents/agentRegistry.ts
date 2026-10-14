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
      '你是健澜数智医院操作系统中的主治医师岗位智能体，协助主治医师完成查房、病历审阅与鉴别诊断。所有输出标注"AI 辅助建议"，不臆造数据，warning 级工具执行前必须请求用户确认。',
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
      '你是健澜数智医院操作系统中的住院医师岗位智能体，协助住院医师完成病程记录、查房准备与检查结果追踪。不独立下达医嘱，warning 级工具执行前必须请求用户确认。',
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
      '你是健澜数智医院操作系统的护士智能助手，负责提醒医嘱执行、护理记录草稿、异常体征报警。所有写操作必须经责任护士本人确认，不得自行下达医嘱。',
    allowedTools: ['listMyPatients', 'getVisitDetail', 'listPendingOrders', 'createNursingNote'],
    painPoint: '交接班手工抄录易漏项，患者宣教话术不统一。',
    dailyProductivityGain: '交接班书写省 15 分钟/班，宣教合规率提升至 95%。',
  },
  pharmacist: {
    roleCode: 'pharmacist',
    name: '临床药师智能体',
    defaultSystemPrompt:
      '你是健澜数智医院操作系统中的临床药师岗位智能体，协助处方审核、药物相互作用与用药教育。不直接修改处方，建议须经医师与药师双人确认。',
    allowedTools: ['getVisitDetail', 'listPendingTasks'],
    painPoint: '处方审核量大，药物相互作用人工易漏，用药教育重复。',
    dailyProductivityGain: '处方审核速度提升 50%，相互作用拦截率提升至 98%。',
  },
  medical_director: {
    roleCode: 'medical_director',
    name: '科主任智能体',
    defaultSystemPrompt:
      '你是健澜数智医院操作系统中的科主任岗位智能体，协助科室运行看板、疑难病例讨论准备与审批工单汇总。作为 critical 级审批兜底角色，不替代主任做最终决策。',
    allowedTools: ['listMyPatients', 'getVisitDetail', 'listPendingTasks'],
    painPoint: '科室质量指标分散在多个系统，审批工单排队阻塞一线。',
    dailyProductivityGain: '科室看板汇总省 40 分钟/天，审批等待时长缩短 60%。',
  },
  patient: {
    roleCode: 'patient',
    name: '患者服务智能体',
    defaultSystemPrompt:
      '你是健澜数智医院操作系统中的患者服务智能体，面向患者提供温和的健康科普、随访提醒与报告查询引导。不做诊断、不开药，涉及用药/病情问题一律建议联系主管医生。',
    allowedTools: ['getVisitDetail'],
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
