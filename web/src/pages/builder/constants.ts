/**
 * 健澜科技杠OS - 低代码编排画布常量
 * Copyright (c) 2026 健澜科技.
 */

import type { NodeConfig, NodeType, RiskLevel } from '@/types/builder';

export interface NodeTypeMeta {
  type: NodeType;
  label: string;
  color: string;
  icon: string;
  description: string;
  /** 出端口：'single' 单出口；'branch' 多分支（condition/parallel）；'none' 无出口 */
  outputs: 'single' | 'branch' | 'none';
  defaultConfig: NodeConfig;
}

/** 品牌深海蓝色板，按节点类别分组 */
export const NODE_TYPES: NodeTypeMeta[] = [
  {
    type: 'start',
    label: '开始',
    color: '#0A4D8C',
    icon: 'PlayCircleOutlined',
    description: '工作流入口，接收外部输入',
    outputs: 'single',
    defaultConfig: {},
  },
  {
    type: 'end',
    label: '结束',
    color: '#5b6b7c',
    icon: 'StopOutlined',
    description: '产出最终结果',
    outputs: 'none',
    defaultConfig: { outputMapping: { status: 'completed' } },
  },
  {
    type: 'llm',
    label: '大模型',
    color: '#1677ff',
    icon: 'RobotOutlined',
    description: '理解、生成、推理',
    outputs: 'single',
    defaultConfig: {
      model: 'sonnet',
      temperature: 0.2,
      maxTokens: 2048,
      userTemplate: '',
      systemPrompt: '',
      jsonMode: false,
    },
  },
  {
    type: 'tool',
    label: '医疗工具',
    color: '#13a8a8',
    icon: 'ToolOutlined',
    description: '调用注册的医疗工具',
    outputs: 'single',
    defaultConfig: { toolName: '', inputMapping: {}, requireConfirmation: false },
  },
  {
    type: 'rag',
    label: '知识检索',
    color: '#722ed1',
    icon: 'BookOutlined',
    description: 'RAG 混合检索医学知识库',
    outputs: 'single',
    defaultConfig: {
      knowledgeBases: [],
      query: '',
      topK: 5,
      scoreThreshold: 0.35,
      strategy: 'hybrid',
      outputVariable: 'retrieval',
    },
  },
  {
    type: 'condition',
    label: '条件分支',
    color: '#fa8c16',
    icon: 'BranchesOutlined',
    description: 'if-else / switch 路由',
    outputs: 'branch',
    defaultConfig: {
      mode: 'if-else',
      branches: [{ name: 'true', when: '' }],
      defaultPort: 'false',
    },
  },
  {
    type: 'loop',
    label: '循环',
    color: '#eb2f96',
    icon: 'RetweetOutlined',
    description: 'while 条件循环 / foreach 批量',
    outputs: 'single',
    defaultConfig: {
      loopMode: 'foreach',
      collection: '',
      itemVariable: 'item',
      indexVariable: 'index',
      bodyEntry: '',
      maxIterations: 1000,
    },
  },
  {
    type: 'parallel',
    label: '并行',
    color: '#2f54eb',
    icon: 'DeploymentUnitOutlined',
    description: 'all/any/race 并行执行',
    outputs: 'single',
    defaultConfig: {
      parallelMode: 'all',
      concurrency: 4,
      parallelBranches: [{ name: 'branch1', entryNode: '' }],
    },
  },
  {
    type: 'human',
    label: '人工审核',
    color: '#f5222d',
    icon: 'UserSwitchOutlined',
    description: '挂起等待人工确认/补充',
    outputs: 'single',
    defaultConfig: {
      title: '人工审核',
      instructions: '',
      assigneeRoles: ['doctor'],
      formSchema: {},
    },
  },
  {
    type: 'subagent',
    label: '子智能体',
    color: '#08979c',
    icon: 'TeamOutlined',
    description: '调用其他智能体 / MDT 会诊',
    outputs: 'single',
    defaultConfig: {
      agentId: '',
      collaborationMode: 'delegate',
      inputMapping: {},
      consultationAgents: [],
    },
  },
  {
    type: 'code',
    label: '数据映射',
    color: '#8c8c8c',
    icon: 'FunctionOutlined',
    description: '安全表达式数据转换',
    outputs: 'single',
    defaultConfig: { assignments: {} },
  },
  {
    type: 'delay',
    label: '延时',
    color: '#a0d911',
    icon: 'ClockCircleOutlined',
    description: '等待指定时长',
    outputs: 'single',
    defaultConfig: { durationMs: 1000 },
  },
];

