/**
 * 健澜科技 jlmedaios - M122-A 智能导诊助手单测
 *
 * 覆盖：
 *  1. 症状关键词匹配：不同症状命中不同科室；
 *  2. 科室推荐排序：按 score 降序，返回 top 3；
 *  3. 紧急度判断：红旗症状 → emergency/urgent/routine；
 *  4. 医生池过滤：按首选科室推荐；
 *  5. 就诊前准备：过敏/慢病/科室加权提示；
 *  6. 空输入：返回空态与提示文案。
 *
 * 全部为纯函数断言，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import buildPatientGuide, {
  type DoctorProfile,
} from '../../src/bff/aggregators/patientGuideAggregator';

const pool: DoctorProfile[] = [
  { id: 'd1', name: '王医生', title: '主任医师', deptCode: 'CARD', deptName: '心血管内科', rating: 4.8, scheduleTags: ['今日有号'] },
  { id: 'd2', name: '李医生', title: '副主任医师', deptCode: 'NEURO', deptName: '神经内科', rating: 4.6 },
  { id: 'd3', name: '赵医生', title: '主治医师', deptCode: 'GASTRO', deptName: '消化内科', rating: 4.5 },
  { id: 'd4', name: '陈医生', title: '主任医师', deptCode: 'RESP', deptName: '呼吸与危重症医学科', rating: 4.7 },
];

describe('M122-A 智能导诊：症状匹配与科室推荐', () => {
  it('空症状：返回空科室列表并给出提示', () => {
    const r = buildPatientGuide('');
    expect(r.topDepts).toEqual([]);
    expect(r.recommendedDoctors).toEqual([]);
    expect(r.urgency.level).toBe('routine');
    expect(r.prepAdvice.length).toBeGreaterThan(0);
  });

  it('胸痛 → 首选心血管内科，并命中红旗症状', () => {
    const r = buildPatientGuide('我最近一周反复胸痛，活动后加重');
    expect(r.topDepts.length).toBeGreaterThan(0);
    expect(r.topDepts[0].deptCode).toBe('CARD');
    expect(r.topDepts[0].matchedSymptoms).toContain('胸痛');
    expect(r.urgency.level).toBe('emergency');
    expect(r.urgency.recommendER).toBe(true);
    expect(r.urgency.redFlags).toContain('胸痛');
  });

  it('头痛头晕 → 首选神经内科', () => {
    const r = buildPatientGuide('头痛三天，伴头晕和恶心');
    expect(r.topDepts[0].deptCode).toBe('NEURO');
    expect(r.topDepts[0].matchedSymptoms).toContain('头痛');
  });

  it('腹痛腹泻 → 首选消化内科', () => {
    const r = buildPatientGuide('今天开始腹痛、腹泻三次，恶心');
    expect(r.topDepts[0].deptCode).toBe('GASTRO');
  });

  it('咳嗽发热 → 首选呼吸科', () => {
    const r = buildPatientGuide('咳嗽一周，有痰，发热 38.5 度');
    expect(r.topDepts[0].deptCode).toBe('RESP');
  });

  it('糖尿病血糖 → 首选内分泌科', () => {
    const r = buildPatientGuide('最近血糖偏高，多饮多尿');
    expect(r.topDepts[0].deptCode).toBe('ENDO');
  });

  it('月经不调 → 妇科', () => {
    const r = buildPatientGuide('月经不调，痛经明显');
    expect(r.topDepts[0].deptCode).toBe('GYNE');
  });

  it('皮疹瘙痒 → 皮肤科', () => {
    const r = buildPatientGuide('全身皮疹瘙痒，怀疑过敏');
    expect(r.topDepts[0].deptCode).toBe('DERM');
  });

  it('科室返回数量上限为 3', () => {
    const r = buildPatientGuide('头痛胸痛腹痛咳嗽皮疹');
    expect(r.topDepts.length).toBeLessThanOrEqual(3);
    // 按 score 降序
    for (let i = 1; i < r.topDepts.length; i++) {
      expect(r.topDepts[i - 1].score).toBeGreaterThanOrEqual(r.topDepts[i].score);
    }
  });
});

describe('M122-A 智能导诊：紧急度判断', () => {
  it('偏瘫/言语不清 → emergency 并建议 120', () => {
    const r = buildPatientGuide('家人突发右侧偏瘫，言语不清，意识模糊');
    expect(r.urgency.level).toBe('emergency');
    expect(r.urgency.recommendER).toBe(true);
    expect(r.urgency.redFlags).toEqual(expect.arrayContaining(['偏瘫', '言语不清']));
  });

  it('剧烈腹痛 → urgent', () => {
    const r = buildPatientGuide('突然剧烈腹痛，直不起腰');
    expect(r.urgency.level).toBe('urgent');
    expect(r.urgency.recommendER).toBe(true);
  });

  it('普通慢性不适 → routine', () => {
    const r = buildPatientGuide('最近两周睡眠不好，有点焦虑');
    expect(r.urgency.level).toBe('routine');
    expect(r.urgency.recommendER).toBe(false);
  });

  it('呕血/黑便 → emergency', () => {
    const r = buildPatientGuide('今天早上呕血一次，拉黑便');
    expect(r.urgency.level).toBe('emergency');
  });
});

describe('M122-A 智能导诊：医生推荐与就诊准备', () => {
  it('按首选科室推荐医生，匹配度最高的排第一', () => {
    const r = buildPatientGuide('反复胸痛、胸闷', {}, pool);
    expect(r.recommendedDoctors.length).toBeGreaterThan(0);
    expect(r.recommendedDoctors[0].deptName).toBe('心血管内科');
    expect(r.recommendedDoctors[0].id).toBe('d1');
  });

  it('医生池为空时，recommendedDoctors 为空数组', () => {
    const r = buildPatientGuide('头痛头晕');
    expect(r.recommendedDoctors).toEqual([]);
  });

  it('有过敏史 → prepAdvice 包含过敏告知提示', () => {
    const r = buildPatientGuide('头痛头晕', { allergies: ['青霉素'] });
    expect(r.prepAdvice.some((a) => a.includes('青霉素'))).toBe(true);
  });

  it('有慢病 → prepAdvice 包含携带报告提示', () => {
    const r = buildPatientGuide('头痛头晕', { chronicConditions: ['高血压'] });
    expect(r.prepAdvice.some((a) => a.includes('高血压'))).toBe(true);
  });

  it('消化内科命中 → 包含空腹提示', () => {
    const r = buildPatientGuide('腹痛腹泻');
    expect(r.prepAdvice.some((a) => a.includes('空腹'))).toBe(true);
  });

  it('妇科命中 → 包含避开经期提示', () => {
    const r = buildPatientGuide('月经不调、痛经');
    expect(r.prepAdvice.some((a) => a.includes('经期'))).toBe(true);
  });
});
