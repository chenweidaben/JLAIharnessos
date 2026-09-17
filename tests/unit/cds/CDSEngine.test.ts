/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - CDSEngine 与 CDSIntegration
 */

import { describe, it, expect } from 'bun:test';
import { CDSEngine } from '@/knowledge/cds/CDSEngine';
import { CDSIntegration } from '@/knowledge/cds/CDSIntegration';
import { drugRules } from '@/knowledge/cds/rules/drugRules.js';
import { labRules } from '@/knowledge/cds/rules/labRules.js';
import { ALL_CDS_RULES, TOTAL_RULE_COUNT } from '@/knowledge/cds/rules/ruleIndex.js';
import type { CdsFacts } from '@/knowledge/cds/Rule.js';

function facts(overrides: Partial<CdsFacts> = {}): CdsFacts {
  return {
    patientId: 'P001',
    allergies: [],
    currentDrugs: [],
    newDrugs: [],
    diagnoses: [],
    symptoms: [],
    signs: [],
    labResults: [],
    ...overrides,
  };
}

describe('CDSEngine', () => {
  it('应注册全部内置规则', () => {
    const engine = new CDSEngine();
    engine.registerRules(ALL_CDS_RULES);
    expect(engine.size).toBe(TOTAL_RULE_COUNT);
    expect(TOTAL_RULE_COUNT).toBeGreaterThan(30); // 药物15+ 检验15+ 诊疗11+
  });

  it('药物相互作用规则应触发（华法林+阿司匹林）', () => {
    const engine = new CDSEngine();
    engine.registerRules(drugRules);
    const result = engine.run(
      facts({ currentDrugs: ['华法林钠片'], newDrugs: ['阿司匹林肠溶片'] }),
      'prescription_create',
    );
    const hit = result.hits.find((h) => h.ruleId === 'DDI-001');
    expect(hit).toBeDefined();
    expect(hit?.level).toBe('critical');
    expect(result.maxLevel).toBe('critical');
  });

  it('青霉素过敏+阿莫西林应触发 block（passed=false）', () => {
    const engine = new CDSEngine();
    engine.registerRules(drugRules);
    const result = engine.run(
      facts({ allergies: ['青霉素'], newDrugs: ['阿莫西林胶囊'] }),
      'prescription_create',
    );
    expect(result.passed).toBe(false);
    expect(result.hits.some((h) => h.ruleId === 'ALL-001' && h.actionType === 'block')).toBe(true);
  });

  it('妊娠禁忌华法林应触发 block', () => {
    const engine = new CDSEngine();
    engine.registerRules(drugRules);
    const result = engine.run(
      facts({ pregnant: true, newDrugs: ['华法林钠片'] }),
      'prescription_create',
    );
    expect(result.passed).toBe(false);
    expect(result.hits.some((h) => h.ruleId === 'CONTRA-002')).toBe(true);
  });

  it('危急值：血钾 6.8 应触发 CRIT-001', () => {
    const engine = new CDSEngine();
    engine.registerRules(labRules);
    const result = engine.run(
      facts({ labResults: [{ itemName: '血钾', value: 6.8, unit: 'mmol/L' }] }),
      'lab_result_report',
    );
    expect(result.hits.some((h) => h.ruleId === 'CRIT-001')).toBe(true);
    expect(result.maxLevel).toBe('critical');
  });

  it('危急值：血糖 2.0 与肌钙蛋白 5.2 应同时触发', () => {
    const engine = new CDSEngine();
    engine.registerRules(labRules);
    const result = engine.run(
      facts({
        labResults: [
          { itemName: '血糖', value: 2.0, unit: 'mmol/L' },
          { itemName: '肌钙蛋白', value: 5.2, unit: 'ng/mL' },
        ],
      }),
      'lab_result_report',
    );
    expect(result.hits.some((h) => h.ruleId === 'CRIT-003')).toBe(true);
    expect(result.hits.some((h) => h.ruleId === 'CRIT-007')).toBe(true);
  });

  it('正常检验值不应触发危急值', () => {
    const engine = new CDSEngine();
    engine.registerRules(labRules);
    const result = engine.run(
      facts({ labResults: [{ itemName: '血钾', value: 4.2, unit: 'mmol/L' }] }),
      'lab_result_report',
    );
    expect(result.hits.length).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('禁用规则不应参与评估', () => {
    const engine = new CDSEngine();
    engine.registerRules(labRules);
    engine.disableRule('CRIT-001');
    const result = engine.run(
      facts({ labResults: [{ itemName: '血钾', value: 6.8, unit: 'mmol/L' }] }),
      'lab_result_report',
    );
    expect(result.hits.some((h) => h.ruleId === 'CRIT-001')).toBe(false);
  });

  it('结果应包含免责声明', () => {
    const engine = new CDSEngine();
    engine.registerRules(drugRules);
    const result = engine.run(facts({ allergies: ['青霉素'], newDrugs: ['阿莫西林'] }), 'prescription_create');
    expect(result.disclaimer).toContain('仅供参考');
  });
});

describe('CDSIntegration', () => {
  it('block 规则未经 override 时不允许通过', () => {
    const integration = new CDSIntegration();
    const result = integration.checkBeforePrescription(
      facts({ allergies: ['青霉素'], newDrugs: ['阿莫西林'] }),
    );
    expect(result.passed).toBe(false);
    // 未提供 override → 不允许
    expect(integration.resolveOverrides(result, [])).toBe(false);
  });

  it('医生 override 后允许继续', () => {
    const integration = new CDSIntegration();
    const result = integration.checkBeforePrescription(
      facts({ allergies: ['青霉素'], newDrugs: ['阿莫西林'] }),
    );
    const blockedId = result.hits.find((h) => h.actionType === 'block')!.ruleId;
    const allowed = integration.resolveOverrides(result, [
      { ruleId: blockedId, confirmed: true, reason: '已充分知情', doctorId: 'doc1' },
    ]);
    expect(allowed).toBe(true);
  });

  it('应构建可注入 Agent 上下文的提示片段', () => {
    const integration = new CDSIntegration();
    const result = integration.checkLabResult(
      facts({ labResults: [{ itemName: '血糖', value: 2.0 }] }),
    );
    const injection = integration.buildContextInjection(result);
    expect(injection.triggered).toBe(true);
    expect(injection.promptSnippet).toContain('CDS');
  });

  it('规则库版本与加载数量一致', () => {
    const integration = new CDSIntegration();
    expect(integration.loadedRuleCount).toBe(TOTAL_RULE_COUNT);
    expect(typeof integration.rulesetVersion).toBe('string');
  });
});
