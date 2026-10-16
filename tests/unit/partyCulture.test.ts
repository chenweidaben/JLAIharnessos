/**
 * 健澜科技 jlmedaios - 党建与文化深化纯函数单测（M178-D · 医院管理深化）
 *
 * 【财务人力行政党建】党建文化要务实，不能形式主义。覆盖：
 *   - organizePartyActivity：反形式主义硬校验（议程≥10字、应到≥3、有落地事项），
 *     不合格的活动标 needsImprovement 而不是照单登记；
 *   - evaluateMedicalEthics：证据加权、投诉扣分、查实违规一票否决（等次封顶C），
 *     无证据按合格基线 C 计，不凭空给 A；
 *   - trackHospitalCultureEvent：问效口径（人均成本、满意度、closed 状态），
 *     不数场次。
 *
 * 与持久化解耦：不触库。用远未来年份/唯一 staffId 做断言，避免同进程台账串扰。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeepPartyCulture,
  evaluateMedicalEthics,
  organizePartyActivity,
  recordEthicsEvidence,
  trackHospitalCultureEvent,
} from '../../src/bff/aggregators/partyCultureAggregator';

const HOST = 'bbbb-0000-0000-0000-000000000001';

describe('organizePartyActivity 党建活动组织（反形式主义）', () => {
  it('务实达标：议程充实、应到≥3、有落地事项 → organized，校验全过', () => {
    const a = organizePartyActivity({
      pillar: '党建工作',
      topic: '学习贯彻二十届四中全会精神专题研讨',
      themeType: '三会一课',
      plannedDate: '2099-03-15',
      location: '党员活动室',
      hostId: HOST,
      expectedAttendees: 12,
      budget: 800,
      agendaNotes: '集中学习全会公报重点章节，结合科室业务谈三条落实措施',
      actionItems: ['制定科室季度学习计划', '建立问题整改台账'],
    });
    expect(a.id).toBeTruthy();
    expect(a.status).toBe('organized');
    expect(a.formalRiskFlags).toHaveLength(0);
    expect(a.pragmatismChecklist.every((c) => c.passed)).toBe(true);
    expect(a.actionItems).toHaveLength(2);
  });

  it('议程过简（只写标题）→ 判形式主义风险，needsImprovement', () => {
    const a = organizePartyActivity({
      pillar: '党建工作',
      topic: '政治学习',
      themeType: '主题党日',
      plannedDate: '2099-04-01',
      location: '会议室',
      hostId: HOST,
      expectedAttendees: 8,
      agendaNotes: '学习',
      actionItems: ['落实学习'],
    });
    expect(a.status).toBe('needsImprovement');
    expect(a.formalRiskFlags.join('|')).toMatch(/议程过简/);
  });

  it('应到人数不足（一人讲众人听）→ 形式主义风险', () => {
    const a = organizePartyActivity({
      pillar: '工会工作',
      topic: '工会小组座谈',
      themeType: '职工福利',
      plannedDate: '2099-05-10',
      location: '茶室',
      hostId: HOST,
      expectedAttendees: 2,
      agendaNotes: '围绕职工福利开展座谈，梳理三条诉求并形成反馈',
      actionItems: ['整理职工诉求清单'],
    });
    expect(a.status).toBe('needsImprovement');
    expect(a.formalRiskFlags.join('|')).toMatch(/应到人数/);
  });

  it('没有会后落地事项 → 形式主义风险（学完就散）', () => {
    const a = organizePartyActivity({
      pillar: '医院文化',
      topic: '院训宣讲',
      themeType: '院训院徽',
      plannedDate: '2099-06-01',
      location: '报告厅',
      hostId: HOST,
      expectedAttendees: 30,
      agendaNotes: '系统宣讲院训仁爱精业求实创新的内涵与科室落地要求',
      actionItems: [],
    });
    expect(a.status).toBe('needsImprovement');
    expect(a.formalRiskFlags.join('|')).toMatch(/议定事项/);
  });

  it('非法入参抛错（空主题 / 空主持人 / 非法日期）', () => {
    expect(() =>
      organizePartyActivity({
        pillar: '党建工作', topic: '  ', themeType: '三会一课', plannedDate: '2099-01-01',
        location: '', hostId: HOST, expectedAttendees: 5, agendaNotes: '内容充足的议程要点描述', actionItems: ['x'],
      }),
    ).toThrow(/主题/);
    expect(() =>
      organizePartyActivity({
        pillar: '党建工作', topic: 't', themeType: '三会一课', plannedDate: '2099-01-01',
        location: '', hostId: '', expectedAttendees: 5, agendaNotes: '内容充足的议程要点描述', actionItems: ['x'],
      }),
    ).toThrow(/主持人/);
    expect(() =>
      organizePartyActivity({
        pillar: '党建工作', topic: 't', themeType: '三会一课', plannedDate: '2099/01/01',
        location: '', hostId: HOST, expectedAttendees: 5, agendaNotes: '内容充足的议程要点描述', actionItems: ['x'],
      }),
    ).toThrow(/日期/);
  });
});

describe('evaluateMedicalEthics 医德考评（证据加权，查实一票否决）', () => {
  it('无证据：按合格基线 C 计，不凭空给 A', () => {
    const r = evaluateMedicalEthics('staff-no-evidence', '2099-H1');
    expect(r.grade).toBe('C');
    expect(r.vetoed).toBe(false);
    expect(r.basis.join('|')).toMatch(/暂无/);
  });

  it('表扬+退红包加分，投诉扣分', () => {
    recordEthicsEvidence('staff-good-1', '2099-Q3', {
      complaints: 1, verifiedViolations: 0, commendations: 3,
      redEnvelopeReturned: 1, trainingAttended: 4, trainingRequired: 4,
    });
    const r = evaluateMedicalEthics('staff-good-1', '2099-Q3');
    // 80 + 6(表扬) + 3(退红包) - 5(投诉) = 84 → B
    expect(r.score).toBe(84);
    expect(r.grade).toBe('B');
    expect(r.vetoed).toBe(false);
  });

  it('经查实违规 → 一票否决，等次封顶 C（不能拿优秀/良好）', () => {
    recordEthicsEvidence('staff-bad-1', '2099-Q3', {
      complaints: 0, verifiedViolations: 1, commendations: 5,
      redEnvelopeReturned: 2, trainingAttended: 4, trainingRequired: 4,
    });
    const r = evaluateMedicalEthics('staff-bad-1', '2099-Q3');
    expect(r.vetoed).toBe(true);
    // 80 + 10(表扬封顶) + 6(退红包) - 15(违规) = 81 → 本应 B，否决后封顶 C
    expect(r.grade).toBe('C');
    expect(r.basis.join('|')).toMatch(/一票否决/);
  });

  it('多起投诉+缺训 → D 不合格', () => {
    recordEthicsEvidence('staff-poor-1', '2099-Q3', {
      complaints: 6, verifiedViolations: 0, commendations: 0,
      redEnvelopeReturned: 0, trainingAttended: 1, trainingRequired: 4,
    });
    const r = evaluateMedicalEthics('staff-poor-1', '2099-Q3');
    // 80 - 30(投诉) - 6(缺训3*2) = 44 → D
    expect(r.score).toBe(44);
    expect(r.grade).toBe('D');
  });

  it('非法入参抛错（空 staffId / 空周期）', () => {
    expect(() => evaluateMedicalEthics('', '2099')).toThrow(/staffId/);
    expect(() => evaluateMedicalEthics('x', '')).toThrow(/周期/);
  });
});

describe('trackHospitalCultureEvent 文化活动跟踪（问效）', () => {
  it('仅计划信息 → planned，无人均成本', () => {
    const e = trackHospitalCultureEvent({
      name: '新入职员工医院精神宣讲', category: '医院精神',
      eventDate: '2099-07-01', organizer: '党办', plannedReach: 120, budget: 5000,
    });
    expect(e.id).toBeTruthy();
    expect(e.status).toBe('planned');
    expect(e.costPerReach).toBeNull();
  });

  it('已问效：实际覆盖+花费+成效 → closed，人均成本自动算', () => {
    const e = trackHospitalCultureEvent({
      name: '院训文化墙揭幕', category: '品牌建设',
      eventDate: '2099-08-10', organizer: '宣传科', plannedReach: 500, budget: 20000,
      actualReach: 400, actualSpend: 16000, satisfaction: 92,
      outcomeSummary: '文化墙覆盖门诊大厅，患者与员工驻足阅读，收集反馈建议23条',
    });
    expect(e.status).toBe('closed');
    expect(e.costPerReach).toBe(40); // 16000 / 400
    expect(e.satisfaction).toBe(92);
  });

  it('非法入参抛错（空名称 / 非法日期）', () => {
    expect(() =>
      trackHospitalCultureEvent({ name: ' ', category: '文化活动', eventDate: '2099-01-01', organizer: '', plannedReach: 1, budget: 0 }),
    ).toThrow(/名称/);
    expect(() =>
      trackHospitalCultureEvent({ name: 'x', category: '文化活动', eventDate: '2099-13-01', organizer: '', plannedReach: 1, budget: 0 }),
    ).toThrow(/日期/);
  });
});

describe('buildDeepPartyCulture 深度党建文化看板', () => {
  it('汇总四维度与等次分布，返回院训/医院精神锚点', () => {
    const v = buildDeepPartyCulture();
    expect(v.motto).toBeTruthy();
    expect(v.spirit).toBeTruthy();
    expect(v.pillars.partyBuilding.name).toBe('党建工作');
    expect(v.pillars.union.name).toBe('工会工作');
    expect(v.pillars.medicalEthics.name).toBe('医德医风');
    expect(v.pillars.hospitalCulture.name).toBe('医院文化');
    expect(v.ethicsGradeDistribution).toHaveProperty('A');
    expect(v.ethicsGradeDistribution).toHaveProperty('D');
    expect(typeof v.activitiesNeedingImprovement).toBe('number');
  });
});
