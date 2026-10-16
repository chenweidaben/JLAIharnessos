/**
 * 健澜科技 jlmedaios - M179-C 【护理院感医保药事】医院医保管理深化纯函数单测。
 *
 * 不依赖数据库：仅测 auditInsuranceClaim / predictRejectionRisk /
 *   buildDeepInsuranceMgmt / generateInsuranceReport。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  auditInsuranceClaim,
  buildDeepInsuranceMgmt,
  generateInsuranceReport,
  predictRejectionRisk,
  type InsuranceClaim,
  type RejectionCase,
} from '@/bff/aggregators/insuranceDeepAggregator';

/** 合规单：全甲类，无审批问题 */
const CLAIM_PASS: InsuranceClaim = {
  claimId: 'c-pass', visitId: 'v1', type: 'inpatient', hasPriorAuth: true, losDays: 7,
  items: [
    { code: 'D-A001', name: '阿司匹林肠溶片', amount: 60 },
    { code: 'T-A001', name: '血常规检查', amount: 30 },
    { code: 'F-A001', name: '普通病房床位费', amount: 350 },
  ],
};

/** 高风险单：乙类高值药缺事前审批 */
const CLAIM_HIGH: InsuranceClaim = {
  claimId: 'c-high', visitId: 'v2', type: 'inpatient', hasPriorAuth: false, losDays: 10,
  items: [
    { code: 'D-B002', name: '靶向抗肿瘤药（限制适应症）', amount: 12000 },
    { code: 'T-B001', name: 'CT 平扫', amount: 300 },
  ],
};

/** 中风险单：重复收费 + 目录外 + 自费占比高 */
const CLAIM_WARN: InsuranceClaim = {
  claimId: 'c-warn', visitId: 'v3', type: 'outpatient', hasPriorAuth: true,
  items: [
    { code: 'D-B001', name: '注射用头孢克肟', amount: 120, repeated: true },
    { code: 'T-C001', name: '特需门诊服务', amount: 200 },
  ],
};

describe('auditInsuranceClaim 费用审核', () => {
  it('全甲类：全额纳入统筹、自费为 0、verdict=pass', () => {
    const r = auditInsuranceClaim(CLAIM_PASS);
    expect(r.totalAmount).toBe(440);
    expect(r.insuranceBase).toBe(440);
    expect(r.selfPayAmount).toBe(0);
    expect(r.selfPayRatio).toBe(0);
    expect(r.verdict).toBe('pass');
    expect(r.maxSeverity).toBe('none');
    expect(r.issues).toHaveLength(0);
  });

  it('乙类先行自付：靶向药自付10%=1200、CT自付8%=24，缺事前审批→high/reject_suggest', () => {
    const r = auditInsuranceClaim(CLAIM_HIGH);
    expect(r.totalAmount).toBe(12300);
    expect(r.selfPayAmount).toBe(1224);
    expect(r.insuranceBase).toBe(11076);
    expect(r.verdict).toBe('reject_suggest');
    expect(r.maxSeverity).toBe('high');
    const types = r.issues.map((i) => i.type);
    expect(types).toContain('missing_prior_auth');
  });

  it('丙类目录外全自费 + 重复收费 + 自费占比偏高 → 4 个问题，verdict=warn', () => {
    const r = auditInsuranceClaim(CLAIM_WARN);
    expect(r.totalAmount).toBe(320);
    expect(r.selfPayAmount).toBe(212); // 头孢自付12 + 特需全自费200
    expect(r.insuranceBase).toBe(108);
    expect(r.selfPayRatio).toBe(0.663);
    expect(r.issues).toHaveLength(4);
    expect(r.verdict).toBe('warn');
    const types = r.issues.map((i) => i.type).sort();
    expect(types).toContain('duplicate_charge');
    expect(types).toContain('out_of_catalog');
  });

  it('空 items / 非法输入安全降级，不抛错', () => {
    const r = auditInsuranceClaim({ claimId: 'c-x', visitId: 'v', type: 'outpatient', items: [] });
    expect(r.totalAmount).toBe(0);
    expect(r.verdict).toBe('pass');
  });
});

