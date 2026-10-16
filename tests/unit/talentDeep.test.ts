/**
 * 健澜科技 jlmedaios - 【绩效与人才】人才管理深化纯函数单测
 *
 * 覆盖：人才画像（talentScoreOf / tierOf / buildTalentInventory 四档分布）、
 *       缺口识别（identifySkillGap 覆盖人数/严重度排序）、
 *       培训推荐（recommendTraining 课程命中/兜底/优先级）、
 *       继任者（identifySuccessor 现任者排除/技能匹配/就绪度分档）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildTalentInventory,
  identifySkillGap,
  identifySuccessor,
  recommendTraining,
  tierOf,
  talentScoreOf,
  type StaffProfile,
} from '../../src/bff/aggregators/talentDeepAggregator';

/** 构造一个测试员工的便捷工厂 */
function staff(over: Partial<StaffProfile>): StaffProfile {
  return {
    staffId: 'd1',
    name: '测试医生',
    dept: 'IN',
    title: '主治医师',
    skills: [],
    certificates: [],
    completedTrainings: [],
    performanceScore: 70,
    potentialScore: 70,
    yearsOfService: 3,
    ...over,
  };
}

describe('人才画像 talentScoreOf / tierOf', () => {
  it('人才分 = 绩效×0.6 + 潜力×0.4', () => {
    // 80*0.6 + 90*0.4 = 48 + 36 = 84
    expect(talentScoreOf(staff({ performanceScore: 80, potentialScore: 90 }))).toBe(84);
  });

  it('继任就绪：人才分 ≥85 且工龄 ≥5', () => {
    expect(
      tierOf(staff({ performanceScore: 90, potentialScore: 90, yearsOfService: 8 })),
    ).toBe('successor_ready');
  });

  it('人才分 ≥85 但工龄不足 5 年，不算继任就绪（不能拔苗助长）', () => {
    expect(
      tierOf(staff({ performanceScore: 90, potentialScore: 90, yearsOfService: 3 })),
    ).not.toBe('successor_ready');
  });

  it('骨干：人才分 ≥75', () => {
    expect(
      tierOf(staff({ performanceScore: 80, potentialScore: 70, yearsOfService: 3 })),
    ).toBe('backbone'); // 80*0.6+70*0.4 = 76
  });

  it('后备：人才分 ≥60', () => {
    expect(
      tierOf(staff({ performanceScore: 65, potentialScore: 60, yearsOfService: 2 })),
    ).toBe('backup'); // 65*0.6+60*0.4 = 63
  });

  it('普通：人才分 <60', () => {
    expect(
      tierOf(staff({ performanceScore: 55, potentialScore: 50, yearsOfService: 1 })),
    ).toBe('ordinary'); // 55*0.6+50*0.4 = 53
  });
});

describe('buildTalentInventory 人才盘点', () => {
  const dept = {
    dept: 'IN',
    staff: [
      staff({ staffId: 'a', performanceScore: 92, potentialScore: 88, yearsOfService: 12, skills: ['介入'], certificates: ['证'], completedTrainings: ['训'] }),
      staff({ staffId: 'b', performanceScore: 80, potentialScore: 78, yearsOfService: 6 }),
      staff({ staffId: 'c', performanceScore: 60, potentialScore: 55, yearsOfService: 2 }),
    ],
  };

  it('总数与条目数一致', () => {
    const inv = buildTalentInventory(dept, '2026-10-16T00:00:00Z');
    expect(inv.total).toBe(3);
    expect(inv.items.length).toBe(3);
    expect(inv.dept).toBe('IN');
    expect(inv.generatedAt).toBe('2026-10-16T00:00:00Z');
  });

  it('按人才分降序排列（高潜在前，发展视角）', () => {
    const inv = buildTalentInventory(dept);
    expect(inv.items[0].staffId).toBe('a');
    expect(inv.items[2].staffId).toBe('c');
  });

  it('四档人数分布正确', () => {
    const inv = buildTalentInventory(dept);
    // a: 92*0.6+88*0.4=90.4 且工龄12 → successor_ready
    expect(inv.tiers.successor_ready).toBe(1);
    // b: 80*0.6+78*0.4=79.2 → backbone
    expect(inv.tiers.backbone).toBe(1);
    // c: 60*0.6+55*0.4=58 → ordinary
    expect(inv.tiers.ordinary).toBe(1);
    expect(inv.tiers.backup).toBe(0);
  });

  it('画像四维计数（技能/证书/培训）正确', () => {
    const inv = buildTalentInventory(dept);
    const first = inv.items[0];
    expect(first.skillCount).toBe(1);
    expect(first.certificateCount).toBe(1);
    expect(first.trainingCount).toBe(1);
  });

  it('空科室兜底：零人盘点不抛错', () => {
    const inv = buildTalentInventory({ dept: 'XX', staff: [] });
    expect(inv.total).toBe(0);
    expect(inv.summary.readinessRate).toBe(0);
    expect(inv.summary.avgPerformance).toBe(0);
  });

  it('不修改入参', () => {
    const snapshot = dept.staff.map((s) => ({ ...s }));
    buildTalentInventory(dept);
    expect(dept.staff).toEqual(snapshot);
  });
});

