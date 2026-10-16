/**
 * 健澜科技 jlmedaios - 患者 Personal Agent（Patient MUSE）聚合器单测（M117-A）
 *
 * 覆盖：
 *  - 画像聚合：chronicConditions 仅取 chronic=true、allergies 仅取 allergy=true、去重；
 *  - 偏好提取：derivePreferenceTags 关键词命中 / 复诊依从 / 多药共管；
 *  - 健康提醒：过敏 critical / 慢病 warning / 用药 info / 复诊逾期 warning / 空画像引导；
 *  - 角色差异：resolvePatientMuseTarget——doctor 看任意 / patient 看本人 / 越权拒绝；
 *  - 空数据兜底：null / undefined / 空数组一律零值视图，绝不抛错。
 *
 * 注意：纯函数测试，不连接 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientMuse,
  buildPatientMUSE,
  recordPatientExperience,
  recommendPatientService,
  trackPatientHealthProgress,
  derivePreferenceTags,
  FOLLOWUP_DUE_DAYS,
  type PatientHistoryEntry,
  type PatientMedication,
  type PatientVisit,
} from '../../src/bff/aggregators/patientMuseAggregator.js';
import { resolvePatientMuseTarget } from '../../src/bff/routes/patientMuse.js';

describe('buildPatientMuse - 画像聚合', () => {
  it('chronicConditions 仅收录 chronic=true 的诊断名并去重', () => {
    const history: PatientHistoryEntry[] = [
      { condition: '2型糖尿病', chronic: true },
      { condition: '上呼吸道感染', chronic: false },
      { condition: '2型糖尿病', chronic: true }, // 重复
      { condition: ' 原发性高血压 ', chronic: true },
    ];
    const view = buildPatientMuse('p1', history, [], []);
    expect(view.chronicConditions).toEqual(['2型糖尿病', '原发性高血压']);
  });

  it('allergies 仅收录 allergy=true 的药物名并去重', () => {
    const meds: PatientMedication[] = [
      { drugName: '阿司匹林', allergy: true },
      { drugName: '二甲双胍', allergy: false },
      { drugName: '阿司匹林', allergy: true },
    ];
    const view = buildPatientMuse('p1', [], meds, []);
    expect(view.allergies).toEqual(['阿司匹林']);
  });
});

describe('derivePreferenceTags - 偏好提取', () => {
  it('关键词命中：糖尿病→血糖管理、高血压→血压监测', () => {
    const tags = derivePreferenceTags({
      chronicConditions: ['2型糖尿病', '原发性高血压'],
      lastSummary: '',
      revisitCount: 0,
      activeMedCount: 0,
    });
    expect(tags).toContain('血糖管理');
    expect(tags).toContain('血压监测');
  });

  it('复诊次数≥2 → 追加「复诊依从」', () => {
    const tags = derivePreferenceTags({
      chronicConditions: [],
      lastSummary: '',
      revisitCount: 2,
      activeMedCount: 0,
    });
    expect(tags).toContain('复诊依从');
  });

  it('活跃用药≥3 → 追加「多药共管」', () => {
    const tags = derivePreferenceTags({
      chronicConditions: [],
      lastSummary: '',
      revisitCount: 0,
      activeMedCount: 3,
    });
    expect(tags).toContain('多药共管');
  });

  it('结果去重保序', () => {
    const tags = derivePreferenceTags({
      chronicConditions: ['糖尿病', '糖尿病'],
      lastSummary: '糖尿病随访',
      revisitCount: 0,
      activeMedCount: 0,
    });
    expect(tags.filter((t) => t === '血糖管理').length).toBe(1);
  });
});

describe('buildPatientMuse - 健康提醒', () => {
  it('有过敏史 → 产出 critical 级提醒且排最前', () => {
    const history: PatientHistoryEntry[] = [{ condition: '高血压', chronic: true }];
    const meds: PatientMedication[] = [{ drugName: '青霉素', allergy: true, status: 'stopped' }];
    const view = buildPatientMuse('p1', history, meds, []);
    expect(view.healthReminders[0].type).toBe('allergy');
    expect(view.healthReminders[0].level).toBe('critical');
    expect(view.healthReminders[0].message).toContain('青霉素');
  });

  it('有慢病 → 产出 warning 级慢病随访提醒', () => {
    const history: PatientHistoryEntry[] = [{ condition: '冠心病', chronic: true }];
    const view = buildPatientMuse('p1', history, [], []);
    expect(view.healthReminders.some((r) => r.type === 'chronic-care' && r.level === 'warning')).toBe(true);
  });

  it('有活跃用药 → 产出 info 级配药提醒', () => {
    const meds: PatientMedication[] = [
      { drugName: '二甲双胍', allergy: false, status: 'active' },
    ];
    const view = buildPatientMuse('p1', [], meds, []);
    expect(view.healthReminders.some((r) => r.type === 'refill' && r.level === 'info')).toBe(true);
  });

  it('距上次就诊超过 FOLLOWUP_DUE_DAYS 天 → 产出复诊预约提醒', () => {
    const old = new Date(Date.now() - (FOLLOWUP_DUE_DAYS + 30) * 86_400_000).toISOString();
    const visits: PatientVisit[] = [{ visitType: '复诊', visitDate: old, summary: '随访' }];
    const view = buildPatientMuse('p1', [], [], visits);
    expect(view.healthReminders.some((r) => r.type === 'followup' && r.level === 'warning')).toBe(true);
  });
});

describe('resolvePatientMuseTarget - 角色差异', () => {
  it('doctor：可查看任意患者', () => {
    const r = resolvePatientMuseTarget({ id: 'doc_1', roles: ['doctor'] }, 'p_99');
    expect('allowed' in r && r.allowed).toBe('p_99');
  });

  it('patient：仅可查看本人', () => {
    const r = resolvePatientMuseTarget({ id: 'p_1', roles: ['patient'] }, 'p_1');
    expect('allowed' in r && r.allowed).toBe('p_1');
  });

  it('patient 查看他人：拒绝（403 语义）', () => {
    const r = resolvePatientMuseTarget({ id: 'p_1', roles: ['patient'] }, 'p_2');
    expect('forbidden' in r).toBe(true);
  });

  it('未知角色：拒绝', () => {
    const r = resolvePatientMuseTarget({ id: 'u_1', roles: ['guest'] }, 'p_1');
    expect('forbidden' in r).toBe(true);
  });

  it('空 patientId：拒绝', () => {
    const r = resolvePatientMuseTarget({ id: 'doc_1', roles: ['doctor'] }, '   ');
    expect('forbidden' in r).toBe(true);
  });
});

describe('buildPatientMuse - 空数据兜底', () => {
  it('全 null 入参：零值视图 + 一条「完善档案」引导，绝不抛错', () => {
    const view = buildPatientMuse('p1', null, null, null);
    expect(view.chronicConditions).toEqual([]);
    expect(view.allergies).toEqual([]);
    expect(view.preferenceTags).toEqual([]);
    expect(view.healthReminders.length).toBe(1);
    expect(view.healthReminders[0].type).toBe('profile');
  });

  it('空数组入参：与 null 一致兜底', () => {
    const view = buildPatientMuse('p1', [], [], []);
    expect(view.chronicConditions).toEqual([]);
    expect(view.healthReminders[0].type).toBe('profile');
  });

  it('脏数据（无 condition / 非数组字段）：归一为空，不崩', () => {
    // @ts-expect-error 故意喂脏数据，验证防御
    const view = buildPatientMuse('p1', [{ condition: 123, chronic: 'yes' }], null, null);
    expect(view.chronicConditions).toEqual([]);
  });
});

/* ================================================================== */
/* 【质量与新场景】M175-D：患者个人智能体深化纯函数单测                */
/* ================================================================== */

