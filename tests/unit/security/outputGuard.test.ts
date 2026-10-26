/**
 * 健澜AI原生医院操作系统OS - 输出侧校验器单元测试
 *
 * 版权所有 (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, test } from 'bun:test';
import {
  guardOutbound,
  OutboundGuard,
  type OutboundContext,
} from '../../../src/security';

function baseCtx(overrides: Partial<OutboundContext> = {}): OutboundContext {
  return {
    traceId: 'trace-test-001',
    agentId: 'medical-record-writer',
    agentVersion: '0.1.0',
    facts: {
      patientName: '王秀兰',
      age: 58,
      gender: '女',
      diagnoses: ['冠心病待查'],
      medications: ['阿司匹林'],
    },
    citations: [{ refId: '1', chunkId: 'c1', title: '心血管内科诊疗指南' }],
    output:
      '患者女性，58岁，主诉反复胸闷一周，现病史：劳累后加重，休息后缓解。结合门诊资料[1]，考虑冠心病可能，建议完善心电图与心肌酶谱检查。',
    structuredPayload: { chiefComplaint: '反复胸闷一周', presentIllness: '劳累后加重' },
    requiredFields: ['chiefComplaint', 'presentIllness'],
    evidenceLevel: 'supported',
    riskLevel: 'medium',
    role: 'writer',
    ...overrides,
  };
}

describe('OutboundGuard - 正常规范输出通过', () => {
  test('事实一致、引用完整、无红线时判定 PASS', () => {
    const verdict = guardOutbound(baseCtx());
    expect(verdict.level).toBe('PASS');
    expect(verdict.findings).toHaveLength(0);
    expect(verdict.sanitizedOutput).toBe(baseCtx().output);
    expect(verdict.retryable).toBe(false);
  });

  test('便捷函数与实例方法结论一致', () => {
    const a = guardOutbound(baseCtx());
    const b = new OutboundGuard().guard(baseCtx());
    expect(a.level).toBe(b.level);
    expect(a.findings).toHaveLength(b.findings.length);
  });
});

describe('OutboundGuard - fictional-identity 虚构身份', () => {
  test('年龄与事实快照不一致判定 BLOCK', () => {
    const verdict = guardOutbound(
      baseCtx({ output: '患者女性，45岁，主诉头晕一周。结合门诊资料[1]建议测量血压。' }),
    );
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.findings.some((f) => f.rule === 'fictional-identity')).toBe(true);
    expect(verdict.blockedReason).toBeTruthy();
    expect(verdict.sanitizedOutput).toBe('');
  });

  test('姓名不在事实快照范围判定 BLOCK', () => {
    const verdict = guardOutbound(
      baseCtx({ output: '患者李建国，58岁，男性。结合门诊资料[1]建议随访。' }),
    );
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.findings.some((f) => f.rule === 'fictional-identity' && f.severity === 'block')).toBe(true);
  });

  test('快照缺少姓名来源却断言身份判定 BLOCK', () => {
    const verdict = guardOutbound(
      baseCtx({
        facts: { age: 58, gender: '女' },
        output: '患者张敏，女性，主诉乏力。结合资料[1]建议休息。',
      }),
    );
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.findings.some((f) => f.rule === 'fictional-identity')).toBe(true);
  });
});

describe('OutboundGuard - certainty-redline 确定性诊断红线', () => {
  test('writer 角色确定性表述判定 BLOCK', () => {
    const verdict = guardOutbound(
      baseCtx({
        output: '患者确诊为肺癌，必须立即手术切除。结合检查[1]建议住院。',
        citations: [],
        evidenceLevel: 'none',
      }),
    );
    expect(verdict.level).toBe('BLOCK');
    expect(
      verdict.findings.some((f) => f.rule === 'certainty-redline' && f.severity === 'block'),
    ).toBe(true);
  });

  test('qc 质控角色豁免确定性红线规则', () => {
    const verdict = guardOutbound(
      baseCtx({
        role: 'qc',
        output: '病历中出现"确诊为肺癌"表述，需医师复核。',
        evidenceLevel: 'supported',
      }),
    );
    expect(verdict.findings.some((f) => f.rule === 'certainty-redline')).toBe(false);
  });
});

describe('OutboundGuard - sensitive-redline 敏感承诺红线', () => {
  test('商业承诺表述判定 BLOCK', () => {
    const verdict = guardOutbound(
      baseCtx({
        output: '本院方案包治该类疾病，推荐购买指定品牌药品，疗效百分之百。',
        citations: [],
        evidenceLevel: 'none',
      }),
    );
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.findings.some((f) => f.rule === 'sensitive-redline')).toBe(true);
  });

  test('追加自定义敏感词表生效', () => {
    const guard = new OutboundGuard({ sensitiveOverrides: [/祖传秘方/] });
    const verdict = guard.guard(
      baseCtx({ output: '该疾病可用祖传秘方根治，建议购买。', citations: [], evidenceLevel: 'none' }),
    );
    expect(verdict.findings.some((f) => f.rule === 'sensitive-redline')).toBe(true);
  });
});

describe('OutboundGuard - contradiction 事实矛盾', () => {
  test('否认快照已记录诊断判定 CAUTION', () => {
    const verdict = guardOutbound(
      baseCtx({
        facts: { ...baseCtx().facts, diagnoses: ['2型糖尿病'] },
        output: '病史采集排除2型糖尿病。结合门诊资料[1]建议复查空腹血糖。',
      }),
    );
    expect(verdict.level).toBe('CAUTION');
    const finding = verdict.findings.find((f) => f.rule === 'contradiction');
    expect(finding?.severity).toBe('caution');
    expect(verdict.sanitizedOutput).toContain('待核实');
  });

  test('否认快照在用药物判定 CAUTION', () => {
    const verdict = guardOutbound(
      baseCtx({
        output: '患者目前未服用阿司匹林。结合门诊资料[1]建议评估用药。',
        facts: { ...baseCtx().facts, diagnoses: [] },
      }),
    );
    expect(verdict.findings.some((f) => f.rule === 'contradiction' && f.message.includes('阿司匹林'))).toBe(true);
  });
});

describe('OutboundGuard - schema-shape 结构校验', () => {
  test('缺失必填字段判定 CAUTION 且可重试', () => {
    const verdict = guardOutbound(
      baseCtx({ structuredPayload: { chiefComplaint: '' }, requiredFields: ['chiefComplaint', 'presentIllness'] }),
    );
    expect(verdict.level).toBe('CAUTION');
    const finding = verdict.findings.find((f) => f.rule === 'schema-shape');
    expect(finding?.severity).toBe('caution');
    expect(verdict.retryable).toBe(true);
  });

  test('重试两次后仍缺失必填升级 BLOCK', () => {
    const verdict = guardOutbound(
      baseCtx({
        structuredPayload: {},
        requiredFields: ['chiefComplaint', 'presentIllness'],
        schemaFailures: 2,
      }),
    );
    expect(verdict.level).toBe('BLOCK');
    const finding = verdict.findings.find((f) => f.rule === 'schema-shape');
    expect(finding?.severity).toBe('block');
    expect(verdict.retryable).toBe(false);
  });
});

describe('OutboundGuard - unsupported-claim 无依据结论', () => {
  test('无证据且诊断建议句无引用判定 BLOCK', () => {
    const verdict = guardOutbound(
      baseCtx({
        citations: [],
        evidenceLevel: 'none',
        output: '诊断考虑急性阑尾炎，建议手术切除。患者一般情况尚可。',
      }),
    );
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.findings.some((f) => f.rule === 'unsupported-claim' && f.severity === 'block')).toBe(true);
  });

  test('已有引用但结论句未标注编号判定 CAUTION', () => {
    const verdict = guardOutbound(
      baseCtx({ output: '建议完善腹部超声检查。患者一般情况可，既往体健[1]。' }),
    );
    expect(verdict.level).toBe('CAUTION');
    expect(verdict.findings.some((f) => f.rule === 'unsupported-claim' && f.severity === 'caution')).toBe(true);
  });
});

describe('OutboundGuard - format-completeness 要素完整性', () => {
  test('缺少必备章节关键词判定 CAUTION', () => {
    const verdict = guardOutbound(
      baseCtx({ expectedSections: ['主诉', '现病史', '既往史'], output: '主诉胸闷一周，现病史劳累后加重。' }),
    );
    expect(verdict.level).toBe('CAUTION');
    const finding = verdict.findings.find((f) => f.rule === 'format-completeness');
    expect(finding?.message).toContain('既往史');
  });
});

describe('OutboundGuard - 规则配置与聚合', () => {
  test('禁用规则后不再产生对应发现', () => {
    const guard = new OutboundGuard({ disabledRules: ['certainty-redline', 'sensitive-redline'] });
    const verdict = guard.guard(
      baseCtx({
        output: '患者确诊为肺癌，包治百病。建议随访。',
        citations: [],
        evidenceLevel: 'none',
      }),
    );
    expect(verdict.findings.some((f) => f.rule === 'certainty-redline')).toBe(false);
    expect(verdict.findings.some((f) => f.rule === 'sensitive-redline')).toBe(false);
  });

  test('同时存在 BLOCK 与 CAUTION 时取 BLOCK 级别', () => {
    const verdict = guardOutbound(
      baseCtx({
        output: '患者男性，确诊肺癌。既往史：高血压病史。建议进一步检查。',
        citations: [],
        evidenceLevel: 'none',
        expectedSections: ['主诉'],
      }),
    );
    expect(verdict.level).toBe('BLOCK');
    expect(verdict.findings.some((f) => f.severity === 'block')).toBe(true);
  });
});
