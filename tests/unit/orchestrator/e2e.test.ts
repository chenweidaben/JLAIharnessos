/**
 * 健澜科技杠OS - 端到端医疗智能体验收测试
 *
 * 以"AI 病历生成 → 知识检索 → 病历质控 → 医生人工审核 → 归档"全流程为例，
 * 验证智能体包导入、注册、工作流编排、工具调用、人工挂起恢复、条件路由的闭环。
 * 全部使用虚拟患者与 Mock 模型，不涉及任何真实患者数据。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, it, expect } from 'bun:test';
import {
  createMockOrchestrator,
  WorkflowNodeType,
  type AgentDefinition,
  type AgentPackage,
  type WorkflowDefinition,
} from '@/orchestrator/index.js';

const tick = (ms = 10): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** 构造"AI 病历生成与质控"智能体 */
function buildMedicalRecordAgent(): AgentDefinition {
  const workflow: WorkflowDefinition = {
    meta: { id: 'medical-record-main', name: 'AI病历生成质控主流程', version: '1.0.0' },
    nodes: [
      { id: 'start', type: WorkflowNodeType.START, name: '开始', config: {} as never },
      {
        id: 'rag',
        type: WorkflowNodeType.RAG,
        name: '临床知识检索',
        config: {
          knowledgeBases: ['clinical'],
          query: 'input.chief_complaint',
          topK: 3,
          scoreThreshold: 0.1,
          strategy: 'hybrid',
          outputVariable: 'evidence',
        } as never,
      },
      {
        id: 'gen',
        type: WorkflowNodeType.LLM,
        name: '生成病历',
        config: {
          model: 'sonnet',
          systemPrompt: 'prompts/medical-record.md',
          userTemplate: '主诉：${input.chief_complaint}\n参考资料：${nodes.rag.output.context}',
          jsonMode: true,
        } as never,
      },
      {
        id: 'qc',
        type: WorkflowNodeType.TOOL,
        name: '病历质控',
        config: {
          toolName: 'medical_record_quality_check',
          inputMapping: { record: 'nodes.gen.output.json' },
        } as never,
      },
      {
        id: 'cond',
        type: WorkflowNodeType.CONDITION,
        name: '质控是否通过',
        config: {
          mode: 'if-else',
          branches: [{ name: 'pass', when: 'nodes.qc.output.passed == true' }],
          defaultPort: 'fail',
        } as never,
      },
      {
        id: 'review',
        type: WorkflowNodeType.HUMAN,
        name: '医生审核确认',
        config: { title: '病历审核', instructions: '请审核 AI 生成的病历', assigneeRoles: ['doctor'] } as never,
      },
      {
        id: 'save',
        type: WorkflowNodeType.TOOL,
        name: '归档病历',
        config: {
          toolName: 'save_medical_record',
          inputMapping: { record: 'nodes.gen.output.json', score: 'nodes.qc.output.score' },
        } as never,
      },
      {
        id: 'done',
        type: WorkflowNodeType.CODE,
        name: '完成',
        config: { assignments: { status: '"completed"', recordId: 'nodes.save.output.recordId' } } as never,
      },
      {
        id: 'revise',
        type: WorkflowNodeType.CODE,
        name: '退回修改',
        config: { assignments: { status: '"needs_revision"', issues: 'nodes.qc.output.issues' } } as never,
      },
      {
        id: 'end',
        type: WorkflowNodeType.END,
        name: '结束',
        config: {
          outputMapping: { status: 'vars.status', recordId: 'vars.recordId', issues: 'vars.issues' },
        } as never,
      },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'rag' },
      { id: 'e2', source: 'rag', target: 'gen' },
      { id: 'e3', source: 'gen', target: 'qc' },
      { id: 'e4', source: 'qc', target: 'cond' },
      { id: 'e5', source: 'cond', target: 'review', sourcePort: 'pass' },
      { id: 'e6', source: 'review', target: 'save' },
      { id: 'e7', source: 'save', target: 'done' },
      { id: 'e8', source: 'done', target: 'end' },
      { id: 'e9', source: 'cond', target: 'revise', sourcePort: 'fail' },
      { id: 'e10', source: 'revise', target: 'end' },
    ],
  };

  return {
    id: 'medical-record-writer',
    name: 'AI电子病历生成智能体',
    nameEn: 'Medical Record Writer',
    version: '1.0.0',
    category: '电子病历',
    tags: ['病历', 'CDS', '质控'],
    description: '基于主诉与临床知识生成结构化病历，自动质控并经医生审核归档',
    allowedRoles: ['doctor'],
    riskLevel: 'medium',
    tools: ['medical_record_quality_check', 'save_medical_record'],
    knowledgeBases: ['clinical'],
    model: { provider: 'anthropic', model: 'sonnet', temperature: 0.2 },
    systemPrompt: 'prompts/medical-record.md',
    entryWorkflow: 'medical-record-main',
    workflows: [workflow],
    triggers: [{ type: 'manual', enabled: true }],
    disclaimer: '本病历由 AI 辅助生成，须经执业医师审核确认后方可作为正式医疗文书。',
  };
}

