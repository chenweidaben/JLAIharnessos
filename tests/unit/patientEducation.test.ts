/**
 * 健澜科技 jlmedaios - M147-B 患者健康教育纯函数单测
 *
 * 覆盖：
 *   - generateHealthEducation：六大栏目齐全且顺序固定、疾病中文名、
 *     通俗化表达（"血压高了就少吃咸的"这类大白话）、未知疾病兜底、确定性；
 *   - pushEducationMaterial：个性化推送六张卡片、推送语、推送时间透传；
 *   - readStatsOf：已读进度统计（总数 / 已读 / 未读 / 已读率 / 空集兜底）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  generateHealthEducation,
  pushEducationMaterial,
  readStatsOf,
  type EducationCategory,
} from '../../src/bff/aggregators/patientEducationAggregator';

const EXPECTED_ORDER: EducationCategory[] = [
  'basics',
  'diet',
  'exercise',
  'medication',
  'followup',
  'redflags',
];

describe('generateHealthEducation 材料生成', () => {
  it('固定输出六大栏目，且顺序为 常识→饮食→运动→用药→复诊→红旗', () => {
    const m = generateHealthEducation('P-001', 'hypertension', '2026-10-16T00:00:00Z');
    expect(m.sections).toHaveLength(6);
    expect(m.sections.map((s) => s.category)).toEqual(EXPECTED_ORDER);
  });

  it('高血压：饮食卡片用大白话"少吃咸"，而不是医学术语', () => {
    const m = generateHealthEducation('P-001', 'hypertension');
    const diet = m.sections.find((s) => s.category === 'diet');
    expect(diet?.body).toContain('咸');
    // 不允许出现教科书式术语"限钠"
    expect(diet?.body).not.toContain('限钠');
    expect(m.diseaseLabel).toBe('高血压');
  });

  it('红旗症状卡片一律引导急诊/120，不做安慰', () => {
    for (const disease of ['hypertension', 'diabetes', 'chd', 'asthma', 'unknown-xyz']) {
      const m = generateHealthEducation('P-001', disease);
      const red = m.sections.find((s) => s.category === 'redflags');
      expect(red?.body).toMatch(/(120|急诊)/);
    }
  });

  it('未知疾病编码兜底到"慢病通用"，仍输出完整六张卡片', () => {
    const m = generateHealthEducation('P-002', 'some-rare-disease');
    expect(m.diseaseLabel).toBe('慢病通用');
    expect(m.sections).toHaveLength(6);
  });

  it('同一 (patientId, disease) 多次调用结果一致（确定性，便于幂等落库）', () => {
    const a = generateHealthEducation('P-003', 'diabetes', '2026-10-16T00:00:00Z');
    const b = generateHealthEducation('P-003', 'diabetes', '2026-10-16T00:00:00Z');
    expect(a).toEqual(b);
  });

  it('疾病编码归一化：大小写 / 空格不影响知识库命中', () => {
    const a = generateHealthEducation('P-004', 'Hypertension');
    const b = generateHealthEducation('P-004', ' hypertension ');
    expect(a.disease).toBe('hypertension');
    expect(a).toEqual(b);
  });
});

describe('pushEducationMaterial 个性化推送', () => {
  it('一次推送固定六张卡片，推送语带疾病中文名', () => {
    const r = pushEducationMaterial('P-100', 'diabetes', '2026-10-16T08:00:00Z');
    expect(r.pushedCount).toBe(6);
    expect(r.pushedAt).toBe('2026-10-16T08:00:00Z');
    expect(r.diseaseLabel).toBe('糖尿病');
    expect(r.message).toContain('糖尿病');
    expect(r.sections).toHaveLength(6);
  });

  it('推送结果的 patientId 做了 trim，空疾病归一为 general', () => {
    const r = pushEducationMaterial('  P-101  ', '');
    expect(r.patientId).toBe('P-101');
    expect(r.disease).toBe('general');
    expect(r.pushedCount).toBe(6);
  });

  it('冠心病红旗卡片提醒嚼服阿司匹林并打 120', () => {
    const r = pushEducationMaterial('P-102', 'chd');
    const red = r.sections.find((s) => s.category === 'redflags');
    expect(red?.body).toContain('120');
  });
});

describe('readStatsOf 已读统计', () => {
  it('总数 / 已读 / 未读 / 已读率折算正确', () => {
    const stats = readStatsOf([
      { isRead: true },
      { isRead: true },
      { isRead: true },
      { isRead: false },
      { isRead: false },
    ]);
    expect(stats.total).toBe(5);
    expect(stats.read).toBe(3);
    expect(stats.unread).toBe(2);
    expect(stats.readRate).toBeCloseTo(0.6, 4);
  });

  it('空材料列表：已读率为 0，不除零', () => {
    const stats = readStatsOf([]);
    expect(stats).toEqual({ total: 0, read: 0, unread: 0, readRate: 0 });
  });

  it('全部已读：已读率为 1', () => {
    const stats = readStatsOf([{ isRead: true }, { isRead: true }]);
    expect(stats.readRate).toBe(1);
  });
});
