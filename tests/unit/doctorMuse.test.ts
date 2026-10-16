/**
 * 健澜科技 jlmedaios - Doctor MUSE 个人医生智能体聚合器单测（M169-B）
 *
 * 知识图谱与Personal Agent：
 * 覆盖：
 *  - buildDoctorMUSEProfile：空集兜底 / 四维计数 / 成功率 4 位小数 /
 *    用药常用药频次与不良反应去重 / 手术术式与术中术后要点去重 /
 *    沟通技巧与反馈改进点去重；
 *  - recordDoctorExperience：纯函数追加（不修改入参）、计数与成功率重算、
 *    标签并入 Top10、药品/术式/技巧频次 +1、不良反应/术中判断去重追加；
 *  - recommendFromMUSE：维度过滤 / 关键词命中打分 / 失败与反思优先 /
 *    空上下文只召回失败与反思 / 隐私安全（不读他人经验）；
 *  - compareWithPeer：中位数与 P75 聚合 / 维度差距 delta / 空同行组退化为 0 /
 *    隐私声明存在（不暴露同行案例）。
 *
 * 注意：纯函数测试，不连接 PostgreSQL，不打库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDoctorMUSEProfile,
  compareWithPeer,
  recordDoctorExperience,
  recommendFromMUSE,
  type DoctorExperience,
} from '../../src/bff/aggregators/doctorMuseAggregator.js';

/** 造一条诊断类经验 */
function mkDiagnosis(outcome: DoctorExperience['outcome'], tags: string[] = []): DoctorExperience {
  return { category: 'diagnosis', outcome, title: `诊断-${outcome}`, tags };
}
/** 造一条用药类经验 */
function mkMedication(
  outcome: DoctorExperience['outcome'],
  drugName: string,
  adverseReaction?: string,
): DoctorExperience {
  return { category: 'medication', outcome, title: `用药-${drugName}`, drugName, adverseReaction };
}
/** 造一条手术类经验 */
function mkSurgery(
  outcome: DoctorExperience['outcome'],
  procedure: string,
  intraOpJudgment?: string,
): DoctorExperience {
  return { category: 'surgery', outcome, title: `手术-${procedure}`, procedure, intraOpJudgment };
}
/** 造一条沟通类经验 */
function mkCommunication(outcome: DoctorExperience['outcome'], technique: string): DoctorExperience {
  return { category: 'communication', outcome, title: `沟通-${technique}`, technique };
}

describe('buildDoctorMUSEProfile - 空集兜底', () => {
  it('null / undefined / 空数组返回零值画像，不抛错', () => {
    for (const input of [null, undefined, [] as DoctorExperience[]]) {
      const p = buildDoctorMUSEProfile('d001', input);
      expect(p.staffId).toBe('d001');
      expect(p.totalExperiences).toBe(0);
      expect(p.categoryCounts.diagnosis).toBe(0);
      expect(p.categoryCounts.medication).toBe(0);
      expect(p.categoryCounts.surgery).toBe(0);
      expect(p.categoryCounts.communication).toBe(0);
      expect(p.outcomeCounts.success).toBe(0);
      expect(p.outcomeCounts.failure).toBe(0);
      expect(p.outcomeCounts.reflection).toBe(0);
      expect(p.successRate).toBe(0);
      expect(p.topTags).toEqual([]);
      expect(p.privacyNotice).toContain('不公开');
    }
  });
});

