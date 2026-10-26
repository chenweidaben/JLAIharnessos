/**
 * S-10 住院病历智能体声明包 DSL 校验单测（4.3 节 + gap C-02/S-10）
 *
 * 独立成包校验：agent.yaml 结构、工具 / 知识绑定、DAG 节点与边集合通过 DSL 结构与语义校验；
 * 本包未登记 manifest 目录清单，目录加载器不挂接，校验由本测试独立完成。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDslText } from '@/orchestrator/dsl/loader.js';
import { parseAgent } from '@/orchestrator/dsl/schema.js';
import { AgentPackManager } from '@/orchestrator/pack/AgentPackManager.js';
import { AgentRegistry } from '@/orchestrator/agent/AgentRegistry.js';
import { WorkflowNodeType } from '@/orchestrator/dsl/types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PACKAGE_DIR = join(__dirname, '..', '..', '..', '..', '..', 'agents', 'medical-record-inpatient');

const EXPECTED_TOOLS = [
  'get_inpatient_context',
  'get_order_list',
  'get_exam_results',
  'get_nursing_notes',
  'voice_to_vitals',
  'kb_search',
  'icd_lookup',
  'submit_inpatient_draft',
  'schedule_timeline_check',
];

const EXPECTED_KNOWLEDGE = ['writing-standard', 'clinical-guide', 'data-standard', 'hospital-policy'];

const EXPECTED_NODE_IDS = [
  'start',
  'fetch_inpatient_context',
  'fetch_parallel',
  'fetch_orders',
  'fetch_exam_results',
  'fetch_nursing_notes',
  'voice_to_vitals',
  'rag_standards',
  'choose_document_type',
  'summary_or_outline',
  'draft_sections',
  'schedule_timeline_check',
  'consistency_check',
  'revise_loop',
  'revise_draft',
  'output_guard',
  'human_review',
  'write_record',
  'end',
];

async function loadPackage() {
  const yamlText = await readFile(join(PACKAGE_DIR, 'agent.yaml'), 'utf8');
  const manifest = parseDslText(yamlText, 'yaml');
  const agent = parseAgent(manifest);
  const systemPrompt = await readFile(join(PACKAGE_DIR, 'prompts', 'system.md'), 'utf8');
  const pm = new AgentPackManager(new AgentRegistry());
  const pkg = pm.exportPackage(agent, { prompts: { 'prompts/system.md': systemPrompt } });
  const resolver = {
    hasTool: (name: string) => EXPECTED_TOOLS.includes(name),
    hasKnowledgeBase: () => true,
    hasAgent: () => true,
  };
  const result = pm.importPackage(pkg, { resolver });
  return { agent, result };
}

describe('住院病历智能体声明包 medical-record-inpatient', () => {
  it('元数据、角色、风险等级与免责声明符合 4.3 契约', async () => {
    const { agent } = await loadPackage();
    expect(agent.id).toBe('medical-record-inpatient');
    expect(agent.name).toBe('住院病历智能体');
    expect(agent.riskLevel).toBe('medium');
    expect(agent.allowedRoles).toEqual(['doctor']);
    expect(agent.entryWorkflow).toBe('inpatient-main');
    expect(agent.disclaimer.length).toBeGreaterThan(0);
    expect(agent.systemPrompt).toBe('prompts/system.md');
  });

  it('工具集与知识域绑定完整，写工具仅 submit_inpatient_draft', async () => {
    const { agent } = await loadPackage();
    expect(agent.tools).toEqual(EXPECTED_TOOLS);
    expect(agent.knowledgeBases).toEqual(EXPECTED_KNOWLEDGE);
    expect(agent.tools.filter((tool) => tool.startsWith('submit'))).toEqual(['submit_inpatient_draft']);
  });

  it('DAG 节点覆盖 4.3.2 主路径，七类文书条件分支可定位', async () => {
    const { agent } = await loadPackage();
    const workflow = agent.workflows.find((workflow) => workflow.meta.id === agent.entryWorkflow);
    expect(workflow).toBeTruthy();
    const nodeIds = workflow!.nodes.map((node) => node.id);
    for (const id of EXPECTED_NODE_IDS) {
      expect(nodeIds).toContain(id);
    }
    const chooseNode = workflow!.nodes.find((node) => node.id === 'choose_document_type');
    expect(chooseNode?.type).toBe(WorkflowNodeType.CONDITION);
    const cases = (chooseNode?.config as { cases?: Record<string, string> }).cases ?? {};
    expect(Object.keys(cases)).toEqual([
      'admission-record',
      'first-progress',
      'daily-progress',
      'senior-round',
      'stage-summary',
      'discharge-record',
      'comprehensive-analysis',
    ]);
    expect(workflow!.edges.some((edge) => edge.source === 'consistency_check' && edge.target === 'revise_loop')).toBe(true);
  });

  it('包通过 DSL 结构与语义校验，校验和有效', async () => {
    const { result } = await loadPackage();
    expect(result.checksumValid).toBe(true);
    const allIssues = result.validations.flatMap((validation) => validation.issues);
    expect(allIssues).toEqual([]);
  });

  it('README、系统提示词与合成示例输入齐全；新包未登记 manifest 目录清单', async () => {
    const readme = await readFile(join(PACKAGE_DIR, 'README.md'), 'utf8');
    const systemPrompt = await readFile(join(PACKAGE_DIR, 'prompts', 'system.md'), 'utf8');
    const exampleText = await readFile(join(PACKAGE_DIR, 'examples', 'input.json'), 'utf8');
    const example = JSON.parse(exampleText) as { patientId: string; visitId: string; documentType: string };
    expect(readme).toContain('medical-record-inpatient');
    expect(systemPrompt).toContain('上级医师');
    expect(example.patientId).toBe('patient-demo-001');
    expect(example.visitId).toBe('visit-demo-001');
    expect(example.documentType).toBe('daily-progress');

    const manifestText = await readFile(join(__dirname, '..', '..', '..', '..', '..', 'agents', 'manifest.json'), 'utf8');
    expect(manifestText).not.toContain('medical-record-inpatient');
  });
});
