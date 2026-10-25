/**
 * 单元测试 - DEMO 种子与规则快照完整性（契约 §0 demo/demoSeed.ts）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  buildRulesSnapshot,
  BUILTIN_TOOL_META,
  CONSULT_PERMISSIONS,
  DEMO_GREETING,
  ROLE_GUIDANCE,
  SAMPLE_DRUG_FACTS,
  SAMPLE_KNOWLEDGE,
} from '../../../src/core/agent/consult/demo/demoSeed';
import { createDefaultToolRegistry } from '../../../src/core/agent/consult/tools/toolRegistry';
import type { RoleKind } from '../../../src/core/agent/consult/types';
import { ACUTE_GUIDANCE, DISCLAIMER } from '../../../src/core/agent/consult/types';

describe('demoSeed DEMO 种子', () => {
  it('规则快照包含版本号、免责声明、急症引导与急症词表', () => {
    const snapshot = buildRulesSnapshot();
    expect(snapshot.version).toBe('m86-demo');
    expect(snapshot.disclaimer).toBe(DISCLAIMER);
    expect(snapshot.acuteGuidance).toBe(ACUTE_GUIDANCE);
    expect(snapshot.acuteKeywords.length).toBeGreaterThanOrEqual(38);
  });

  it('规则快照登记五个内置工具且与注册表清单一致', () => {
    const snapshot = buildRulesSnapshot();
    expect(snapshot.tools.length).toBe(5);
    const registryNames = createDefaultToolRegistry()
      .list()
      .map((tool) => tool.name);
    const snapshotNames = snapshot.tools.map((tool) => tool.name);
    expect(snapshotNames).toEqual(registryNames);
    expect(BUILTIN_TOOL_META.map((tool) => tool.name)).toEqual(snapshotNames);
  });

  it('规则快照登记三条权限码', () => {
    expect(CONSULT_PERMISSIONS.READ).toBe('consult-agent:read');
    expect(CONSULT_PERMISSIONS.WRITE).toBe('consult-agent:write');
    expect(CONSULT_PERMISSIONS.AUDIT).toBe('consult-agent:audit');
    expect(buildRulesSnapshot().permissions).toEqual(CONSULT_PERMISSIONS);
  });

  it('DEMO 欢迎语非空且不产生临床结论', () => {
    expect(DEMO_GREETING.length).toBeGreaterThan(20);
    expect(DEMO_GREETING).toContain('120');
  });

  it('四角色引导文案齐全', () => {
    const roles: RoleKind[] = ['supervisor', 'examiner', 'doctor', 'pharmacist'];
    for (const role of roles) {
      expect(ROLE_GUIDANCE[role].length).toBeGreaterThan(0);
    }
  });

  it('知识库与药品 DEMO 条目齐全且不构成处方结论', () => {
    expect(SAMPLE_KNOWLEDGE.length).toBeGreaterThanOrEqual(3);
    expect(SAMPLE_DRUG_FACTS.length).toBeGreaterThanOrEqual(2);
    for (const sample of SAMPLE_DRUG_FACTS) {
      expect(sample.snippet.length).toBeGreaterThan(20);
      expect(sample.snippet).toMatch(/医师|药师|医嘱|处方/);
    }
  });
});
