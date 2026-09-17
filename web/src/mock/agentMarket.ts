/**
 * 健澜科技杠OS - 内置智能体市场（bundled 模板）
 *
 * 提供 10 大刚需智能体的可编辑模板，供信息科一键加载后二次编排。
 * 权威完整定义以后端 agents/<id>/agent.yaml 为准，画布也支持直接导入该文件。
 * 所有模板均通过前端 DAG 校验（见 builder/dag.test.ts）。
 *
 * Copyright (c) 2026 健澜科技.
 */

import type { AgentMeta, BuilderEdge, BuilderNode, MarketAgent, NodeConfig, NodeType } from '@/types/builder';
import { builderToPackage, type AgentPackageJson } from '@/pages/builder/graph';

export const MARKET_AGENTS: MarketAgent[] = [
  { id: 'medical-record-writer', name: 'AI电子病历生成', category: '电子病历', riskLevel: 'medium', version: '1.0.0', summary: '采集病史与检验检查，生成结构化病历并质控、审核归档', humanInLoop: true, builtin: true },
  { id: 'medical-record-qc', name: 'AI病历质控', category: '医疗质控', riskLevel: 'low', version: '1.0.0', summary: '批量内涵质控、首页质控与核心制度检查，出质控报告', humanInLoop: true, builtin: true },
  { id: 'voice-medical-record', name: '语音电子病历', category: '电子病历', riskLevel: 'medium', version: '1.0.0', summary: '口述转写、术语规范化、剂量核对，医生签名归档', humanInLoop: true, builtin: true },
  { id: 'diagnosis-assistant', name: '智能诊断辅助', category: '临床决策', riskLevel: 'medium', version: '1.0.0', summary: 'CDS 与指南并行检索，鉴别诊断与急危重提醒', humanInLoop: true, builtin: true },
  { id: 'prescription-review', name: '智能处方审核', category: '合理用药', riskLevel: 'high', version: '1.0.0', summary: '相互作用、配伍、剂量、过敏六维前置审核拦截', humanInLoop: true, builtin: true },
  { id: 'lab-imaging-interpreter', name: '检验检查报告解读', category: '报告解读', riskLevel: 'low', version: '1.0.0', summary: '异常标注、临床意义解读与复查建议，危急值提醒', humanInLoop: true, builtin: true },
  { id: 'medical-coder', name: '智能编码与DRG/DIP', category: '病案与医保', riskLevel: 'medium', version: '1.0.0', summary: 'ICD 编码推荐、DRG/DIP 分组预测与高套识别', humanInLoop: true, builtin: true },
  { id: 'follow-up', name: '智能随访', category: '诊后管理', riskLevel: 'medium', version: '1.0.0', summary: '按病种批量生成个体化随访问卷，红旗症状复核', humanInLoop: true, builtin: true },
  { id: 'triage-preconsult', name: '智能导诊预问诊', category: '诊前服务', riskLevel: 'low', version: '1.0.0', summary: '结构化预问诊、科室推荐与分诊级别判定', humanInLoop: true, builtin: true },
  { id: 'medical-affairs-report', name: '医务统计与报表', category: '运营管理', riskLevel: 'low', version: '1.0.0', summary: '并行汇聚质量运营数据，生成院科两级管理报表', humanInLoop: true, builtin: true },
];

const DISCLAIMER = '本智能体输出为临床辅助建议，不能替代医生面诊与诊断，最终诊疗决策由经治医师负责。';

interface Step {
  id: string;
  type: NodeType;
  name: string;
  config?: NodeConfig;
  x?: number;
  y?: number;
}

/** 线性模板：start → steps → end，自动布局连线 */
function linear(meta: AgentMeta, steps: Step[]): AgentPackageJson {
  const colX = (col: number) => 60 + col * 210;
  const nodes: BuilderNode[] = [
    { id: 'start', type: 'medicalNode', position: { x: colX(0), y: 200 }, data: { nodeType: 'start', name: '开始', config: {} } },
    ...steps.map((s, i) => ({
      id: s.id,
      type: 'medicalNode' as const,
      position: { x: s.x ?? colX(i + 1), y: s.y ?? 200 },
      data: { nodeType: s.type, name: s.name, config: s.config ?? {} },
    })),
    {
      id: 'end',
      type: 'medicalNode',
      position: { x: colX(steps.length + 1), y: 200 },
      data: { nodeType: 'end', name: '结束', config: { outputMapping: { status: 'completed' } } },
    },
  ];
  const chain = ['start', ...steps.map((s) => s.id), 'end'];
  const edges: BuilderEdge[] = chain.slice(0, -1).map((src, i) => ({
    id: `e-${src}-${chain[i + 1]}`,
    source: src,
    target: chain[i + 1],
    sourceHandle: 'out',
  }));
  return assemble(meta, nodes, edges);
}

