/**
 * 健澜AI原生医院操作系统OS — A20 证据守卫离线判定单元测试
 *
 * 覆盖：none 级别强制拒答模板与拒答标记、候选主张无引用阻断、partial 保留引用阻断、
 * supported 放行、审计快照不含患者正文且字段结构可交 S-08 审计事件。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';

import {
  guardEvidenceAnswer,
  type EvidenceGuardInput,
} from '@/knowledge-platform/citation/evidenceGuard.js';
import type { CitationHit, CitedAnswer } from '@/knowledge-platform/citation/citationProtocol.js';

function makeHit(overrides: Partial<CitationHit> = {}): CitationHit {
  return {
    chunkId: 'chunk-001',
    title: '血压控制指南',
    sectionPath: '第二章 高血压诊疗',
    provenance: {
      sourceId: 'std-bp-2026',
      sourceName: '中国高血压防治指南 2026 版',
      license: 'internal',
      fetchedAt: '2026-09-20T00:00:00.000Z',
    },
    pageRef: '12',
    effectiveDate: '2026-01-01T00:00:00.000Z',
    score: 0.86,
    quotedExcerpt: '血压控制目标一般为 140/90 mmHg 以下。',
    ...overrides,
  };
}

const REVIEWED_AT = '2026-10-27T01:30:00.000Z';

describe('guardEvidenceAnswer - none 级别强制拒答', () => {
  it('命中为空时阻断放行，采用拒答模板，附拒答标记且模板不含确定性诊断措辞', () => {
    const result = guardEvidenceAnswer({ question: '胸痛三天需要排查哪些疾病？', now: REVIEWED_AT });
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('NONE_EVIDENCE');
    expect(result.level).toBe('none');
    expect(result.markedNoEvidence).toBe(true);
    expect(result.answer.evidenceLevel).toBe('none');
    expect(result.answer.citations).toEqual([]);
    expect(result.answer.content).toContain('待核实');
    expect(result.answer.content).toContain('无法给出确定性结论');
    expect(result.answer.content).not.toContain('确诊');
    expect(result.answer.content).not.toContain('诊断为');
  });

  it('审计快照仅留计数 / chunkId 清单 / 级别与原因码，不携带患者正文', () => {
    const result = guardEvidenceAnswer({ hits: [], question: '患者自述胸痛三小时' });
    const snapshot = result.auditSnapshot;
    expect(snapshot.level).toBe('none');
    expect(snapshot.hitCount).toBe(0);
    expect(snapshot.citationCount).toBe(0);
    expect(snapshot.chunkIds).toEqual([]);
    expect(snapshot.reasonCode).toBe('NONE_EVIDENCE');
    expect(snapshot.markedNoEvidence).toBe(true);
    expect(Object.keys(snapshot)).not.toContain('content');
    expect(Object.keys(snapshot)).not.toContain('question');
    expect(snapshot.reviewedAt).toBeUndefined();
  });

  it('传入 now 时间戳时快照留痕 reviewedAt', () => {
    const result = guardEvidenceAnswer({ hits: [], now: REVIEWED_AT });
    expect(result.auditSnapshot.reviewedAt).toBe(REVIEWED_AT);
  });
});

describe('guardEvidenceAnswer - 候选主张无引用阻断', () => {
  it('候选答案有正文但未附引用编号时阻断，改用拒答模板', () => {
    const candidate: CitedAnswer = {
      content: '该患者可直接诊断为心肌梗死并开具阿司匹林。',
      citations: [],
      missingInfo: [],
      evidenceLevel: 'supported',
    };
    const result = guardEvidenceAnswer({ hits: [makeHit()], candidateAnswer: candidate });
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('NO_CITATION_FOR_CLAIM');
    expect(result.markedNoEvidence).toBe(true);
    expect(result.answer.citations).toEqual([]);
    expect(result.answer.content).toContain('待核实');
  });
});

describe('guardEvidenceAnswer - partial 级别阻断并保留引用', () => {
  it('存在待补充资料时阻断放行，引用条目透传，原因码 PARTIAL_EVIDENCE', () => {
    const candidate: CitedAnswer = {
      content: '血压控制目标一般为 140/90 mmHg 以下[1]。',
      citations: [
        {
          refId: '[1]',
          chunkId: 'chunk-001',
          title: '血压控制指南',
          sectionPath: '第二章 高血压诊疗',
          sourceName: '中国高血压防治指南 2026 版',
          quotedExcerpt: '血压控制目标一般为 140/90 mmHg 以下。',
        },
      ],
      missingInfo: ['待补充检验参考范围'],
      evidenceLevel: 'partial',
    };
    const result = guardEvidenceAnswer({
      hits: [makeHit()],
      candidateAnswer: candidate,
      missingInfo: ['待补充检验参考范围'],
    });
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('PARTIAL_EVIDENCE');
    expect(result.level).toBe('partial');
    expect(result.citations).toHaveLength(1);
    expect(result.auditSnapshot.citationCount).toBe(1);
    expect(result.auditSnapshot.chunkIds).toEqual(['chunk-001']);
  });
});

describe('guardEvidenceAnswer - supported 放行', () => {
  it('命中齐全且候选答案附引用时放行，快照计数与 chunkId 清单一致', () => {
    const candidate: CitedAnswer = {
      content: '血压控制目标一般为 140/90 mmHg 以下[1]。',
      citations: [
        {
          refId: '[1]',
          chunkId: 'chunk-001',
          title: '血压控制指南',
          sectionPath: '第二章 高血压诊疗',
          sourceName: '中国高血压防治指南 2026 版',
          quotedExcerpt: '血压控制目标一般为 140/90 mmHg 以下。',
        },
      ],
      missingInfo: [],
      evidenceLevel: 'supported',
    };
    const result = guardEvidenceAnswer({ hits: [makeHit()], candidateAnswer: candidate });
    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('SUPPORTED');
    expect(result.level).toBe('supported');
    expect(result.auditSnapshot.hitCount).toBe(1);
    expect(result.auditSnapshot.citationCount).toBe(1);
    expect(result.auditSnapshot.markedNoEvidence).toBe(false);
  });

  it('未传候选答案时由守卫装配引用条目并放行 supported', () => {
    const result = guardEvidenceAnswer({ hits: [makeHit()] });
    expect(result.allowed).toBe(true);
    expect(result.citations).toHaveLength(1);
    expect(result.answer.evidenceLevel).toBe('supported');
  });

  it('空入参按空台账处理，不抛错', () => {
    const result = guardEvidenceAnswer({} satisfies EvidenceGuardInput);
    expect(result.allowed).toBe(false);
    expect(result.level).toBe('none');
  });
});