export const NODE_TYPE_MAP: Record<NodeType, NodeTypeMeta> = NODE_TYPES.reduce(
  (acc, meta) => ({ ...acc, [meta.type]: meta }),
  {} as Record<NodeType, NodeTypeMeta>,
);

/** 38 个内置医疗工具，按业务分类 */
export const MEDICAL_TOOLS: Record<string, string[]> = {
  患者管理: ['query_patient', 'get_patient_detail', 'get_patient_history'],
  电子病历: [
    'generate_medical_record',
    'get_medical_record',
    'get_medical_template',
    'medical_record_qa',
  ],
  病历质控: [
    'medical_record_quality_check',
    'medical_record_front_page_check',
    'core_system_check',
  ],
  处方药品: [
    'create_prescription',
    'prescription_audit',
    'get_prescription_list',
    'get_drug_info',
    'get_drug_information',
  ],
  临床决策: [
    'drug_interaction_check',
    'diagnosis_suggestion',
    'treatment_plan_suggestion',
    'critical_value_alert',
    'search_medical_knowledge',
  ],
  检验检查: [
    'get_lab_result',
    'order_lab_test',
    'order_imaging_exam',
    'get_image_report',
    'view_dicom',
  ],
  医嘱管理: ['create_order', 'get_order_list', 'cancel_order', 'order_audit'],
  患者服务: ['appointment_registration', 'visit_reminder', 'follow_up_management'],
  运营管理: [
    'department_operation_analysis',
    'medical_quality_indicators',
    'drg_dip_analysis',
  ],
  系统集成: ['sync_to_his', 'fetch_from_emr', 'hl7_message_send'],
};

export const ALL_TOOL_NAMES: string[] = Object.values(MEDICAL_TOOLS).flat();

/** 逻辑知识库 */
export const KNOWLEDGE_BASES: Array<{ name: string; label: string }> = [
  { name: 'clinical-guidelines', label: '临床指南库' },
  { name: 'medical-record-standards', label: '病历书写规范库' },
  { name: 'drug-instructions', label: '药品说明书库' },
  { name: 'lab-reference', label: '检验参考库' },
  { name: 'icd-coding', label: 'ICD 编码库' },
  { name: 'drg-dip', label: 'DRG/DIP 分组库' },
  { name: 'follow-up-protocols', label: '随访方案库' },
  { name: 'triage-departments', label: '科室与分诊库' },
  { name: 'differential-diagnosis', label: '鉴别诊断库' },
  { name: 'management-standards', label: '管理与质控标准库' },
];

export const MODEL_OPTIONS = [
  { value: 'sonnet', label: 'Sonnet（均衡，默认）' },
  { value: 'opus', label: 'Opus（强推理，诊断/编码）' },
  { value: 'haiku', label: 'Haiku（高并发，导诊/随访）' },
];

export const ROLE_OPTIONS = [
  { value: 'doctor', label: '医生' },
  { value: 'nurse', label: '护士' },
  { value: 'pharmacist', label: '药师' },
  { value: 'technician', label: '技师' },
  { value: 'admin', label: '管理员' },
  { value: 'researcher', label: '科研人员' },
  { value: 'patient', label: '患者' },
];

export const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: '低风险', color: 'green' },
  medium: { label: '中风险', color: 'orange' },
  high: { label: '高风险', color: 'red' },
};

export const AGENT_CATEGORIES = [
  '电子病历',
  '医疗质控',
  '临床决策',
  '合理用药',
  '报告解读',
  '病案与医保',
  '诊后管理',
  '诊前服务',
  '运营管理',
];