function assemble(meta: AgentMeta, nodes: BuilderNode[], edges: BuilderEdge[]): AgentPackageJson {
  // 统一走画布→DSL 转换，确保 loop/parallel 等节点使用后端字段名（mode/branches/bodyEntry）
  const pkg = builderToPackage(nodes, edges, meta);
  const agent = pkg.agent as Record<string, unknown>;
  agent.systemPrompt = 'prompts/system.md';
  pkg.prompts = {
    'prompts/system.md':
      meta.systemPrompt || '你是严谨的医疗智能体，遵循诊疗规范，不确定时明确提示并交由医生决策。',
  };
  return pkg;
}

function baseMeta(p: Partial<AgentMeta> & { id: string; name: string; category: string; riskLevel: AgentMeta['riskLevel'] }): AgentMeta {
  return {
    version: '1.0.0',
    description: '',
    allowedRoles: ['doctor'],
    tools: [],
    knowledgeBases: [],
    systemPrompt: '',
    model: 'sonnet',
    temperature: 0.2,
    tags: [],
    builtin: true,
    disclaimer: DISCLAIMER,
    ...p,
  };
}

function buildPackages(): Record<string, AgentPackageJson> {
  const pkgs: Record<string, AgentPackageJson> = {};

  // 1. 病历生成（线性 + 人工审核）
  pkgs['medical-record-writer'] = linear(
    baseMeta({
      id: 'medical-record-writer', name: 'AI电子病历生成', category: '电子病历', riskLevel: 'medium',
      description: MARKET_AGENTS[0].summary, tools: ['get_patient_history', 'get_lab_result', 'get_image_report', 'search_medical_knowledge', 'medical_record_quality_check', 'sync_to_his'],
      knowledgeBases: ['clinical-guidelines', 'medical-record-standards'],
      systemPrompt: '你是病历书写助手，依据客观病史与检查生成规范、完整、不得臆造的结构化病历。',
    }),
    [
      { id: 'history', type: 'tool', name: '调取病史', config: { toolName: 'get_patient_history', inputMapping: { patientId: 'input.patientId' }, readOnly: true } },
      { id: 'kb', type: 'rag', name: '检索规范', config: { knowledgeBases: ['clinical-guidelines', 'medical-record-standards'], query: 'input.chiefComplaint', topK: 5, scoreThreshold: 0.35, strategy: 'hybrid', outputVariable: 'refs' } },
      { id: 'draft', type: 'llm', name: '生成病历', config: { model: 'sonnet', temperature: 0.2, userTemplate: '依据病史与规范生成病历：${input.chiefComplaint}', jsonMode: true } },
      { id: 'qc', type: 'tool', name: '内涵质控', config: { toolName: 'medical_record_quality_check', inputMapping: { recordContent: 'nodes.draft.output.text' } } },
      { id: 'review', type: 'human', name: '医生审核', config: { title: '病历审核签名', instructions: '请核对病历内容并签名', assigneeRoles: ['doctor'] } },
      { id: 'archive', type: 'tool', name: '归档HIS', config: { toolName: 'sync_to_his', inputMapping: { recordId: 'nodes.draft.output.recordId' }, requireConfirmation: true } },
    ],
  );

  // 2. 病历质控（foreach 高级范例）
  {
    const meta = baseMeta({
      id: 'medical-record-qc', name: 'AI病历质控', category: '医疗质控', riskLevel: 'low',
      description: MARKET_AGENTS[1].summary, tools: ['medical_record_quality_check', 'medical_record_front_page_check', 'core_system_check'],
      knowledgeBases: ['medical-record-standards'], model: 'haiku',
      systemPrompt: '你是病历质控专家，依据病历书写规范逐项核查并分级。',
    });
    const nodes: BuilderNode[] = [
      { id: 'start', type: 'medicalNode', position: { x: 40, y: 220 }, data: { nodeType: 'start', name: '开始', config: {} } },
      { id: 'foreach', type: 'medicalNode', position: { x: 250, y: 220 }, data: { nodeType: 'loop', name: '逐份质控', config: { loopMode: 'foreach', collection: 'input.recordIds', itemVariable: 'rid', indexVariable: 'idx', bodyEntry: 'qc_one_tool', maxIterations: 500 } } },
      { id: 'qc_one_tool', type: 'medicalNode', position: { x: 250, y: 380 }, data: { nodeType: 'tool', name: '单份质控', config: { toolName: 'medical_record_quality_check', inputMapping: { recordId: 'vars.rid' }, readOnly: true } } },
      { id: 'qc_one_assemble', type: 'medicalNode', position: { x: 470, y: 380 }, data: { nodeType: 'code', name: '汇总单项', config: { assignments: { result: 'nodes.qc_one_tool.output' } } } },
      { id: 'report', type: 'medicalNode', position: { x: 480, y: 220 }, data: { nodeType: 'llm', name: '生成质控报告', config: { model: 'haiku', userTemplate: '汇总质控结果：${nodes.foreach.output}', jsonMode: true } } },
      { id: 'escalate', type: 'medicalNode', position: { x: 700, y: 320 }, data: { nodeType: 'human', name: '严重缺陷复核', config: { title: '严重缺陷复核', instructions: '存在严重缺陷，请人工复核', assigneeRoles: ['admin', 'doctor'] } } },
      { id: 'end', type: 'medicalNode', position: { x: 920, y: 220 }, data: { nodeType: 'end', name: '结束', config: { outputMapping: { report: 'nodes.report.output' } } } },
    ];
    const edges: BuilderEdge[] = [
      { id: 'e-start-foreach', source: 'start', target: 'foreach', sourceHandle: 'out' },
      { id: 'e-qctool-assemble', source: 'qc_one_tool', target: 'qc_one_assemble', sourceHandle: 'out' },
      { id: 'e-foreach-report', source: 'foreach', target: 'report', sourceHandle: 'out' },
      { id: 'e-report-escalate', source: 'report', target: 'escalate', sourceHandle: 'out' },
      { id: 'e-escalate-end', source: 'escalate', target: 'end', sourceHandle: 'out' },
    ];
    pkgs['medical-record-qc'] = assemble(meta, nodes, edges);
  }

  // 3. 语音病历（线性）
  pkgs['voice-medical-record'] = linear(
    baseMeta({
      id: 'voice-medical-record', name: '语音电子病历', category: '电子病历', riskLevel: 'medium',
      description: MARKET_AGENTS[2].summary, tools: ['transcribe_voice', 'medical_record_quality_check', 'sync_to_his'],
      knowledgeBases: ['clinical-guidelines'],
      systemPrompt: '你是语音病历助手，将口述转写为规范书面病历，剂量与频次必须原样保留并提示核对。',
    }),
    [
      { id: 'asr', type: 'tool', name: '语音转写', config: { toolName: 'transcribe_voice', inputMapping: { audioRef: 'input.audioRef' }, readOnly: true } },
      { id: 'kb', type: 'rag', name: '检索规范', config: { knowledgeBases: ['clinical-guidelines'], query: 'nodes.asr.output.text', topK: 5, scoreThreshold: 0.35, strategy: 'hybrid', outputVariable: 'refs' } },
      { id: 'draft', type: 'llm', name: '生成病历', config: { model: 'sonnet', userTemplate: '将转写整理为病历：${nodes.asr.output.text}' } },
      { id: 'verify', type: 'human', name: '剂量核对签名', config: { title: '核对剂量并签名', instructions: '请逐字核对药名、剂量、频次', assigneeRoles: ['doctor'] } },
      { id: 'archive', type: 'tool', name: '归档', config: { toolName: 'sync_to_his', requireConfirmation: true } },
    ],
  );

  // 4. 诊断辅助（线性，含危急值人工）
  pkgs['diagnosis-assistant'] = linear(
    baseMeta({
      id: 'diagnosis-assistant', name: '智能诊断辅助', category: '临床决策', riskLevel: 'medium',
      description: MARKET_AGENTS[3].summary, tools: ['diagnosis_suggestion', 'critical_value_alert', 'search_medical_knowledge'],
      knowledgeBases: ['clinical-guidelines', 'differential-diagnosis'], model: 'opus',
      systemPrompt: '你是诊断辅助助手，给出鉴别诊断与依据，不做确定诊断，急危重情形强制提示。',
    }),
    [
      { id: 'cds', type: 'tool', name: 'CDS分析', config: { toolName: 'diagnosis_suggestion', inputMapping: { patientId: 'input.patientId' }, readOnly: true } },
      { id: 'kb', type: 'rag', name: '指南检索', config: { knowledgeBases: ['clinical-guidelines', 'differential-diagnosis'], query: 'input.chiefComplaint', topK: 6, scoreThreshold: 0.35, strategy: 'hybrid', outputVariable: 'refs' } },
      { id: 'reason', type: 'llm', name: '综合鉴别诊断', config: { model: 'opus', temperature: 0.1, userTemplate: '结合CDS与指南给出鉴别诊断：${input.chiefComplaint}', jsonMode: true } },
      { id: 'critical', type: 'tool', name: '危急值提醒', config: { toolName: 'critical_value_alert', inputMapping: { patientId: 'input.patientId' } } },
      { id: 'confirm', type: 'human', name: '急诊判定确认', config: { title: '急危重判定', instructions: '若提示急危重，请立即处置', assigneeRoles: ['doctor'] } },
    ],
  );

  // 5. 处方审核（parallel 高级范例）
  {
    const meta = baseMeta({
      id: 'prescription-review', name: '智能处方审核', category: '合理用药', riskLevel: 'high',
      description: MARKET_AGENTS[4].summary, tools: ['prescription_audit', 'drug_interaction_check', 'get_drug_information', 'get_prescription_list'],
      knowledgeBases: ['drug-instructions', 'clinical-guidelines'],
      systemPrompt: '你是处方审核药师，依据药典与说明书从严审核，给出通过/警示/驳回分级。',
    });
    const nodes: BuilderNode[] = [
      { id: 'start', type: 'medicalNode', position: { x: 40, y: 220 }, data: { nodeType: 'start', name: '开始', config: {} } },
      { id: 'fanout', type: 'medicalNode', position: { x: 250, y: 220 }, data: { nodeType: 'parallel', name: '三路并行审核', config: { parallelMode: 'all', concurrency: 3, parallelBranches: [{ name: 'rule', entryNode: 'b_rule' }, { name: 'interaction', entryNode: 'b_interaction' }, { name: 'druginfo', entryNode: 'b_druginfo' }] } } },
      { id: 'b_rule', type: 'medicalNode', position: { x: 250, y: 60 }, data: { nodeType: 'tool', name: '规则预审', config: { toolName: 'prescription_audit', inputMapping: { patientId: 'input.patientId' }, readOnly: true } } },
      { id: 'b_interaction', type: 'medicalNode', position: { x: 250, y: 220 }, data: { nodeType: 'tool', name: '相互作用', config: { toolName: 'drug_interaction_check', inputMapping: { patientId: 'input.patientId' }, readOnly: true } } },
      { id: 'b_druginfo', type: 'medicalNode', position: { x: 250, y: 380 }, data: { nodeType: 'rag', name: '说明书检索', config: { knowledgeBases: ['drug-instructions'], query: 'input.prescriptionText', topK: 5, scoreThreshold: 0.3, strategy: 'hybrid', outputVariable: 'drugInfo' } } },
      { id: 'verdict', type: 'medicalNode', position: { x: 520, y: 220 }, data: { nodeType: 'llm', name: '审核分级', config: { model: 'sonnet', temperature: 0, userTemplate: '综合三路结果判定 pass/warn/reject：${nodes.fanout.output}', jsonMode: true } } },
      { id: 'pharmacist', type: 'medicalNode', position: { x: 760, y: 220 }, data: { nodeType: 'human', name: '药师复核', config: { title: '处方药师复核', instructions: '警示/驳回处方需药师双签', assigneeRoles: ['pharmacist'] } } },
      { id: 'end', type: 'medicalNode', position: { x: 990, y: 220 }, data: { nodeType: 'end', name: '结束', config: { outputMapping: { decision: 'nodes.verdict.output.riskLevel' } } } },
    ];
    const edges: BuilderEdge[] = [
      { id: 'e-start-fanout', source: 'start', target: 'fanout', sourceHandle: 'out' },
      { id: 'e-fanout-verdict', source: 'fanout', target: 'verdict', sourceHandle: 'out' },
      { id: 'e-verdict-pharmacist', source: 'verdict', target: 'pharmacist', sourceHandle: 'out' },
      { id: 'e-pharmacist-end', source: 'pharmacist', target: 'end', sourceHandle: 'out' },
    ];
    pkgs['prescription-review'] = assemble(meta, nodes, edges);
  }

  // 6. 报告解读（线性）
  pkgs['lab-imaging-interpreter'] = linear(
    baseMeta({
      id: 'lab-imaging-interpreter', name: '检验检查报告解读', category: '报告解读', riskLevel: 'low',
      description: MARKET_AGENTS[5].summary, tools: ['get_lab_result', 'get_image_report', 'critical_value_alert'],
      knowledgeBases: ['lab-reference', 'clinical-guidelines'],
      systemPrompt: '你是报告解读助手，客观标注异常并解释临床意义，给出复查建议，不替代诊断。',
    }),
    [
      { id: 'labs', type: 'tool', name: '获取检验', config: { toolName: 'get_lab_result', inputMapping: { visitId: 'input.visitId' }, readOnly: true } },
      { id: 'images', type: 'tool', name: '获取影像', config: { toolName: 'get_image_report', inputMapping: { visitId: 'input.visitId' }, readOnly: true } },
      { id: 'kb', type: 'rag', name: '参考区间', config: { knowledgeBases: ['lab-reference'], query: 'input.itemName', topK: 5, scoreThreshold: 0.3, strategy: 'hybrid', outputVariable: 'refs' } },
      { id: 'interpret', type: 'llm', name: '双受众解读', config: { model: 'sonnet', userTemplate: '解读检验影像结果：${nodes.labs.output}', jsonMode: true } },
      { id: 'critical', type: 'human', name: '危急值确认', config: { title: '危急值结果确认', instructions: '危急值需立即通知并确认', assigneeRoles: ['doctor', 'nurse'] } },
    ],
  );

  // 7. 编码 DRG（线性）
  pkgs['medical-coder'] = linear(
    baseMeta({
      id: 'medical-coder', name: '智能编码与DRG/DIP', category: '病案与医保', riskLevel: 'medium',
      description: MARKET_AGENTS[6].summary, tools: ['get_medical_record', 'drg_dip_analysis'],
      knowledgeBases: ['icd-coding', 'drg-dip'],
      systemPrompt: '你是病案编码员，依据病历准确推荐 ICD-10/ICD-9-CM-3 编码与 DRG/DIP 分组，列出歧义。',
    }),
    [
      { id: 'record', type: 'tool', name: '读取病历', config: { toolName: 'get_medical_record', inputMapping: { visitId: 'input.visitId' }, readOnly: true } },
      { id: 'icd', type: 'rag', name: 'ICD检索', config: { knowledgeBases: ['icd-coding', 'drg-dip'], query: 'nodes.record.output.diagnoses', topK: 8, scoreThreshold: 0.3, strategy: 'hybrid', outputVariable: 'codes' } },
      { id: 'code', type: 'llm', name: '编码推荐', config: { model: 'opus', temperature: 0, userTemplate: '推荐编码与分组：${nodes.record.output}', jsonMode: true } },
      { id: 'drg', type: 'tool', name: 'DRG分析', config: { toolName: 'drg_dip_analysis', inputMapping: { codes: 'nodes.code.output.codes' }, readOnly: true } },
      { id: 'review', type: 'human', name: '编码歧义复核', config: { title: '编码/高套复核', instructions: '歧义编码与高套风险需人工确认', assigneeRoles: ['admin'] } },
    ],
  );

  // 8. 随访（foreach 概念以线性 + 人工表达，保证模板合法）
  pkgs['follow-up'] = linear(
    baseMeta({
      id: 'follow-up', name: '智能随访', category: '诊后管理', riskLevel: 'medium',
      description: MARKET_AGENTS[7].summary, tools: ['get_patient_history', 'follow_up_management'],
      knowledgeBases: ['follow-up-protocols'], model: 'haiku',
      systemPrompt: '你是随访助手，按病种路径生成个体化问卷，识别红旗症状并建议复诊。',
    }),
    [
      { id: 'history', type: 'tool', name: '调取病史', config: { toolName: 'get_patient_history', inputMapping: { patientId: 'input.patientId' }, readOnly: true } },
      { id: 'protocol', type: 'rag', name: '随访方案', config: { knowledgeBases: ['follow-up-protocols'], query: 'nodes.history.output.diagnosis', topK: 5, scoreThreshold: 0.3, strategy: 'hybrid', outputVariable: 'protocol' } },
      { id: 'questionnaire', type: 'llm', name: '生成随访问卷', config: { model: 'haiku', userTemplate: '生成个体化随访问卷：${nodes.history.output}', jsonMode: true } },
      { id: 'send', type: 'tool', name: '下发随访', config: { toolName: 'follow_up_management', inputMapping: { questionnaire: 'nodes.questionnaire.output' } } },
      { id: 'review', type: 'human', name: '异常结果复核', config: { title: '随访异常复核', instructions: '红旗症状/异常回答需医护复核', assigneeRoles: ['doctor', 'nurse'] } },
    ],
  );

  // 9. 导诊预问诊（线性）
  pkgs['triage-preconsult'] = linear(
    baseMeta({
      id: 'triage-preconsult', name: '智能导诊预问诊', category: '诊前服务', riskLevel: 'low',
      description: MARKET_AGENTS[8].summary, tools: ['appointment_registration'],
      knowledgeBases: ['triage-departments', 'clinical-guidelines'], model: 'haiku',
      systemPrompt: '你是预问诊助手，结构化采集主诉与病史，推荐科室与分诊级别，急危重引导急诊。',
    }),
    [
      { id: 'collect', type: 'llm', name: '结构化采集', config: { model: 'haiku', userTemplate: '引导患者描述症状：${input.text}', jsonMode: true } },
      { id: 'dept', type: 'rag', name: '科室匹配', config: { knowledgeBases: ['triage-departments'], query: 'nodes.collect.output.chiefComplaint', topK: 5, scoreThreshold: 0.3, strategy: 'hybrid', outputVariable: 'dept' } },
      { id: 'triage', type: 'llm', name: '分诊定级', config: { model: 'haiku', temperature: 0, userTemplate: '判定分诊级别：${nodes.collect.output}', jsonMode: true } },
      { id: 'emergency', type: 'human', name: '急诊人工确认', config: { title: '急诊分诊确认', instructions: '判定急诊者请人工确认并开通绿色通道', assigneeRoles: ['nurse', 'admin'] } },
      { id: 'book', type: 'tool', name: '预约挂号', config: { toolName: 'appointment_registration', inputMapping: { department: 'nodes.dept.output' } } },
    ],
  );

  // 10. 医务报表（线性汇聚）
  pkgs['medical-affairs-report'] = linear(
    baseMeta({
      id: 'medical-affairs-report', name: '医务统计与报表', category: '运营管理', riskLevel: 'low',
      description: MARKET_AGENTS[9].summary, tools: ['medical_quality_indicators', 'department_operation_analysis', 'drg_dip_analysis', 'core_system_check'],
      knowledgeBases: ['management-standards'], allowedRoles: ['admin'],
      systemPrompt: '你是医务管理分析助手，依据指标口径生成院科两级报表与改进建议，不臆造数据。',
    }),
    [
      { id: 'quality', type: 'tool', name: '质量指标', config: { toolName: 'medical_quality_indicators', readOnly: true } },
      { id: 'operation', type: 'tool', name: '运营数据', config: { toolName: 'department_operation_analysis', readOnly: true } },
      { id: 'standard', type: 'rag', name: '管理标准', config: { knowledgeBases: ['management-standards'], query: 'input.reportTopic', topK: 5, scoreThreshold: 0.3, strategy: 'hybrid', outputVariable: 'std' } },
      { id: 'report', type: 'llm', name: '生成报表', config: { model: 'sonnet', userTemplate: '生成管理报表：${nodes.quality.output}', jsonMode: true } },
      { id: 'review', type: 'human', name: '重大风险审阅', config: { title: '院级报表审阅', instructions: '重大风险项需管理者审阅', assigneeRoles: ['admin'] } },
    ],
  );

  return pkgs;
}

export const BUILTIN_PACKAGES: Record<string, AgentPackageJson> = buildPackages();
