/**
 * 健澜科技 jlmedaios - M125-B 演示数据生成器单测
 *
 * 覆盖：
 *  1. 「演示就绪」数据可正常生成；
 *  2. 各类实体数量严格达标（COUNT_* 常量）；
 *  3. 同一 seed 两次调用结果完全一致（确定性）；
 *  4. 外键一致性：deptId / doctorId / patientId / visitId / staffId 均指向已存在实体。
 *
 * 全部为纯函数断言，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  generateDemoData,
  COUNT_DEPARTMENTS,
  COUNT_DOCTORS,
  COUNT_NURSES,
  COUNT_PHARMACISTS,
  COUNT_ADMINS,
  COUNT_PATIENTS,
  COUNT_VISITS,
  COUNT_PRESCRIPTIONS,
  COUNT_ADMISSIONS,
  COUNT_STAFF_MEMORIES,
  COUNT_PATIENT_FEEDBACKS,
  type Staff,
} from '../../src/bff/aggregators/demoDataGenerator';

const demo = generateDemoData();

/** 收集全部员工 ID（医生/护士/药师/管理员） */
function allStaffIds(d = demo): Set<string> {
  return new Set([...d.doctors, ...d.nurses, ...d.pharmacists, ...d.admins].map((s: Staff) => s.id));
}

describe('M125-B 演示数据生成', () => {
  it('「演示就绪」：能生成完整数据集', () => {
    expect(demo).toBeDefined();
    expect(demo.generatedAt).toBeTypeOf('string');
  });

  it('数据量达标：科室/医生/护士/药师/管理员', () => {
    expect(demo.departments).toHaveLength(COUNT_DEPARTMENTS);
    expect(demo.doctors).toHaveLength(COUNT_DOCTORS);
    expect(demo.nurses).toHaveLength(COUNT_NURSES);
    expect(demo.pharmacists).toHaveLength(COUNT_PHARMACISTS);
    expect(demo.admins).toHaveLength(COUNT_ADMINS);
  });

  it('数据量达标：患者/就诊/处方/住院', () => {
    expect(demo.patients).toHaveLength(COUNT_PATIENTS);
    expect(demo.visits).toHaveLength(COUNT_VISITS);
    expect(demo.prescriptions).toHaveLength(COUNT_PRESCRIPTIONS);
    expect(demo.admissions).toHaveLength(COUNT_ADMISSIONS);
  });

  it('数据量达标：员工经验记忆/患者反馈', () => {
    expect(demo.staffDecisionMemories).toHaveLength(COUNT_STAFF_MEMORIES);
    expect(demo.patientFeedbacks).toHaveLength(COUNT_PATIENT_FEEDBACKS);
  });

  it('确定性：同一 seed 两次生成结果完全一致', () => {
    const a = generateDemoData(42);
    const b = generateDemoData(42);
    expect(a).toEqual(b);
  });

  it('外键一致：所有员工的 deptId 均指向已存在科室', () => {
    const deptIds = new Set(demo.departments.map((d) => d.id));
    for (const staff of [...demo.doctors, ...demo.nurses, ...demo.pharmacists, ...demo.admins]) {
      expect(deptIds.has(staff.deptId)).toBe(true);
    }
  });

  it('外键一致：就诊记录的 patientId / doctorId / deptId 均有效', () => {
    const patientIds = new Set(demo.patients.map((p) => p.id));
    const doctorIds = new Set(demo.doctors.map((d) => d.id));
    const deptIds = new Set(demo.departments.map((d) => d.id));
    for (const v of demo.visits) {
      expect(patientIds.has(v.patientId)).toBe(true);
      expect(doctorIds.has(v.doctorId)).toBe(true);
      expect(deptIds.has(v.deptId)).toBe(true);
    }
  });

  it('外键一致：处方挂在有效就诊下，且患者/医生与就诊一致', () => {
    const visitById = new Map(demo.visits.map((v) => [v.id, v]));
    for (const rx of demo.prescriptions) {
      const visit = visitById.get(rx.visitId);
      expect(visit).toBeDefined();
      expect(rx.patientId).toBe(visit!.patientId);
      expect(rx.doctorId).toBe(visit!.doctorId);
    }
  });

  it('外键一致：住院记录的 patientId / doctorId / deptId 均有效', () => {
    const patientIds = new Set(demo.patients.map((p) => p.id));
    const doctorIds = new Set(demo.doctors.map((d) => d.id));
    const deptIds = new Set(demo.departments.map((d) => d.id));
    for (const ad of demo.admissions) {
      expect(patientIds.has(ad.patientId)).toBe(true);
      expect(doctorIds.has(ad.doctorId)).toBe(true);
      expect(deptIds.has(ad.deptId)).toBe(true);
      // 离院时间必须晚于入院时间
      if (ad.dischargedAt !== null) {
        expect(new Date(ad.dischargedAt).getTime()).toBeGreaterThan(new Date(ad.admittedAt).getTime());
      }
    }
  });

  it('外键一致：员工经验记忆的 staffId / deptId 均有效', () => {
    const staffIds = allStaffIds();
    const deptIds = new Set(demo.departments.map((d) => d.id));
    for (const m of demo.staffDecisionMemories) {
      expect(staffIds.has(m.staffId)).toBe(true);
      expect(deptIds.has(m.deptId)).toBe(true);
    }
  });

  it('外键一致：患者反馈的 patientId / staffId 均有效', () => {
    const patientIds = new Set(demo.patients.map((p) => p.id));
    const staffIds = allStaffIds();
    for (const fb of demo.patientFeedbacks) {
      expect(patientIds.has(fb.patientId)).toBe(true);
      expect(staffIds.has(fb.staffId)).toBe(true);
      expect(fb.score).toBeGreaterThanOrEqual(1);
      expect(fb.score).toBeLessThanOrEqual(5);
    }
  });

  it('ID 唯一性：各实体主键不重复', () => {
    const uniq = (arr: string[]): boolean => new Set(arr).size === arr.length;
    expect(uniq(demo.departments.map((d) => d.id))).toBe(true);
    expect(uniq(demo.doctors.map((d) => d.id))).toBe(true);
    expect(uniq(demo.patients.map((p) => p.id))).toBe(true);
    expect(uniq(demo.visits.map((v) => v.id))).toBe(true);
    expect(uniq(demo.prescriptions.map((r) => r.id))).toBe(true);
  });
});