describe('buildPatientMUSE（健康画像 / 就医偏好 / 目标 / 提醒 / 洞察）', () => {
  it('缺省演示画像：聚合疾病/用药/检查/过敏/家族史五大块', () => {
    const r = buildPatientMUSE('P-100');
    expect(r.patientId).toBe('P-100');
    expect(r.profile.diseases.length).toBeGreaterThan(0);
    expect(r.profile.medications.length).toBeGreaterThan(0);
    expect(r.profile.checkups.length).toBeGreaterThan(0);
    expect(r.profile.allergies.length).toBeGreaterThan(0);
    expect(r.profile.familyHistory.length).toBeGreaterThan(0);
    expect(r.preferences.paymentMethod).toBeTruthy();
    expect(r.goals.length).toBeGreaterThan(0);
    expect(r.reminders.length).toBeGreaterThan(0);
  });

  it('有「经常漏服」药物 → 产出 high 级依从性洞察', () => {
    const r = buildPatientMUSE('P-101', {
      profile: {
        diseases: [],
        medications: [{ drug: '阿托伐他汀', dose: '20mg', frequency: 'qn', adherence: 'poor' }],
        checkups: [],
        allergies: [],
        familyHistory: [],
      },
    });
    const adherence = r.insights.find((i) => i.kind === 'adherence');
    expect(adherence?.level).toBe('high');
    expect(adherence?.message).toContain('阿托伐他汀');
  });

  it('有异常化验 + 父系糖尿病家族史 → 分别产出 abnormal_lab / family_risk 洞察', () => {
    const r = buildPatientMUSE('P-102', {
      profile: {
        diseases: [],
        medications: [],
        checkups: [{ item: '糖化血红蛋白', date: '2026-09-20', result: 'abnormal', note: '7.8%' }],
        allergies: [],
        familyHistory: [{ relation: '父亲', condition: '2型糖尿病' }],
      },
    });
    expect(r.insights.some((i) => i.kind === 'abnormal_lab')).toBe(true);
    expect(r.insights.some((i) => i.kind === 'family_risk')).toBe(true);
  });

  it('画像干净（无漏服/无异常/无过敏/无家族史）→ 风险分为 0、总结正面', () => {
    const r = buildPatientMUSE('P-103', {
      profile: {
        diseases: [{ name: '高血压', status: 'controlled' }],
        medications: [{ drug: '缬沙坦', dose: '80mg', frequency: 'qd', adherence: 'good' }],
        checkups: [{ item: '血压', date: '2026-09-20', result: 'normal' }],
        allergies: [],
        familyHistory: [],
      },
    });
    expect(r.riskScore).toBe(0);
    expect(r.summary).toContain('控制得不错');
  });
});

