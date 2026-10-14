/**
 * 健澜科技 jlmedaios - 病历终末质控评分（M90-B）纯函数单测
 *
 * 覆盖：gradeFromScore 分级边界（90/75/74/89）、规则引擎扣分与 clamp、
 * 真实文书/首页上下文 → TerminalInput 映射。全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildTerminalInput,
  evaluateTerminal,
  gradeFromScore,
  type TerminalDataSource,
} from '../../src/bff/aggregators/terminalQcAggregator';

const ADMIT = '2026-10-14T08:00:00.000Z';

const fullAdmission = {
  chiefComplaint: '反复咳嗽咳痰3天',
  presentIllness: '患者3天前受凉后出现咳嗽，咳黄脓痰，伴发热',
  physicalExam: '双肺呼吸音粗，可闻及湿性啰音',
  preliminaryDiagnosis: '社区获得性肺炎',
  treatmentPlan: '抗感染、化痰、退热对症治疗',
};

describe('M90-B gradeFromScore 分级边界', () => {
  it('90 分 → 甲级（≥90）', () => {
    expect(gradeFromScore(90)).toBe('甲级');
  });
  it('89 分 → 乙级（75-89）', () => {
    expect(gradeFromScore(89)).toBe('乙级');
  });
  it('75 分 → 乙级（含 75）', () => {
    expect(gradeFromScore(75)).toBe('乙级');
  });
  it('74 分 → 丙级（<75）', () => {
    expect(gradeFromScore(74)).toBe('丙级');
  });
  it('边界外延：100 甲级 / 0 丙级', () => {
    expect(gradeFromScore(100)).toBe('甲级');
    expect(gradeFromScore(0)).toBe('丙级');
  });
});

describe('M90-B 规则引擎', () => {
  it('文书齐全 + 首页完整 + 首次病程 2h：满分 100，无 issue', () => {
    const src: TerminalDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: fullAdmission,
      firstProgressNoteAt: '2026-10-14T10:00:00.000Z',
      frontPage: { primaryDiagnosis: 'J18.9 肺炎' },
    };
    const { score, issues } = evaluateTerminal(buildTerminalInput(src));
    expect(score).toBe(100);
    expect(issues.length).toBe(0);
  });

  it('首页缺失：扣 10 分并产出 frontpage.missing', () => {
    const src: TerminalDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: fullAdmission,
      firstProgressNoteAt: '2026-10-14T10:00:00.000Z',
      frontPage: null,
    };
    const { score, issues } = evaluateTerminal(buildTerminalInput(src));
    expect(issues.some((i) => i.rule === 'frontpage.missing')).toBe(true);
    expect(score).toBe(90);
  });

  it('首页已建但主诊断空缺：扣 10 分并产出 primary_diagnosis_missing', () => {
    const src: TerminalDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: fullAdmission,
      firstProgressNoteAt: '2026-10-14T10:00:00.000Z',
      frontPage: { primaryDiagnosis: null },
    };
    const { score, issues } = evaluateTerminal(buildTerminalInput(src));
    expect(issues.some((i) => i.rule === 'frontpage.primary_diagnosis_missing')).toBe(true);
    expect(score).toBe(90);
  });

  it('首次病程 10h 才完成：触发时效扣分', () => {
    const src: TerminalDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: fullAdmission,
      firstProgressNoteAt: '2026-10-14T18:00:00.000Z',
      frontPage: { primaryDiagnosis: 'J18.9 肺炎' },
    };
    const { score, issues } = evaluateTerminal(buildTerminalInput(src));
    expect(issues.some((i) => i.rule === 'timeliness.first_progress_overdue')).toBe(true);
    expect(score).toBe(90);
  });

  it('所有要素缺失 + 首页缺失：分数 clamp 在 0-100', () => {
    const src: TerminalDataSource = {
      admitAt: ADMIT, visitChiefComplaint: null, admissionNote: null,
      firstProgressNoteAt: null, frontPage: null,
    };
    const { score } = evaluateTerminal(buildTerminalInput(src));
    // 5 要素 60 + 首页缺失 10 = 70，不越界
    expect(score).toBe(30);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
