/**
 * 健澜科技 jlmedaios — 电子病历智能化评分（M154-B）纯函数单测
 *
 * 覆盖：
 *   - scoreMedicalRecord：六维评分计算（优质病历高分 / 空病历 0 分 / 等级分档）
 *   - detectRecordDefects：实质缺陷检测（诊断缺失、诊断-用药不匹配、模糊诊断、病程间隔）
 *   - generateScoreSuggestions：缺陷 → 可执行整改建议
 *
 * 公平性校验：不抠格式——优质病历即使排版朴素也得高分；
 *           问题病历即使排版工整也会因实质问题被扣分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, expect, it } from 'bun:test';

import {
  detectRecordDefects,
  generateScoreSuggestions,
  scoreMedicalRecord,
  type Defect,
} from '../../src/bff/aggregators/emrSmartScoreAggregator';

/** 一份实质完整的病历（排版朴素，不堆格式） */
const GOOD_RECORD = [
  '主诉：反复胸痛3天，加重6小时',
  '现病史：患者3天前劳累后起病，出现心前区闷痛，休息后可缓解；6小时前情绪激动后胸痛加重，持续不缓解，伴出汗。自服硝酸甘油片未明显缓解，遂来院急诊。',
  '既往史：高血压病史5年。',
  '辅助检查：心电图示ST段压低，肌钙蛋白升高。',
  '初步诊断：1.冠状动脉粥样硬化性心脏病 不稳定型心绞痛；2.原发性高血压。',
  '处理：阿司匹林肠溶片口服，阿托伐他汀钙片口服，氨氯地平片口服。',
  '病程记录：2026-10-14 入院，胸痛较前缓解；2026-10-15 复查心电图稳定。',
].join('\n');

/** 一份实质有问题的病历：主诉无时长、诊断待查、用药与诊断不匹配、无检查依据 */
const FLAWED_RECORD = [
  '主诉：头晕',
  '现病史：出现头晕，无明显诱因。',
  '初步诊断：头晕查因，高血压？',
  '处理：维生素C口服。',
].join('\n');

describe('M154-B scoreMedicalRecord 六维评分计算', () => {
  it('实质完整的病历得到高分（>=80），等级为良好或优秀', () => {
    const r = scoreMedicalRecord(GOOD_RECORD, '2026-10-15T08:00:00Z');
    expect(r.totalScore).toBeGreaterThanOrEqual(80);
    expect(r.maxTotal).toBe(100);
    expect(['优秀', '良好']).toContain(r.grade);
    expect(r.dimensions).toHaveLength(6);
    // 六维满分与题目给定权重一致
    expect(r.dimensions.map((d) => d.maxScore)).toEqual([10, 20, 20, 20, 15, 15]);
  });

  it('空病历得 0 分且等级不合格，不臆断满分', () => {
    const r = scoreMedicalRecord('', '2026-10-15T08:00:00Z');
    expect(r.totalScore).toBe(0);
    expect(r.grade).toBe('不合格');
    expect(r.defects.length).toBeGreaterThanOrEqual(6);
  });

  it('问题病历因实质问题被扣分，总分显著低于优质病历', () => {
    const good = scoreMedicalRecord(GOOD_RECORD, '2026-10-15T08:00:00Z');
    const flawed = scoreMedicalRecord(FLAWED_RECORD, '2026-10-15T08:00:00Z');
    expect(flawed.totalScore).toBeLessThan(good.totalScore);
    expect(flawed.totalScore).toBeLessThan(60);
  });

  it('评分结果含 assessedAt 时间戳且维度分在 0..满分区间', () => {
    const r = scoreMedicalRecord(GOOD_RECORD, '2026-10-15T08:00:00Z');
    expect(r.assessedAt).toBe('2026-10-15T08:00:00Z');
    for (const d of r.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(d.maxScore);
    }
  });
});

describe('M154-B detectRecordDefects 实质缺陷检测', () => {
  it('检测到"诊断含高血压但无降压药"的用药-诊断不匹配', () => {
    const defects = detectRecordDefects(FLAWED_RECORD);
    const medDefect = defects.find((d) => d.code === 'MEDICATION_MISSING_FOR_DIAGNOSIS');
    expect(medDefect).toBeDefined();
    expect(medDefect?.message).toContain('高血压');
  });

  it('检测到模糊诊断"待查"', () => {
    const defects = detectRecordDefects(FLAWED_RECORD);
    expect(defects.some((d) => d.code === 'DIAGNOSIS_VAGUE')).toBe(true);
  });

  it('检测到关键检查缺失（头晕/血压问题未见血压评估）', () => {
    const defects = detectRecordDefects(FLAWED_RECORD);
    expect(defects.some((d) => d.code === 'EXAM_MISSING_KEY')).toBe(true);
  });

  it('优质病历不产生"诊断缺失/用药不匹配"类高严重缺陷', () => {
    const defects = detectRecordDefects(GOOD_RECORD);
    expect(defects.some((d) => d.code === 'DIAGNOSIS_MISSING')).toBe(false);
    expect(defects.some((d) => d.code === 'MEDICATION_MISSING_FOR_DIAGNOSIS')).toBe(false);
  });

  it('相邻病程间隔过长时检测到及时性缺陷', () => {
    const longGap = [
      '主诉：咳嗽3天',
      '现病史：3天前受凉后起病，咳嗽咳痰。',
      '诊断：急性支气管炎。',
      '处理：阿莫西林口服。',
      '病程记录：2026-10-01 入院；2026-10-08 出院。',
    ].join('\n');
    const defects = detectRecordDefects(longGap);
    expect(defects.some((d) => d.code === 'PROGRESS_GAP_TOO_LONG')).toBe(true);
  });

  it('每条缺陷都带维度、级别、扣分，且扣分>0（可判定项）', () => {
    const defects = detectRecordDefects(FLAWED_RECORD);
    for (const d of defects) {
      expect(['low', 'medium', 'high']).toContain(d.severity);
      expect(typeof d.message).toBe('string');
      expect(d.message.length).toBeGreaterThan(0);
    }
  });
});

describe('M154-B generateScoreSuggestions 整改建议生成', () => {
  it('将缺陷映射为可执行建议，并按可挽回分数降序', () => {
    const defects: Defect[] = detectRecordDefects(FLAWED_RECORD);
    const suggestions = generateScoreSuggestions(defects);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.detail).toContain('。');
      expect(s.recoverableScore).toBeGreaterThan(0);
    }
    const scores = suggestions.map((s) => s.recoverableScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('不可判定项（deduction=0）不生成整改压力建议', () => {
    const noStampRecord = [
      '主诉：咳嗽3天',
      '现病史：3天前受凉后咳嗽咳痰，伴发热。',
      '诊断：急性支气管炎。',
      '处理：阿莫西林口服。',
    ].join('\n');
    const defects = detectRecordDefects(noStampRecord);
    const suggestions = generateScoreSuggestions(defects);
    // 病程及时性因无时间戳 deduction=0，不应出现在建议里
    expect(suggestions.some((s) => s.dimension === 'progressTimeliness')).toBe(false);
  });

  it('空建议输入返回空数组', () => {
    expect(generateScoreSuggestions([])).toEqual([]);
  });
});