describe('recordPatientExperience（患者经验记录：打标 + 随访判定）', () => {
  it('记录「出冷汗、心慌」+ 高分 → 命中低血糖标签且需主动随访', () => {
    const r = recordPatientExperience('P-200', {
      kind: 'symptom',
      title: '午饭前出冷汗、心慌手抖',
      severity: 5,
    });
    expect(r.tags).toContain('低血糖');
    expect(r.needsFollowUp).toBe(true);
    expect(r.level).toBe('high');
    expect(r.plainMessage).toContain('主动联系');
  });

  it('记录「饭后散步」日常 → lifestyle 打运动标签、不随访', () => {
    const r = recordPatientExperience('P-201', {
      kind: 'lifestyle',
      title: '饭后散步 20 分钟',
      severity: 1,
    });
    expect(r.tags).toContain('运动');
    expect(r.needsFollowUp).toBe(false);
    expect(r.level).toBe('low');
  });

  it('严重度归一：超过 5 夹到 5、低于 1 夹到 1', () => {
    const high = recordPatientExperience('P-202', { kind: 'symptom', title: 'x', severity: 9 });
    expect(high.severity).toBe(5);
    const low = recordPatientExperience('P-202', { kind: 'symptom', title: 'x', severity: 0 });
    expect(low.severity).toBe(1);
  });
});

describe('recommendPatientService（个性化服务推荐：按优先级）', () => {
  it('异常化验 + 依从性差 + 糖尿病 → 最高优先级为复查门诊，且含饮食/运动推荐', () => {
    const r = recommendPatientService('P-300', {
      knownConditions: ['2型糖尿病'],
      hasAbnormalLab: true,
      medicationAdherence: 'poor',
      focusGoal: 'glucose_control',
    });
    expect(r.services.length).toBeGreaterThan(0);
    expect(r.services[0].priority).toBe('high');
    expect(r.services[0].title).toContain('复查');
    expect(r.services.some((s) => s.type === 'diet')).toBe(true);
    expect(r.services.some((s) => s.type === 'exercise')).toBe(true);
  });

  it('红旗症状（口渴/多饮）→ 产出 high 级护士随访', () => {
    const r = recommendPatientService('P-301', { symptoms: ['口渴', '多饮'] });
    expect(r.services.some((s) => s.type === 'followup' && s.priority === 'high')).toBe(true);
  });

  it('干净上下文 → 不推紧急事项，总结平和', () => {
    const r = recommendPatientService('P-302', {});
    expect(r.services.every((s) => s.priority !== 'high')).toBe(true);
    expect(r.summary).toContain('保持');
  });
});

describe('trackPatientHealthProgress（健康进度：真实进度 vs 时间进度）', () => {
  it('减重目标：已减 2.7/7.5kg≈36%，时间过半（100/183≈55%）→ at_risk', () => {
    const r = trackPatientHealthProgress('P-400', {
      type: 'weight_loss',
      startValue: 82.5, currentValue: 79.8, targetValue: 75.0,
      unit: 'kg', daysElapsed: 100, daysTotal: 183,
    });
    expect(r.typeLabel).toBe('减重');
    expect(r.progressPercent).toBeGreaterThan(30);
    expect(r.progressPercent).toBeLessThan(45);
    expect(r.trend).toBe('improving');
    expect(r.status).toBe('at_risk');
  });

  it('已达标（当前值 ≤ 目标值，下降型）→ achieved', () => {
    const r = trackPatientHealthProgress('P-401', {
      type: 'glucose_control',
      startValue: 8.4, currentValue: 6.2, targetValue: 6.5,
      unit: '%', daysElapsed: 150, daysTotal: 183,
    });
    expect(r.achieved).toBe(true);
    expect(r.status).toBe('achieved');
    expect(r.progressPercent).toBe(100);
  });

  it('运动目标（上升型）：当前已超目标 → achieved，方向自动判定为 up', () => {
    const r = trackPatientHealthProgress('P-402', {
      type: 'exercise',
      startValue: 60, currentValue: 160, targetValue: 150,
      unit: '分钟/周', daysElapsed: 30, daysTotal: 90,
    });
    expect(r.achieved).toBe(true);
    expect(r.trend).toBe('improving');
  });

  it('进度远落后于时间 → off_track，并建议尽快就诊', () => {
    const r = trackPatientHealthProgress('P-403', {
      type: 'bp_control',
      startValue: 150, currentValue: 148, targetValue: 130,
      unit: 'mmHg', daysElapsed: 120, daysTotal: 150,
    });
    expect(r.status).toBe('off_track');
    expect(r.nextAction).toContain('预约');
  });
});
