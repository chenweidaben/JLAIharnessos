/**
 * 健澜科技杠OS - 示例：用编排内核加载并运行一个医疗智能体
 *
 * 本示例使用内置的确定性 Mock 运行时（无需真实 LLM / HIS 即可跑通），
 * 演示：加载 agents/ 下的 agent.yaml → 注册工具/知识库 → 运行工作流 →
 *       在“人工审核”节点挂起时由医生确认 → 得到最终输出。
 *
 * 运行：bun examples/orchestrate.ts
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { join } from 'node:path';
import {
  createMockOrchestrator,
  type MockOrchestrator,
} from '@/orchestrator/index.js';
import { loadAgentPackageFromDir } from '@/orchestrator/pack/directoryLoader.js';
import type { AgentDefinition } from '@/orchestrator/dsl/types.js';
import type { InMemoryHumanTaskHandler } from '@/orchestrator/engine/humanTaskHandler.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** 注册演示用的工具 Mock（真实部署时由 38 个医疗工具适配器提供） */
function registerDemoTools(orch: MockOrchestrator): void {
  const ok =
    (data: unknown) =>
    (): { success: true; data: unknown } => ({ success: true, data });

  orch.mocks.tools.registerTool(
    'get_patient_history',
    ok({ allergies: [], history: '2 型糖尿病病史 5 年' }),
    { readOnly: true },
  );
  orch.mocks.tools.registerTool(
    'get_lab_result',
    ok([{ item: '空腹血糖', value: 7.4, unit: 'mmol/L', abnormal: true }]),
    { readOnly: true },
  );
  orch.mocks.tools.registerTool(
    'get_image_report',
    ok({ reports: [] }),
    { readOnly: true },
  );
  orch.mocks.tools.registerTool(
    'search_medical_knowledge',
    ok({ context: '', results: [] }),
    { readOnly: true },
  );
  orch.mocks.tools.registerTool(
    'medical_record_quality_check',
    ok({ passed: true, score: 92, issues: [] }),
    { readOnly: true, riskLevel: 'low' },
  );
  orch.mocks.tools.registerTool(
    'sync_to_his',
    ok({ id: 'MR-NEW-001', synced: true }),
    { riskLevel: 'medium' },
  );
}

/** 轮询并自动通过人工审核节点（真实场景应由前端弹窗、医生 CA 签名后 resolve） */
async function autoApprove(human: InMemoryHumanTaskHandler): Promise<void> {
  for (const task of human.listPending()) {
    console.log('  ⏸  等待人工审核：', task.title);
    human.resolve(task.taskId, {
      taskId: task.taskId,
      approved: true,
      reviewerId: 'DR-DEMO-01',
      formData: { approved: true, confirmed: true },
    });
    console.log('  ✅ 医生已确认');
  }
}

async function main(): Promise<void> {
  // 1) 装配一个 Mock 编排器（生产环境用 createOrchestrator 注入真实 LLM/RAG/工具）
  const orch = createMockOrchestrator();
  registerDemoTools(orch);
  orch.mocks.rag.addKnowledgeBase('clinical-guidelines');
  orch.mocks.rag.addKnowledgeBase('medical-record-standards');
  // 告诉 Mock LLM 返回结构化病历
  orch.mocks.llm.script({
    chiefComplaint: '口干多饮 1 月',
    preliminaryDiagnosis: ['2 型糖尿病'],
    gaps: [],
  });

  // 2) 从目录加载“AI 电子病历生成”智能体包（agent.yaml + prompts）
  const agentsDir = join(process.cwd(), 'agents');
  const loaded = await loadAgentPackageFromDir(join(agentsDir, 'medical-record-writer'));
  const resolver = {
    hasTool: (n: string) => orch.mocks.tools.has(n),
    hasKnowledgeBase: (n: string) => orch.mocks.rag.hasKnowledgeBase(n),
    hasAgent: (a: string) => orch.registry.has(a),
  };
  const importResult = orch.packManager.importPackage(loaded.pkg, { resolver });
  if (importResult.validations.some((v) => !v.valid)) {
    throw new Error('智能体校验未通过：' + JSON.stringify(importResult.validations));
  }
  const agent: AgentDefinition = orch.registry.get('medical-record-writer')!;
  console.log('▶ 已加载智能体：', agent.name, agent.version);

  // 3) 运行工作流，遇到人工节点则审批，直到结束
  const pending = orch.invoker.run(
    agent,
    {
      patientId: 'P-DEMO-001',
      visitId: 'V-DEMO-001',
      chiefComplaint: '口干多饮 1 月',
      presentIllnessNotes: '多饮多尿伴体重下降',
    },
    { trigger: 'api' },
  ) as Promise<{ output: Record<string, unknown> }>;

  let result: { output: Record<string, unknown> } | undefined;
  let error: unknown;
  pending.then((r) => (result = r)).catch((e) => (error = e));
  for (let i = 0; i < 500 && !result && !error; i++) {
    await sleep(3);
    await autoApprove(orch.humanHandler);
  }
  if (error) throw error;
  if (!result) throw new Error('运行超时');

  // 4) 输出结果
  console.log('■ 最终输出：', JSON.stringify(result.output, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
