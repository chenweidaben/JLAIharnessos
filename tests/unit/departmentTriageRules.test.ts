/**
 * 健澜科技 jlmedaios - 科室推荐规则引擎单测（M3-P）
 *
 * 覆盖：各科室关键词命中、急症强关键词置顶、加权排序、兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, it, expect } from 'bun:test';
import {
  recommendDepartments,
  DEPARTMENT_RULES,
} from '../../src/knowledge/rules/departmentTriageRules';

describe('M3-P 科室推荐规则引擎', () => {
  it('呼吸症状：咳嗽发热咽痛 → 呼吸内科命中', () => {
    const r = recommendDepartments('咳嗽发热两天，咽痛，鼻塞');
    expect(r.length).toBeGreaterThan(0);
    const depts = r.map((x) => x.department);
    expect(depts).toContain('呼吸内科');
  });

  it('心血管症状：胸痛胸闷心悸 → 心血管内科命中', () => {
    const r = recommendDepartments('胸痛胸闷，活动后心悸气促');
    expect(r.map((x) => x.department)).toContain('心血管内科');
  });

  it('消化症状：腹痛腹泻恶心呕吐 → 消化内科命中', () => {
    const r = recommendDepartments('腹痛腹泻，恶心呕吐，反酸');
    expect(r.map((x) => x.department)).toContain('消化内科');
  });

  it('内分泌症状：多饮多尿多食体重下降 → 内分泌科', () => {
    const r = recommendDepartments('最近多饮多尿，多食但体重下降，乏力');
    expect(r.map((x) => x.department)).toContain('内分泌科');
  });

  it('神经症状：头痛头晕肢体麻木 → 神经内科', () => {
    const r = recommendDepartments('头痛头晕，一侧肢体麻木无力');
    expect(r.map((x) => x.department)).toContain('神经内科');
  });

  it('泌尿症状：尿频尿急尿痛 → 泌尿外科', () => {
    const r = recommendDepartments('尿频尿急尿痛，排尿困难');
    expect(r.map((x) => x.department)).toContain('泌尿外科');
  });

  it('儿童症状：儿童发烧 → 儿科', () => {
    const r = recommendDepartments('孩子发烧咳嗽，儿童');
    expect(r.map((x) => x.department)).toContain('儿科');
  });

  it('骨科症状：关节痛外伤骨折 → 骨科', () => {
    const r = recommendDepartments('膝关节疼痛，外伤后肿胀，活动受限');
    expect(r.map((x) => x.department)).toContain('骨科');
  });

  it('皮肤症状：皮疹瘙痒 → 皮肤科', () => {
    const r = recommendDepartments('皮肤瘙痒，皮疹，红斑');
    expect(r.map((x) => x.department)).toContain('皮肤科');
  });

  it('眼科症状：眼红视力下降 → 眼科', () => {
    const r = recommendDepartments('眼睛红，视力下降，眼痛');
    expect(r.map((x) => x.department)).toContain('眼科');
  });

  it('耳鼻喉症状：鼻塞耳鸣咽痛 → 耳鼻喉科', () => {
    const r = recommendDepartments('鼻塞，耳鸣，听力下降');
    expect(r.map((x) => x.department)).toContain('耳鼻喉科');
  });

  it('急症强关键词：昏迷 → 急诊科置顶且 confidence 高', () => {
    const r = recommendDepartments('患者突然昏迷，意识不清');
    expect(r[0].department).toBe('急诊科');
    expect(r[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('急症强关键词：抽搐、休克、大出血 → 急诊置顶', () => {
    for (const s of ['突发抽搐', '休克，血压下降', '大出血，呕血']) {
      const r = recommendDepartments(s);
      expect(r[0].department).toBe('急诊科');
    }
  });

  it('无匹配症状：兜底内科并提示人工分诊', () => {
    const r = recommendDepartments('就是浑身不舒服，说不上来');
    expect(r.length).toBeGreaterThan(0);
    expect(r.map((x) => x.department)).toContain('内科');
  });

  it('返回数量受 limit 控制', () => {
    const r = recommendDepartments('头痛发热咳嗽腹痛腹泻', 2);
    expect(r.length).toBeLessThanOrEqual(2);
  });

  it('confidence 落在 [0,1] 范围', () => {
    const r = recommendDepartments('头痛发热咳嗽');
    for (const x of r) {
      expect(x.confidence).toBeGreaterThanOrEqual(0);
      expect(x.confidence).toBeLessThanOrEqual(1);
      expect(x.matchedKeywords.length).toBeGreaterThan(0);
    }
  });

  it('规则表覆盖至少 13 个科室', () => {
    expect(DEPARTMENT_RULES.length).toBeGreaterThanOrEqual(13);
  });
});
