/**
 * 健澜科技 jlmedaios - 【患者服务深化】一站式服务中心纯函数单测（M156-D）
 *
 * 覆盖：
 *   - buildPatientFullService：六大服务卡片齐全（预约挂号/在线缴费/报告查询/
 *     智能导诊/院内导航/健康档案）、patientId 脱敏、欢迎语、急诊安全提示；
 *   - 院内导航数据：科室/停车/餐饮三类点位齐全、大字路线、无障碍标记；
 *   - 健康档案：历次就诊/用药/近期检查三组汇总；
 *   - recommendDoctor：症状 → 科室 → 医生推荐（命中关键词越多分越高）、
 *     红旗症状强制急诊评分、无命中返回空、入参校验；
 *
 * 与持久化解耦：不触库（persistServiceAction 由路由层调用，单测不覆盖）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientFullService,
  recommendDoctor,
} from '../../src/bff/aggregators/patientServiceDeepAggregator';

describe('buildPatientFullService 一站式服务全集', () => {
  it('六大服务卡片齐全，覆盖挂号/缴费/报告/导诊/导航/档案', () => {
    const svc = buildPatientFullService('P000123');
    const kinds = svc.cards.map((c) => c.kind).sort() as string[];
    expect(kinds).toEqual(
      ['appointment', 'archive', 'navigation', 'payment', 'report', 'triage'].sort(),
    );
    // 预约挂号含专家号/普通号/检查号三个子类
    const appt = svc.cards.find((c) => c.kind === 'appointment');
    expect(appt?.subEntries.map((s) => s.code).sort()).toEqual(
      ['expert', 'exam', 'normal'].sort(),
    );
    // 在线缴费含门诊/住院/检查
    const pay = svc.cards.find((c) => c.kind === 'payment');
    expect(pay?.subEntries.map((s) => s.code).sort()).toEqual(
      ['check', 'inpatient', 'outpatient'].sort(),
    );
    // 报告查询含检验/检查/病理
    const rep = svc.cards.find((c) => c.kind === 'report');
    expect(rep?.subEntries.map((s) => s.code).sort()).toEqual(
      ['imaging', 'lab', 'pathology'].sort(),
    );
  });

  it('patientId 出参脱敏，含欢迎语与急诊安全提示', () => {
    const svc = buildPatientFullService('P000123');
    expect(svc.patientId).toBe('P0****23');
    expect(svc.greeting.length).toBeGreaterThan(0);
    // 导诊≠诊断：红旗症状强制 120 提示
    expect(svc.emergencyNotice).toContain('120');
  });

  it('院内导航数据：科室/停车/餐饮三类点位齐全，大字路线无障碍', () => {
    const svc = buildPatientFullService('P000123');
    const cats = new Set(svc.waypoints.map((w) => w.category));
    expect(cats.has('dept')).toBe(true);
    expect(cats.has('parking')).toBe(true);
    expect(cats.has('dining')).toBe(true);
    // 每个点位都有大字路线文字
    for (const w of svc.waypoints) {
      expect(w.routeText.length).toBeGreaterThan(0);
    }
    // 至少有无障碍点位（老年/行动不便优先）
    expect(svc.waypoints.some((w) => w.accessible)).toBe(true);
  });

  it('健康档案：历次就诊/用药/近期检查三组汇总', () => {
    const svc = buildPatientFullService('P000123');
    expect(svc.archive.visits.length).toBeGreaterThan(0);
    expect(svc.archive.medications.length).toBeGreaterThan(0);
    expect(svc.archive.recentExams.length).toBeGreaterThan(0);
    // 就诊记录含科室与诊断
    expect(svc.archive.visits[0].deptName.length).toBeGreaterThan(0);
    expect(svc.archive.visits[0].diagnosis.length).toBeGreaterThan(0);
  });

  it('入参非法抛错', () => {
    expect(() => buildPatientFullService('')).toThrow();
  });
});

describe('recommendDoctor 症状→科室→医生推荐', () => {
  it('头痛头晕推荐神经内科医生', () => {
    const docs = recommendDoctor('P000123', '头痛三天，伴头晕');
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].deptName).toBe('神经内科');
    // 医生字段完整，老人友好大字直显
    expect(docs[0].name.length).toBeGreaterThan(0);
    expect(docs[0].reason.length).toBeGreaterThan(0);
    expect(docs[0].scheduleTags.length).toBeGreaterThan(0);
  });

  it('胸闷心慌推荐心血管内科', () => {
    const docs = recommendDoctor('P000123', '胸闷心慌，高血压');
    expect(docs[0].deptName).toBe('心血管内科');
  });

  it('咳嗽发热推荐呼吸科', () => {
    const docs = recommendDoctor('P000123', '咳嗽三天，发热 38.5 度');
    expect(docs[0].deptName).toBe('呼吸与危重症医学科');
  });

  it('红旗症状强制急诊评分满分并提示 120', () => {
    const docs = recommendDoctor('P000123', '剧烈胸痛，呼吸困难');
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0].matchScore).toBe(100);
    expect(docs[0].reason).toContain('急诊');
  });

  it('症状未命中任何科室返回空数组（前端引导人工导诊台）', () => {
    const docs = recommendDoctor('P000123', '皮肤轻微瘙痒');
    expect(docs).toEqual([]);
  });

  it('入参非法抛错', () => {
    expect(() => recommendDoctor('', '头痛')).toThrow();
    expect(() => recommendDoctor('P000123', '')).toThrow();
  });
});
