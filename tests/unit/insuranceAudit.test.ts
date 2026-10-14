/**
 * 健澜科技 jlmedaios - 医保事前智能审核规则引擎纯函数单测
 *
 * 覆盖：超医保目录（命中 / 不命中）、限定支付适应症不符（命中 / 诊断匹配不命中）、
 * 重复收费同类别同日（命中 / 不命中）、空处方安全降级、整体风险等级汇总。
 * 全部 mock 数据，使用内置 SAMPLE_RULES，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  auditPrescription,
  SAMPLE_RULES,
  type AuditItem,
  type Prescription,
} from '../../src/bff/aggregators/insuranceAuditAggregator';

const item = (
  itemCode: string,
  itemName: string,
  category: string,
  billedAt: string,
  extra?: Partial<AuditItem>,
): AuditItem => ({ itemCode, itemName, category, billedAt, ...extra });

const rx = (items: AuditItem[], diagnoses?: string[]): Prescription => ({
  visitId: 'V001',
  diagnoses,
  items,
});

describe('超医保目录（catalog.out_of_catalog）', () => {
  it('目录外项目 X999 -> high 命中', () => {
    const r = auditPrescription(
      rx([item('X999', '某自费新材料', '耗材', '2026-10-14T09:00:00')]),
      SAMPLE_RULES,
    );
    const hit = r.hits.find((h) => h.rule === 'catalog.out_of_catalog');
    expect(hit?.level).toBe('high');
    expect(hit?.detail).toContain('X999');
    expect(r.blocked).toBe(true);
  });

  it('目录内项目 Y001 -> 不命中超目录', () => {
    const r = auditPrescription(
      rx([item('Y001', '阿莫西林胶囊', '药品', '2026-10-14T09:00:00')]),
      SAMPLE_RULES,
    );
    expect(r.hits.some((h) => h.rule === 'catalog.out_of_catalog')).toBe(false);
  });
});

describe('限定支付（payment.limited_indication）', () => {
  it('Y002 诊断为感冒 -> 适应症不符 medium 命中', () => {
    const r = auditPrescription(
      rx([item('Y002', '某靶向药', '药品', '2026-10-14T09:00:00')], ['急性上呼吸道感染']),
      SAMPLE_RULES,
    );
    const hit = r.hits.find((h) => h.rule === 'payment.limited_indication');
    expect(hit?.level).toBe('medium');
    expect(hit?.detail).toContain('肺腺癌');
  });

  it('Y002 诊断为肺腺癌 -> 命中限定适应症，不命中', () => {
    const r = auditPrescription(
      rx([item('Y002', '某靶向药', '药品', '2026-10-14T09:00:00')], ['肺腺癌']),
      SAMPLE_RULES,
    );
    expect(r.hits.some((h) => h.rule === 'payment.limited_indication')).toBe(false);
  });

  it('Y002 明细级诊断命中 -> 不命中', () => {
    const r = auditPrescription(
      rx([item('Y002', '某靶向药', '药品', '2026-10-14T09:00:00', { diagnoses: ['转移性结直肠癌'] })]),
      SAMPLE_RULES,
    );
    expect(r.hits.some((h) => h.rule === 'payment.limited_indication')).toBe(false);
  });
});

describe('重复收费（billing.duplicate_same_day）', () => {
  it('检验类同日 3 次（>2）-> low 命中', () => {
    const r = auditPrescription(
      rx([
        item('Y003', '血常规', '检验', '2026-10-14T08:00:00'),
        item('Y003', '血常规', '检验', '2026-10-14T10:00:00'),
        item('Y003', '血常规', '检验', '2026-10-14T14:00:00'),
      ]),
      SAMPLE_RULES,
    );
    const hit = r.hits.find((h) => h.rule === 'billing.duplicate_same_day');
    expect(hit?.level).toBe('low');
    expect(hit?.detail).toContain('3 次');
  });

  it('检验类同日 2 次（=上限）-> 不命中', () => {
    const r = auditPrescription(
      rx([
        item('Y003', '血常规', '检验', '2026-10-14T08:00:00'),
        item('Y003', '血常规', '检验', '2026-10-14T14:00:00'),
      ]),
      SAMPLE_RULES,
    );
    expect(r.hits.some((h) => h.rule === 'billing.duplicate_same_day')).toBe(false);
  });

  it('同类不同日各 1 次 -> 不命中', () => {
    const r = auditPrescription(
      rx([
        item('Y003', '血常规', '检验', '2026-10-13T08:00:00'),
        item('Y003', '血常规', '检验', '2026-10-14T08:00:00'),
      ]),
      SAMPLE_RULES,
    );
    expect(r.hits.some((h) => h.rule === 'billing.duplicate_same_day')).toBe(false);
  });
});

describe('安全降级与风险汇总', () => {
  it('空处方 / 非法输入 -> low 空结果，不抛错', () => {
    expect(auditPrescription(null, SAMPLE_RULES).hits.length).toBe(0);
    // @ts-expect-error 故意传非法输入验证防御
    expect(auditPrescription(undefined, SAMPLE_RULES).riskLevel).toBe('low');
    expect(auditPrescription({ items: [] }, SAMPLE_RULES).blocked).toBe(false);
  });

  it('合规处方（目录内+适应症匹配+无重复）-> low 无命中', () => {
    const r = auditPrescription(
      rx([
        item('Y001', '阿莫西林胶囊', '药品', '2026-10-14T09:00:00'),
        item('Y002', '某靶向药', '药品', '2026-10-14T09:00:00', { diagnoses: ['肺腺癌'] }),
      ], ['肺腺癌']),
      SAMPLE_RULES,
    );
    expect(r.hitCount).toBe(0);
    expect(r.riskLevel).toBe('low');
  });

  it('high 命中时整体 riskLevel=high 且 blocked', () => {
    const r = auditPrescription(
      rx([
        item('X999', '自费新材料', '耗材', '2026-10-14T09:00:00'),
        item('Y002', '某靶向药', '药品', '2026-10-14T09:00:00'),
      ], ['感冒']),
      SAMPLE_RULES,
    );
    expect(r.riskLevel).toBe('high');
    expect(r.blocked).toBe(true);
    expect(r.hits.some((h) => h.rule === 'payment.limited_indication')).toBe(true);
  });
});