describe('端到端：AI 病历生成与质控智能体', () => {
  it('质控通过 + 医生审核通过 → 病历归档', async () => {
    const orch = createMockOrchestrator();

    // 临床知识库
    orch.mocks.rag.addKnowledgeBase('clinical').addDoc({
      kb: 'clinical',
      id: 'guide-htn',
      content: '2型糖尿病患者应记录空腹血糖、糖化血红蛋白，并评估并发症。',
      source: '2型糖尿病防治指南',
      authorityLevel: 'guideline',
    });

    // 模型生成结构化病历
    orch.mocks.llm.script({
      record: {
        chiefComplaint: '口干多饮伴乏力1月',
        presentIllness: '患者1月前无明显诱因出现口干多饮…',
        diagnosis: '2型糖尿病',
      },
    });

    // 质控通过
    orch.mocks.tools.registerTool(
      'medical_record_quality_check',
      () => ({ success: true, data: { passed: true, score: 92, issues: [] } }),
      { readOnly: true, riskLevel: 'low' },
    );
    // 归档
    orch.mocks.tools.registerTool(
      'save_medical_record',
      () => ({ success: true, data: { recordId: 'MR-2026-0001' } }),
      { riskLevel: 'medium' },
    );

    // 导入智能体包并注册
    const pkg: AgentPackage = orch.packManager.exportPackage(buildMedicalRecordAgent(), {
      prompts: { 'prompts/medical-record.md': '你是严谨的病历书写助手，仅依据资料生成，不臆造。' },
    });
    const imported = orch.packManager.importPackage(pkg);
    expect(imported.validations.every((v) => v.valid)).toBe(true);
    const agent = orch.registry.get('medical-record-writer')!;
    expect(agent).toBeTruthy();

    // 启动（含人工节点，先不 await）
    const runPromise = orch.invoker.run(
      agent,
      { chief_complaint: '口干多饮伴乏力' },
      { trigger: 'api' },
    );
    await tick(20);

    // 人工审核挂起，医生确认
    expect(orch.humanHandler.pendingCount).toBe(1);
    const task = orch.humanHandler.listPending()[0];
    expect(task.title).toBe('病历审核');
    orch.humanHandler.resolve(task.taskId, { taskId: task.taskId, approved: true, reviewerId: 'DR001' });

    const resp = await runPromise;
    expect(resp.output).toMatchObject({ status: 'completed', recordId: 'MR-2026-0001' });
  });

  it('质控不通过 → 直接退回修改，无需人工审核', async () => {
    const orch = createMockOrchestrator();
    orch.mocks.rag.addKnowledgeBase('clinical').addDoc({
      kb: 'clinical',
      id: 'g1',
      content: '病历现病史应包含起病时间、诱因、诊疗经过。',
      source: '病历书写规范',
      authorityLevel: 'standard',
    });
    orch.mocks.llm.script({ record: { chiefComplaint: '头晕' } });
    orch.mocks.tools.registerTool(
      'medical_record_quality_check',
      () => ({ success: true, data: { passed: false, score: 58, issues: ['现病史不完整', '缺少鉴别诊断'] } }),
      { readOnly: true, riskLevel: 'low' },
    );
    orch.mocks.tools.registerTool(
      'save_medical_record',
      () => ({ success: true, data: { recordId: 'MR-X' } }),
      { riskLevel: 'medium' },
    );

    const pkg = orch.packManager.exportPackage(buildMedicalRecordAgent(), {
      prompts: { 'prompts/medical-record.md': '你是病历助手' },
    });
    orch.packManager.importPackage(pkg);
    const agent = orch.registry.get('medical-record-writer')!;

    const resp = await orch.invoker.run(agent, { chief_complaint: '头晕' }, { trigger: 'api' });
    const output = resp.output as { status: string; issues: string[] };
    expect(output.status).toBe('needs_revision');
    expect(output.issues).toContain('现病史不完整');
    // 质控未通过不应创建人工审核任务
    expect(orch.humanHandler.pendingCount).toBe(0);
  });
});