describe('buildDoctorMUSEProfile - 四维聚合', () => {
  const experiences: DoctorExperience[] = [
    mkDiagnosis('success', ['心衰', '鉴别']),
    mkDiagnosis('failure', ['心衰']),
    mkDiagnosis('reflection'),
    mkMedication('success', '依诺肝素'),
    mkMedication('failure', '左氧氟沙星', 'INR 4.2 出血'),
    mkMedication('success', '依诺肝素'),
    mkSurgery('success', '腹腔镜胆囊切除术', 'Calot 三角先置观察孔'),
    mkSurgery('reflection', '腹腔镜阑尾切除术'),
    mkCommunication('success', '三层信息法'),
    mkCommunication('failure', '三层信息法'),
  ];

  it('四维计数与结局计数正确', () => {
    const p = buildDoctorMUSEProfile('d001', experiences);
    expect(p.totalExperiences).toBe(10);
    expect(p.categoryCounts.diagnosis).toBe(3);
    expect(p.categoryCounts.medication).toBe(3);
    expect(p.categoryCounts.surgery).toBe(2);
    expect(p.categoryCounts.communication).toBe(2);
    expect(p.outcomeCounts.success).toBe(5);
    expect(p.outcomeCounts.failure).toBe(3);
    expect(p.outcomeCounts.reflection).toBe(2);
  });

  it('成功率 = success/total，保留 4 位小数', () => {
    const p = buildDoctorMUSEProfile('d001', experiences);
    // 5/10 = 0.5
    expect(p.successRate).toBe(0.5);
  });

  it('诊断三维计数正确', () => {
    const p = buildDoctorMUSEProfile('d001', experiences);
    expect(p.diagnosis.successCases).toBe(1);
    expect(p.diagnosis.failureCases).toBe(1);
    expect(p.diagnosis.reflections).toBe(1);
  });

  it('用药：常用药频次排序 + 不良反应去重', () => {
    const p = buildDoctorMUSEProfile('d001', experiences);
    expect(p.medication.commonDrugs[0]).toEqual({ name: '依诺肝素', count: 2 });
    expect(p.medication.commonDrugs[1].name).toBe('左氧氟沙星');
    expect(p.medication.adverseReactions).toEqual(['INR 4.2 出血']);
  });

  it('手术：术式频次 + 术中判断去重', () => {
    const p = buildDoctorMUSEProfile('d001', experiences);
    expect(p.surgery.procedures.length).toBe(2);
    expect(p.surgery.intraOpJudgments).toContain('Calot 三角先置观察孔');
  });

  it('沟通：技巧频次合并计数', () => {
    const p = buildDoctorMUSEProfile('d001', experiences);
    const tech = p.communication.techniques.find((t) => t.name === '三层信息法');
    expect(tech?.count).toBe(2);
  });

  it('topTags 按频次降序，并列按字典序', () => {
    const p = buildDoctorMUSEProfile('d001', experiences);
    expect(p.topTags[0]).toEqual({ tag: '心衰', count: 2 });
  });
});

describe('recordDoctorExperience - 纯函数追加', () => {
  const base = buildDoctorMUSEProfile('d001', [
    mkDiagnosis('success', ['心衰']),
    mkMedication('success', '依诺肝素'),
  ]);

  it('不修改入参 profile', () => {
    const before = JSON.stringify(base);
    recordDoctorExperience(base, mkDiagnosis('failure', ['心衰']));
    expect(JSON.stringify(base)).toBe(before);
  });

  it('追加后 totalExperiences +1，成功率重算', () => {
    const next = recordDoctorExperience(base, mkDiagnosis('failure', ['心衰']));
    expect(next.totalExperiences).toBe(3);
    // success 仍为 2，total=3 → 0.6667
    expect(next.successRate).toBe(0.6667);
    expect(next.outcomeCounts.failure).toBe(1);
  });

  it('新标签并入 topTags，已存在标签频次 +1', () => {
    const next = recordDoctorExperience(base, mkDiagnosis('failure', ['心衰', '胸痛']));
    const heart = next.topTags.find((t) => t.tag === '心衰');
    expect(heart?.count).toBe(2);
    expect(next.topTags.some((t) => t.tag === '胸痛')).toBe(true);
  });

  it('用药：药品频次 +1，不良反应去重追加', () => {
    const next = recordDoctorExperience(
      base,
      mkMedication('failure', '依诺肝素', '皮下瘀斑'),
    );
    const drug = next.medication.commonDrugs.find((d) => d.name === '依诺肝素');
    expect(drug?.count).toBe(2);
    expect(next.medication.adverseReactions).toContain('皮下瘀斑');
    // 重复不良反应不重复追加
    const next2 = recordDoctorExperience(next, mkMedication('failure', '依诺肝素', '皮下瘀斑'));
    expect(next2.medication.adverseReactions.filter((a) => a === '皮下瘀斑').length).toBe(1);
  });
});

