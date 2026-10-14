/**
 * 健澜科技 jlmedaios - AI病历质控（M90-A）纯函数单测
 *
 * 覆盖：真实文书 → QcInput 映射（buildQcInput）、首次病程识别（isFirstProgressNote/pickFirstProgressNote）、
 * 时效换算（hoursBetween）、规则引擎 evaluateQc（完整性缺失 issue、时效扣分、口语化扣分、分数 clamp）。
 * 全部使用 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect,it } from 'bun:test';

import {
  buildQcInput,
  evaluateQc,
  hoursBetween,
  isFirstProgressNote,
  pickFirstProgressNote,
  type QcDataSource,
} from '../../src/bff/aggregators/aiNoteQcAggregator';

const ADMIT = '2026-10-14T08:00:00.000Z';

const fullAdmission = {
  chiefComplaint: '反复咳嗽咳痰3天',
  presentIllness: '患者3天前受凉后出现咳嗽，咳黄脓痰，伴发热',
  physicalExam: '双肺呼吸音粗，可闻及湿性啰音',
  preliminaryDiagnosis: '社区获得性肺炎',
  treatmentPlan: '抗感染、化痰、退热对症治疗',
};

describe('M90-A 真实文书 → 质控输入映射', () => {
  it('入院记录齐全：5 个要素全部判为已具备', () => {
    const src: QcDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: fullAdmission, firstProgressNoteAt: null,
    };
    const input = buildQcInput(src);
    expect(input.sections.chiefComplaint).toBe(true);
    expect(input.sections.presentIllness).toBe(true);
    expect(input.sections.physicalExam).toBe(true);
    expect(input.sections.diagnosis).toBe(true);
    expect(input.sections.treatment).toBe(true);
  });

  it('入院记录缺失：全部要素判为缺失（而非随机种子）', () => {
    const src: QcDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: null, firstProgressNoteAt: null,
    };
    const input = buildQcInput(src);
    expect(Object.values(input.sections).every((v) => v === false)).toBe(true);
    const { issues, score } = evaluateQc(input);
    const missingRules = issues.filter((i) => i.rule.startsWith('completeness.'));
    expect(missingRules.length).toBe(5);
    // 5 要素权重合计 60：100-60=40，且无时效/口语扣分
    expect(score).toBe(40);
  });

  it('主诉兜底：入院记录无主诉时回退就诊主表 chiefComplaint', () => {
    const src: QcDataSource = {
      admitAt: ADMIT,
      visitChiefComplaint: '胸痛2小时',
      admissionNote: { ...fullAdmission, chiefComplaint: '' },
      firstProgressNoteAt: null,
    };
    expect(buildQcInput(src).sections.chiefComplaint).toBe(true);
  });

  it('首次病程 noteDate 晚于入院 10h：firstProgressHours≈10，触发 8h 超时扣分', () => {
    const src: QcDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: fullAdmission,
      firstProgressNoteAt: '2026-10-14T18:00:00.000Z', // +10h
    };
    const input = buildQcInput(src);
    expect(input.firstProgressHours).toBeCloseTo(10, 5);
    const { issues, score } = evaluateQc(input);
    expect(issues.some((i) => i.rule === 'timeliness.first_progress_overdue')).toBe(true);
    // 要素齐全(100) - 首次病程超时(10) = 90
    expect(score).toBe(90);
  });

  it('首次病程 2h 内完成：不触发时效扣分', () => {
    const src: QcDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: fullAdmission,
      firstProgressNoteAt: '2026-10-14T10:00:00.000Z', // +2h
    };
    const input = buildQcInput(src);
    const { issues } = evaluateQc(input);
    expect(issues.some((i) => i.rule.startsWith('timeliness.'))).toBe(false);
  });
});

describe('M90-A 首次病程识别与时效换算', () => {
  it('isFirstProgressNote 兼容中文「首次病程」与英文 first_progress', () => {
    expect(isFirstProgressNote('首次病程')).toBe(true);
    expect(isFirstProgressNote('first_progress')).toBe(true);
    expect(isFirstProgressNote('日常病程')).toBe(false);
    expect(isFirstProgressNote(undefined)).toBe(false);
  });

  it('pickFirstProgressNote 从多条病程中取最早一条首次病程', () => {
    const notes = [
      { noteType: '日常病程', noteDate: '2026-10-16T08:00:00.000Z' },
      { noteType: '首次病程', noteDate: '2026-10-14T12:00:00.000Z' },
      { noteType: '首次病程', noteDate: '2026-10-14T10:00:00.000Z' },
    ];
    const picked = pickFirstProgressNote(notes);
    expect(picked?.noteDate).toBe('2026-10-14T10:00:00.000Z');
    expect(pickFirstProgressNote([{ noteType: '日常病程', noteDate: ADMIT }])).toBeNull();
  });

  it('hoursBetween：缺失或非法时间返回 null（不臆造扣分）', () => {
    expect(hoursBetween(ADMIT, null)).toBeNull();
    expect(hoursBetween(null, ADMIT)).toBeNull();
    expect(hoursBetween('not-a-date', ADMIT)).toBeNull();
    expect(hoursBetween(ADMIT, '2026-10-14T20:00:00.000Z')).toBeCloseTo(12, 5);
  });
});

describe('M90-A 规则引擎与分数 clamp', () => {
  it('口语化用词：产出一条 warning 并扣分', () => {
    const input = buildQcInput({
      admitAt: ADMIT, visitChiefComplaint: null,
      admissionNote: { ...fullAdmission, presentIllness: '患者一般情况挺好，没什么事' },
      firstProgressNoteAt: '2026-10-14T10:00:00.000Z',
    });
    const { issues, score } = evaluateQc(input);
    expect(issues.some((i) => i.rule === 'terminology.colloquial')).toBe(true);
    // 要素齐全 100 - 口语化 5 = 95
    expect(score).toBe(95);
  });

  it('任意输入下分数始终 clamp 在 0-100', () => {
    const extreme = {
      sections: { chiefComplaint: false, presentIllness: false, physicalExam: false, diagnosis: false, treatment: false },
      admissionHours: 100, firstProgressHours: 100,
      noteText: '挺好 没事 差不多',
    };
    const { score } = evaluateQc(extreme);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
