/**
 * 单元测试 - 角色共享支撑工具：证据构造与角色展示名（补基线未覆盖分支）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖基线未覆盖行：
 * - roleSupport.ts 31-36：makeEvidence 标准化证据条目构造
 * - roleSupport.ts 41-53：roleDisplayName 全角色展示名映射
 */

import { describe, expect, it } from 'bun:test';

import { makeEvidence, roleDisplayName } from '../../../src/core/agent/consult/roleSupport';
import type { EvidenceItem, RoleKind } from '../../../src/core/agent/consult/types';

describe('roleSupport 证据构造 makeEvidence（基线 31-36 行）', () => {
  it('kind / label / source / snippet 四字段按入参原样透传', () => {
    const evidence = makeEvidence(
      'knowledge',
      '普通感冒与咳嗽科普',
      '知识库 DEMO 条目',
      '普通感冒多由病毒引起，常见表现为鼻塞、流涕、咳嗽。',
    );

    expect(evidence.kind).toBe('knowledge');
    expect(evidence.label).toBe('普通感冒与咳嗽科普');
    expect(evidence.source).toBe('知识库 DEMO 条目');
    expect(evidence.snippet).toBe('普通感冒多由病毒引起，常见表现为鼻塞、流涕、咳嗽。');
  });

  it('六种证据分类均可经 makeEvidence 构造并保持 kind 不被改写', () => {
    const kinds: EvidenceItem['kind'][] = [
      'knowledge',
      'drug',
      'allergy',
      'interaction',
      'history',
      'document',
    ];

    for (const kind of kinds) {
      const evidence = makeEvidence(kind, '证据标签', '证据来源', '证据摘要');
      expect(evidence.kind).toBe(kind);
      expect(evidence.label).toBe('证据标签');
      expect(evidence.source).toBe('证据来源');
      expect(evidence.snippet).toBe('证据摘要');
    }
  });
});

describe('roleSupport 角色展示名 roleDisplayName（基线 41-53 行）', () => {
  it('四角色展示名与系统 / 用户标识按契约中文映射正确', () => {
    const mappings: [RoleKind | 'system' | 'user', string][] = [
      ['supervisor', '分诊主管'],
      ['examiner', '问诊追问'],
      ['doctor', '医师'],
      ['pharmacist', '药师'],
      ['system', '系统'],
      ['user', '用户'],
    ];

    for (const [role, displayName] of mappings) {
      expect(roleDisplayName(role)).toBe(displayName);
    }
  });
});
