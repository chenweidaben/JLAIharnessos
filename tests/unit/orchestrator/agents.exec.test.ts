/**
 * 健澜科技杠OS - 重点智能体基于真实 YAML 的可执行性冒烟测试
 *
 * 直接加载 agents/ 下的 agent.yaml，在确定性 Mock 运行时中真正"跑一遍"工作流，
 * 验证表达式映射、节点连线、条件、foreach 循环、parallel 并行、人工挂起恢复在运行期无错。
 * 覆盖：AI病历生成（含人工审核）、AI病历质控（foreach）、处方审核（parallel）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockOrchestrator, type MockOrchestrator } from '@/orchestrator/index.js';
import { loadAgentPackageFromDir } from '@/orchestrator/pack/directoryLoader.js';
import type { AgentDefinition } from '@/orchestrator/dsl/types.js';
import type { MockToolInvoker } from '@/orchestrator/adapters/mockRuntime.js';
import type { InMemoryHumanTaskHandler } from '@/orchestrator/engine/humanTaskHandler.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const AGENTS_DIR = join(__dirname, '..', '..', '..', 'agents');
const tick = (ms = 2): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** 注册冒烟测试所需的全部工具 Mock（关键工具返回驱动 happy path 的数据） */
function registerToolMocks(tools: MockToolInvoker): void {
  const ok = (data: unknown) => (): { success: true; data: unknown } => ({ success: true, data });
  tools.registerTool('get_patient_history', ok({ allergies: [], history: '2型糖尿病病史5年' }), { readOnly: true });
  tools.registerTool('get_lab_result', ok([{ item: '空腹血糖', value: 7.4, unit: 'mmol/L', abnormal: true }]), { readOnly: true });
  tools.registerTool('get_image_report', ok({ reports: [] }), { readOnly: true });
  tools.registerTool(
    'medical_record_quality_check',
    ok({ passed: true, score: 92, issues: [] }),
    { readOnly: true, riskLevel: 'low' },
  );
  tools.registerTool('medical_record_front_page_check', ok({ passed: true, issues: [] }), { readOnly: true });
  tools.registerTool('core_system_check', ok({ complianceRate: 0.98, items: [] }), { readOnly: true });
  tools.registerTool('sync_to_his', ok({ id: 'MR-NEW-001', synced: true }), { riskLevel: 'medium' });
  tools.registerTool(
    'get_prescription_list',
    ok([{ drugName: '二甲双胍', dose: '0.5g', frequency: 'bid' }]),
    { readOnly: true },
  );
  tools.registerTool('prescription_audit', ok({ passed: true, issues: [] }), { readOnly: true });
  tools.registerTool('drug_interaction_check', ok({ interactions: [], hasCritical: false }), { readOnly: true });
}

/** 注册冒烟用到的知识库（空库即可，RAG 空结果不阻断流程） */
function registerKbs(orch: MockOrchestrator, names: string[]): void {
  names.forEach((n) => orch.mocks.rag.addKnowledgeBase(n));
}

/** 加载并注册智能体 */
async function loadAgent(orch: MockOrchestrator, id: string): Promise<AgentDefinition> {
  const loaded = await loadAgentPackageFromDir(join(AGENTS_DIR, id));
  const resolver = {
    hasTool: (n: string) => orch.mocks.tools.has(n),
    hasKnowledgeBase: (n: string) => orch.mocks.rag.hasKnowledgeBase(n),
    hasAgent: (a: string) => orch.registry.has(a),
  };
  const result = orch.packManager.importPackage(loaded.pkg, { resolver });
  expect(result.validations.every((v: { valid: boolean }) => v.valid)).toBe(true);
  return orch.registry.get(id)!;
}

/** 运行智能体并自动通过所有人工节点 */
async function runWithAutoHuman(
  orch: MockOrchestrator,
  agent: AgentDefinition,
  input: Record<string, unknown>,
): Promise<{ output: Record<string, unknown> }> {
  const human: InMemoryHumanTaskHandler = orch.humanHandler;
  const p = orch.invoker.run(agent, input, { trigger: 'api' }) as Promise<{ output: Record<string, unknown> }>;
  let result: { output: Record<string, unknown> } | undefined;
  let error: unknown;
  p.then((r) => (result = r)).catch((e) => (error = e));
  for (let i = 0; i < 500 && !result && !error; i++) {
    await tick(3);
    for (const task of human.listPending()) {
      human.resolve(task.taskId, {
        taskId: task.taskId,
        approved: true,
        reviewerId: 'DR-MOCK-01',
        formData: { approved: true, confirmed: true, acknowledged: true, editedRecord: '患者诊断2型糖尿病，予规范治疗…' },
      });
    }
  }
  if (error) throw error;
  if (!result) throw new Error('智能体运行超时未结束');
  return result;
}

describe('重点智能体 - 真实 YAML 端到端冒烟', () => {
  it('medical-record-writer：生成→质控→人工审核→归档 闭环', async () => {
    const orch = createMockOrchestrator();
    registerToolMocks(orch.mocks.tools);
    registerKbs(orch, ['clinical-guidelines', 'medical-record-standards']);
    orch.mocks.llm.script({
      chiefComplaint: '口干多饮1月',
      presentIllness: '口干多饮多尿…',
      preliminaryDiagnosis: ['2型糖尿病'],
      gaps: [],
    });
    const agent = await loadAgent(orch, 'medical-record-writer');
    const out = await runWithAutoHuman(orch, agent, {
      patientId: 'P1',
      visitId: 'V1',
      chiefComplaint: '口干多饮1月',
      presentIllnessNotes: '多饮多尿体重下降',
    });
    expect(out.output.status).toBe('completed');
    expect(out.output.recordId).toBe('MR-NEW-001');
  });

  it('medical-record-qc：foreach 批量质控并生成报告', async () => {
    const orch = createMockOrchestrator();
    registerToolMocks(orch.mocks.tools);
    registerKbs(orch, ['medical-record-standards']);
    orch.mocks.llm.script({
      totalChecked: 3,
      passCount: 3,
      passRate: 1,
      hasCritical: false,
      criticalIssues: [],
      commonIssues: [],
      rectification: [],
    });
    const agent = await loadAgent(orch, 'medical-record-qc');
    const out = await runWithAutoHuman(orch, agent, {
      recordIds: ['M1', 'M2', 'M3'],
      department: '内分泌科',
      timeRange: { from: '2026-09-01', to: '2026-09-17' },
    });
    const perRecord = out.output.perRecord as unknown[];
    expect(perRecord).toHaveLength(3);
    const report = out.output.report as { totalChecked: number; hasCritical: boolean };
    expect(report.totalChecked).toBe(3);
    expect(report.hasCritical).toBe(false);
  });

  it('prescription-review：parallel 三路审核，无风险自动通过', async () => {
    const orch = createMockOrchestrator();
    registerToolMocks(orch.mocks.tools);
    registerKbs(orch, ['drug-instructions', 'clinical-guidelines']);
    orch.mocks.llm.script({
      passed: true,
      riskLevel: 'pass',
      problems: [],
      counsel: '规律服药，定期复查',
    });
    const agent = await loadAgent(orch, 'prescription-review');
    const out = await runWithAutoHuman(orch, agent, { patientId: 'P1' });
    expect(out.output.finalDecision).toBe('auto_passed');
    expect(out.output.riskLevel).toBe('pass');
  });
});
