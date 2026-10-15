/**
 * 健澜科技 jlmedaios - Doctor MUSE 全角色 Personal Agent 画像聚合（依据宪法第七章）单测
 *
 * 覆盖：
 *  - 画像构建：specialty 取频次最高者、experienceTags 去重保序、空历史兜底；
 *  - 决策记录：recordDecisionMemory 计数 / 成功率滚动更新、标签合并、不修改入参；
 *  - 统计聚合：success / failure / mixed 三态计数与 successRate 口径；
 *  - 失败经验计数：failure 逐次累加，mixed 不计入成功也不计入失败。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildStaffMuseProfile,
  recordDecisionMemory,
  type StaffDecision,
  type StaffDecisionOutcome,
} from '../../src/bff/aggregators/staffMuseAggregator';

/** 构造一条决策记忆 */
function decision(
  outcome: StaffDecisionOutcome,
  specialty?: string,
  experienceTag?: string,
): StaffDecision {
  return { decision: '演示决策', outcome, specialty, experienceTag };
}

describe('buildStaffMuseProfile 画像构建', () => {
  it('specialty 取历史决策中出现频次最高者', () => {
    const profile = buildStaffMuseProfile('S001', 'doctor', [
      decision('success', '心血管内科', '抗凝出血风险'),
      decision('success', '呼吸内科'),
      decision('failure', '心血管内科', '心衰容量管理'),
      decision('mixed', '心血管内科'),
    ]);
    expect(profile.specialty).toBe('心血管内科');
  });

  it('experienceTags 去重并按首次出现顺序保留', () => {
    const profile = buildStaffMuseProfile('S001', 'doctor', [
      decision('success', '心血管内科', '抗凝出血风险'),
      decision('success', '心血管内科', '心衰容量管理'),
      decision('failure', '心血管内科', '抗凝出血风险'),
      decision('mixed', '心血管内科', '胸痛绿色通道'),
    ]);
    expect(profile.experienceTags).toEqual([
      '抗凝出血风险',
      '心衰容量管理',
      '胸痛绿色通道',
    ]);
  });

  it('空历史兜底：null / undefined / 空数组均返回空画像，不抛错', () => {
    const inputs: (StaffDecision[] | null | undefined)[] = [null, undefined, []];
    for (const input of inputs) {
      const profile = buildStaffMuseProfile('S002', 'nurse', input);
      expect(profile).toEqual({
        staffId: 'S002',
        role: 'nurse',
        specialty: null,
        experienceTags: [],
        totalDecisions: 0,
        successCount: 0,
        failureCount: 0,
        mixedCount: 0,
        successRate: 0,
      });
    }
  });

  it('空白 specialty / 空标签被忽略', () => {
    const profile = buildStaffMuseProfile('S003', 'pharma', [
      decision('success', '  ', '  '),
      decision('failure', '', '处方前置审核'),
    ]);
    expect(profile.specialty).toBeNull();
    expect(profile.experienceTags).toEqual(['处方前置审核']);
  });
});

describe('buildStaffMuseProfile 统计聚合', () => {
  it('三态计数与 successRate = success / total', () => {
    const profile = buildStaffMuseProfile('S004', 'doctor', [
      decision('success', '心血管内科'),
      decision('success', '心血管内科'),
      decision('failure', '心血管内科'),
      decision('mixed', '心血管内科'),
    ]);
    expect(profile.totalDecisions).toBe(4);
    expect(profile.successCount).toBe(2);
    expect(profile.failureCount).toBe(1);
    expect(profile.mixedCount).toBe(1);
    expect(profile.successRate).toBe(0.5);
  });

  it('成功率保留 4 位小数，输出确定', () => {
    const profile = buildStaffMuseProfile('S005', 'doctor', [
      decision('success'),
      decision('failure'),
      decision('failure'),
    ]);
    expect(profile.successRate).toBeCloseTo(1 / 3, 4);
    expect(profile.successRate).toBe(0.3333);
  });
});

describe('buildStaffMuseProfile 失败经验计数', () => {
  it('failure 逐次累加为 failureCount，mixed 不计入失败', () => {
    const profile = buildStaffMuseProfile('S006', 'admin', [
      decision('failure'),
      decision('success'),
      decision('failure'),
      decision('failure'),
      decision('mixed'),
    ]);
    expect(profile.failureCount).toBe(3);
    expect(profile.totalDecisions).toBe(5);
    // 3 失败 / 1 混合均不计入成功 → successRate = 1/5
    expect(profile.successRate).toBe(0.2);
  });
});

describe('recordDecisionMemory 决策记录', () => {
  const base = buildStaffMuseProfile('S007', 'nurse', [
    decision('success', '急诊护理', '跌倒风险评估'),
    decision('failure', '急诊护理', '压疮分期'),
  ]);

  it('记录新成功决策：total/success+1 且 successRate 滚动重算', () => {
    const next = recordDecisionMemory(base, decision('success', '急诊护理', '跌倒风险评估'));
    expect(next.totalDecisions).toBe(3);
    expect(next.successCount).toBe(2);
    expect(next.failureCount).toBe(1);
    expect(next.successRate).toBeCloseTo(2 / 3, 4);
  });

  it('新失败决策追加失败计数，并合并未收录的经验标签', () => {
    const next = recordDecisionMemory(base, decision('failure', '急诊护理', '管路滑脱预防'));
    expect(next.failureCount).toBe(2);
    expect(next.totalDecisions).toBe(3);
    expect(next.experienceTags).toEqual(['跌倒风险评估', '压疮分期', '管路滑脱预防']);
  });

  it('画像 specialty 为空时，用本条决策的 specialty 补登', () => {
    const empty = buildStaffMuseProfile('S008', 'pharma', []);
    const next = recordDecisionMemory(empty, decision('success', '临床药学'));
    expect(next.specialty).toBe('临床药学');
    expect(next.totalDecisions).toBe(1);
    expect(next.successRate).toBe(1);
  });

  it('纯函数：不修改入参画像与决策', () => {
    const snapshot = JSON.stringify(base);
    const d = decision('success', '急诊护理', '跌倒风险评估');
    recordDecisionMemory(base, d);
    expect(JSON.stringify(base)).toBe(snapshot);
    expect(base.totalDecisions).toBe(2);
  });
});