describe('recommendFromMUSE - 本人经验召回', () => {
  const experiences: DoctorExperience[] = [
    mkDiagnosis('failure', ['心衰', '老年']),
    mkDiagnosis('success', ['心衰']),
    mkDiagnosis('reflection', ['胸痛']),
    mkMedication('failure', '左氧氟沙星'),
    mkMedication('success', '依诺肝素'),
    mkCommunication('success', '三层信息法'),
  ];

  it('空上下文只召回失败与反思（成功案例不打扰）', () => {
    const recs = recommendFromMUSE('d001', {}, experiences);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(['warning', 'reflection']).toContain(r.kind);
    }
  });

  it('维度过滤：category=medication 只返回用药类', () => {
    const recs = recommendFromMUSE('d001', { category: 'medication' }, experiences);
    for (const r of recs) expect(r.category).toBe('medication');
  });

  it('关键词命中：命中「心衰」的诊断失败案例排前', () => {
    const recs = recommendFromMUSE('d001', { keywords: ['心衰'] }, experiences);
    expect(recs.length).toBeGreaterThan(0);
    // 失败案例 kind=warning 应在最前
    expect(recs[0].kind).toBe('warning');
    expect(recs[0].title).toContain('诊断-failure');
  });

  it('关键词不命中任何经验时返回空数组', () => {
    const recs = recommendFromMUSE('d001', { keywords: ['不存在的词xyz'] }, experiences);
    expect(recs).toEqual([]);
  });

  it('limit 截断', () => {
    const recs = recommendFromMUSE('d001', {}, experiences, 1);
    expect(recs.length).toBe(1);
  });

  it('空经验集返回空数组，不抛错', () => {
    expect(recommendFromMUSE('d001', { keywords: ['心衰'] }, null)).toEqual([]);
  });
});

describe('compareWithPeer - 同行聚合对比', () => {
  const self = buildDoctorMUSEProfile('d001', [
    mkDiagnosis('success'),
    mkDiagnosis('success'),
    mkMedication('success', '依诺肝素'),
    mkSurgery('success', '腹腔镜胆囊切除术'),
  ]);
  const peers = [
    { totalExperiences: 10, successRate: 0.7, categoryCounts: { diagnosis: 4, medication: 3, surgery: 2, communication: 1 } },
    { totalExperiences: 20, successRate: 0.9, categoryCounts: { diagnosis: 8, medication: 6, surgery: 4, communication: 2 } },
    { totalExperiences: 15, successRate: 0.8, categoryCounts: { diagnosis: 6, medication: 4, surgery: 3, communication: 2 } },
  ];

  it('返回 self / peerMedian / peerP75 三段', () => {
    const cmp = compareWithPeer('d001', self, peers);
    expect(cmp.self.staffId).toBe('d001');
    expect(cmp.peerMedian.label).toBe('同行中位数');
    expect(cmp.peerP75.label).toBe('同行 P75');
    expect(cmp.peerMedian.totalExperiences).toBe(15);
    expect(cmp.peerP75.totalExperiences).toBe(20);
  });

  it('四维 gaps 均有 advice 与 delta', () => {
    const cmp = compareWithPeer('d001', self, peers);
    expect(cmp.gaps.length).toBe(4);
    for (const g of cmp.gaps) {
      expect(typeof g.delta).toBe('number');
      expect(g.advice.length).toBeGreaterThan(0);
    }
  });

  it('隐私声明存在，且不暴露同行 staffId', () => {
    const cmp = compareWithPeer('d001', self, peers);
    expect(cmp.privacyNote).toContain('不展示任何同行');
    // peerMedian / peerP75 只有 label，没有 staffId 字段
    expect((cmp.peerMedian as unknown as Record<string, unknown>).staffId).toBeUndefined();
  });

  it('空同行组退化为 0 基准，不抛错', () => {
    const cmp = compareWithPeer('d001', self, []);
    expect(cmp.peerMedian.totalExperiences).toBe(0);
    expect(cmp.peerP75.totalExperiences).toBe(0);
    expect(cmp.peerMedian.successRate).toBe(0);
  });
});