describe('predictRejectionRisk 拒付风险预测', () => {
  it('合规单：score=0、level=low、无风险因子', () => {
    const r = predictRejectionRisk(CLAIM_PASS);
    expect(r.riskScore).toBe(0);
    expect(r.level).toBe('low');
    expect(r.factors).toHaveLength(0);
  });

  it('缺事前审批：命中高值审批因子 +30，score=30、level=medium', () => {
    const r = predictRejectionRisk(CLAIM_HIGH);
    expect(r.riskScore).toBe(30);
    expect(r.level).toBe('medium');
    expect(r.factors.map((f) => f.factor).join()).toContain('事前审批');
  });

  it('目录外占比高 + 重复收费 + 自费占比高：score=30+25+10=65、level=high', () => {
    const r = predictRejectionRisk(CLAIM_WARN);
    expect(r.riskScore).toBe(65);
    expect(r.level).toBe('high');
    expect(r.factors).toHaveLength(3);
    expect(r.advice.length).toBeGreaterThan(0);
  });
});

const CLAIMS: InsuranceClaim[] = [CLAIM_PASS, CLAIM_HIGH, CLAIM_WARN];
const REJECTIONS: RejectionCase[] = [
  { caseId: 'r1', claimId: 'c-high', reason: '高值药缺适应症佐证', amount: 3000, stage: 'appeal', appealed: true, recovered: false },
  { caseId: 'r2', claimId: 'c-warn', reason: '重复计费', amount: 120, stage: 'recovered', appealed: false, recovered: true },
];

describe('buildDeepInsuranceMgmt 四维总装', () => {
  it('审核汇总：3 单 = pass 1 / warn 1 / reject 1，问题共 5 项、高危 1 项', () => {
    const r = buildDeepInsuranceMgmt({ claims: CLAIMS, rejections: REJECTIONS });
    expect(r.audit.totalClaims).toBe(3);
    expect(r.audit.pass).toBe(1);
    expect(r.audit.warn).toBe(1);
    expect(r.audit.rejectSuggest).toBe(1);
    expect(r.audit.totalIssues).toBe(5);
    expect(r.audit.highSeverityIssues).toBe(1);
  });

  it('结算汇总：总额 13060、自费 1436、统筹基数 11624；住院2/门诊1', () => {
    const r = buildDeepInsuranceMgmt({ claims: CLAIMS, rejections: REJECTIONS });
    expect(r.settlement.totalAmount).toBe(13060);
    expect(r.settlement.selfPay).toBe(1436);
    expect(r.settlement.insuranceBase).toBe(11624);
    expect(r.settlement.inpatient).toBe(2);
    expect(r.settlement.outpatient).toBe(1);
    expect(r.settlement.drg).toBe(0);
  });

  it('拒付汇总：2 件、金额 3120、已申诉1、已追回1、未结1', () => {
    const r = buildDeepInsuranceMgmt({ claims: CLAIMS, rejections: REJECTIONS });
    expect(r.rejection.total).toBe(2);
    expect(r.rejection.totalAmount).toBe(3120);
    expect(r.rejection.appealed).toBe(1);
    expect(r.rejection.recovered).toBe(1);
    expect(r.rejection.openCases).toBe(1);
  });

  it('政策目录盘点：药品/诊疗/设施 + 甲乙丙计数；合规率=1/3', () => {
    const r = buildDeepInsuranceMgmt({ claims: CLAIMS, rejections: REJECTIONS });
    expect(r.policy.drug).toBeGreaterThan(0);
    expect(r.policy.levelA).toBeGreaterThan(0);
    expect(r.complianceRate).toBeCloseTo(0.333, 2);
  });

  it('空输入安全降级为零基线，不抛错', () => {
    const r = buildDeepInsuranceMgmt();
    expect(r.audit.totalClaims).toBe(0);
    expect(r.settlement.totalAmount).toBe(0);
    expect(r.rejection.total).toBe(0);
  });
});

describe('generateInsuranceReport 按期报告', () => {
  it('周期报告：总额/统筹/自费、拒付率=2/3、含整改建议', () => {
    const r = generateInsuranceReport('2026-09', { claims: CLAIMS, rejections: REJECTIONS });
    expect(r.period).toBe('2026-09');
    expect(r.claimCount).toBe(3);
    expect(r.totalAmount).toBe(13060);
    expect(r.rejectionAmount).toBe(3120);
    expect(r.rejectionRate).toBeCloseTo(0.667, 2);
    expect(r.topIssueTypes.length).toBeGreaterThan(0);
    // 有高危问题 + 有未结拒付 → 至少 2 条建议
    expect(r.recommendations.length).toBeGreaterThanOrEqual(2);
  });

  it('空报告：零基线且给一条维持性建议，不抛错', () => {
    const r = generateInsuranceReport('2026-09');
    expect(r.claimCount).toBe(0);
    expect(r.complianceRate).toBe(0);
    expect(r.recommendations.length).toBe(1);
  });
});
