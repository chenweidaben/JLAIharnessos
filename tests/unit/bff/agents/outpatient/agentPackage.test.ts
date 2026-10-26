/**
 * S-09 门诊病历智能体声明包 DSL 校验单测（4.2 节 + gap C-01/S-09）
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

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PACKAGE_DIR = join(__dirname, '..', '..', '..', '..', '..', 'agents', 'medical-record-outpatient');

const EXPECTED_TOOLS = [
  'get_patient_profile',
  'get_visit_history',
  'get_recent_exams',
  'get_medication_list',
  'kb_search',
  'icd_lookup',
  'submit_outpatient_draft',
  'raise_qc_alert',
];

const EXPECTED_KNOWLEDGE = ['writing-standard', 'clinical-guide', 'data-standard', 'hospital-policy'];

const EXPECTED_NODE_IDS = [
  'start',
  'intent_classify',
  'fetch_patient',
  'fetch_records',
  'rag_guidelines',
  'dialogue_normalize',
  'outline',
  'draft_sections',
  'qc_realtime',
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

describe('门诊病历智能体声明包 medical-record-outpatient', () => {
  it('元数据、角色、风险等级与免责声明符合 4.2 契约', async () => {
    const { agent } = await loadPackage();
    expect(agent.id).toBe('medical-record-outpatient');
    expect(agent.name).toBe('门诊病历智能体');
    expect(agent.riskLevel).toBe('medium');
    expect(agent.allowedRoles).toEqual(['doctor']);
    expect(agent.entryWorkflow).toBe('outpatient-main');
    expect(agent.disclaimer.length).toBeGreaterThan(0);
    expect(agent.systemPrompt).toBe('prompts/system.md');
  });

  it('工具集与知识域绑定完整', async () => {
    const { agent } = await loadPackage();
    expect(agent.tools).toEqual(EXPECTED_TOOLS);
    expect(agent.knowledgeBases).toEqual(EXPECTED_KNOWLEDGE);
  });

  it('DAG 节点覆盖 4.2.3 主路径，入口工作流可定位', async () => {
    const { agent } = await loadPackage();
    const workflow = agent.workflows.find((w) => w.meta.id === agent.entryWorkflow);
    expect(workflow).toBeTruthy();
    const nodeIds = workflow!.nodes.map((node) => node.id);
    for (const id of EXPECTED_NODE_IDS) {
      expect(nodeIds).toContain(id);
    }
    const edgeSources = workflow!.edges.map((edge) => edge.source);
    expect(edgeSources).toContain('qc_realtime');
    expect(workflow!.edges.some((edge) => edge.target === 'revise_loop')).toBe(true);
  });

  it('包通过 DSL 结构与语义校验，校验和有效', async () => {
    const { result } = await loadPackage();
    expect(result.checksumValid).toBe(true);
    const allIssues = result.validations.flatMap((v) => v.issues);
    expect(allIssues).toEqual([]);
  });
});