describe('identifySkillGap 技能缺口', () => {
  const dept = {
    dept: 'IN',
    staff: [
      staff({ staffId: 'a', skills: ['冠心病介入'] }),
      staff({ staffId: 'b', skills: ['冠心病介入', '重症超声'] }),
    ],
  };

  it('统计掌握人数并折算缺口', () => {
    const gaps = identifySkillGap(dept, ['冠心病介入', '重症超声', 'DRG/DIP 病案'], 2);
    const inter = gaps.find((g) => g.skill === '冠心病介入');
    expect(inter?.currentCoverage).toBe(2);
    expect(inter?.shortage).toBe(0);

    const drg = gaps.find((g) => g.skill === 'DRG/DIP 病案');
    expect(drg?.currentCoverage).toBe(0);
    expect(drg?.shortage).toBe(2);
    expect(drg?.severity).toBe('high'); // 0 人掌握
  });

  it('严重度：不足半数为 medium', () => {
    const gaps = identifySkillGap(dept, ['重症超声'], 4);
    const us = gaps.find((g) => g.skill === '重症超声');
    // 期望 4 人，现 1 人，不足半数（2）→ medium
    expect(us?.currentCoverage).toBe(1);
    expect(us?.severity).toBe('medium');
  });

  it('缺口大的排前面（发展优先级）', () => {
    const gaps = identifySkillGap(dept, ['冠心病介入', 'DRG/DIP 病案'], 2);
    expect(gaps[0].skill).toBe('DRG/DIP 病案');
  });

  it('空所需技能返回空数组', () => {
    expect(identifySkillGap(dept, [])).toEqual([]);
  });
});

describe('recommendTraining 培训推荐', () => {
  it('命中介入课程规则库', () => {
    const rec = recommendTraining('d1', { skill: '冠心病介入', severity: 'high' });
    expect(rec.course).toContain('介入');
    expect(rec.priority).toBe('high');
    expect(rec.hours).toBeGreaterThan(0);
  });

  it('命中 DRG/DIP 课程规则库', () => {
    const rec = recommendTraining('d2', { skill: 'DRG/DIP 病案', severity: 'medium' });
    expect(rec.course).toContain('DRG/DIP');
    expect(rec.priority).toBe('medium');
  });

  it('未命中规则库走通用课程兜底', () => {
    const rec = recommendTraining('d3', { skill: '冷门技能 XYZ', severity: 'low' });
    expect(rec.course).toContain('通用培训');
    expect(rec.priority).toBe('low');
  });
});

describe('identifySuccessor 继任者识别', () => {
  const pool = [
    staff({ staffId: 'a', name: '候选甲', performanceScore: 90, potentialScore: 88, skills: ['冠心病介入', '重症超声', '慢病管理'] }),
    staff({ staffId: 'b', name: '候选乙', performanceScore: 75, potentialScore: 70, skills: ['冠心病介入'] }),
    staff({ staffId: 'inc', name: '现任主任', performanceScore: 95, potentialScore: 90, skills: ['冠心病介入', '重症超声', '慢病管理'] }),
  ];

  it('排除现任者本人，推荐最高分候选人', () => {
    const r = identifySuccessor({
      position: '心内科主任',
      requiredSkills: ['冠心病介入', '重症超声', '慢病管理'],
      candidates: pool,
      incumbentStaffId: 'inc',
    });
    expect(r.position).toBe('心内科主任');
    expect(r.recommended?.staffId).toBe('a');
    // 现任者 inc 不应出现在候选列表
    expect(r.candidates.every((c) => c.staffId !== 'inc')).toBe(true);
  });

  it('技能匹配率与就绪度分档：全技能匹配 → ready', () => {
    const r = identifySuccessor({
      position: '心内科主任',
      requiredSkills: ['冠心病介入', '重症超声', '慢病管理'],
      candidates: [pool[0]],
    });
    // a: 90*0.4+88*0.4+1.0*100*0.2 = 36+35.2+20 = 91.2，匹配率 1.0 → ready
    expect(r.recommended?.skillMatch).toBe(1);
    expect(r.recommended?.readiness).toBe('ready');
  });

  it('技能只命中一项的候选人就绪度下降', () => {
    const r = identifySuccessor({
      position: '心内科主任',
      requiredSkills: ['冠心病介入', '重症超声', '慢病管理'],
      candidates: [pool[1]],
    });
    // b: 75*0.4+70*0.4+(1/3)*100*0.2 = 30+28+6.7 ≈ 64.7 → three_plus_year（<65）
    expect(r.recommended?.skillMatch).toBeCloseTo(1 / 3, 2);
    expect(r.recommended?.readiness).not.toBe('ready');
  });

  it('空候选池返回 recommended=null', () => {
    const r = identifySuccessor({
      position: '某主任',
      requiredSkills: ['x'],
      candidates: [],
    });
    expect(r.recommended).toBeNull();
    expect(r.candidates).toEqual([]);
  });
});
