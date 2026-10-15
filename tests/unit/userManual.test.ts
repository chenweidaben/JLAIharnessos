/**
 * 健澜科技 jlmedaios - 用户操作手册聚合器单测（M132-B，产品化收尾）
 *
 * 覆盖：
 *  1. 手册完整性：getUserManual 返回结构完整、章节/步骤总数与展平列表一致；
 *  2. 角色过滤：doctor/nurse/pharmacist/admin/patient 仅可见通用章节 + 本角色章节，
 *     未知/空角色回退 doctor；
 *  3. 目录结构：toc 与 chapters 同序同 id，stepCount 与章节步骤数一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  getUserManual,
  normalizeManualRole,
  USER_MANUAL_CHAPTERS,
  MANUAL_VERSION,
  type ManualRole,
} from '@/bff/aggregators/userManualAggregator.js';

const NOW = '2026-01-01T00:00:00.000Z';

/** 各角色专属章节 id 集合 */
const ROLE_CHAPTER_IDS: Record<Exclude<ManualRole, never>, string[]> = {
  doctor: ['doctor-outpatient', 'doctor-inpatient', 'doctor-prescription', 'doctor-emr'],
  nurse: ['nurse-handoff', 'nurse-nursing-note', 'nurse-med-admin'],
  pharmacist: ['pharmacy-review', 'pharmacy-dispense', 'pharmacy-adr'],
  admin: ['admin-account', 'admin-monitor', 'admin-audit'],
  patient: ['patient-appointment', 'patient-report', 'patient-consult'],
};

/** 全员通用章节 id */
const COMMON_IDS = ['common-login', 'common-workbench', 'common-security'];

describe('用户操作手册 - 完整性', () => {
  it('应返回结构完整的 Manual，且章节/步骤总数与展平列表一致', () => {
    const m = getUserManual('doctor', NOW);
    expect(m.title).toContain('操作手册');
    expect(m.version).toBe(MANUAL_VERSION);
    expect(m.role).toBe('doctor');
    expect(m.roleLabel).toBe('医生');
    expect(m.generatedAt).toBe(NOW);
    expect(m.copyright).toContain('杭州健澜科技有限公司');
    expect(m.chapters.length).toBe(m.totalChapters);
    expect(m.chapters.length).toBe(m.toc.length);
    expect(m.totalSteps).toBe(m.chapters.reduce((n, c) => n + c.steps.length, 0));
  });

  it('每个章节应具备 id/title/summary/steps/cautions/tags，步骤序号从 1 连续', () => {
    const m = getUserManual('nurse', NOW);
    expect(m.chapters.length).toBeGreaterThan(0);
    for (const ch of m.chapters) {
      expect(ch.id.length).toBeGreaterThan(0);
      expect(ch.title.length).toBeGreaterThan(0);
      expect(typeof ch.summary).toBe('string');
      expect(ch.steps.length).toBeGreaterThan(0);
      expect(Array.isArray(ch.cautions)).toBe(true);
      expect(Array.isArray(ch.tags)).toBe(true);
      ch.steps.forEach((s, i) => {
        expect(s.no).toBe(i + 1);
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.detail.length).toBeGreaterThan(0);
      });
    }
  });

  it('内容盘应包含全部五类角色的专属章节与三个通用章节', () => {
    const ids = new Set(USER_MANUAL_CHAPTERS.map((c) => c.id));
    for (const common of COMMON_IDS) expect(ids.has(common)).toBe(true);
    for (const role of Object.keys(ROLE_CHAPTER_IDS) as ManualRole[]) {
      for (const id of ROLE_CHAPTER_IDS[role]) expect(ids.has(id)).toBe(true);
    }
  });
});

describe('用户操作手册 - 角色过滤', () => {
  it('doctor 可见通用 + 医生章节，不可见护士/药师/管理员/患者专属章节', () => {
    const m = getUserManual('doctor', NOW);
    const ids = m.chapters.map((c) => c.id);
    for (const id of COMMON_IDS) expect(ids).toContain(id);
    for (const id of ROLE_CHAPTER_IDS.doctor) expect(ids).toContain(id);
    for (const role of ['nurse', 'pharmacist', 'admin', 'patient'] as ManualRole[]) {
      for (const id of ROLE_CHAPTER_IDS[role]) expect(ids).not.toContain(id);
    }
  });

  it('nurse 可见通用 + 护士章节，不可见其他角色专属章节', () => {
    const m = getUserManual('nurse', NOW);
    const ids = m.chapters.map((c) => c.id);
    for (const id of COMMON_IDS) expect(ids).toContain(id);
    for (const id of ROLE_CHAPTER_IDS.nurse) expect(ids).toContain(id);
    for (const role of ['doctor', 'pharmacist', 'admin', 'patient'] as ManualRole[]) {
      for (const id of ROLE_CHAPTER_IDS[role]) expect(ids).not.toContain(id);
    }
  });

  it('pharmacist 仅可见通用 + 药师章节', () => {
    const m = getUserManual('pharmacist', NOW);
    const ids = m.chapters.map((c) => c.id);
    for (const id of ROLE_CHAPTER_IDS.pharmacist) expect(ids).toContain(id);
    for (const role of ['doctor', 'nurse', 'admin', 'patient'] as ManualRole[]) {
      for (const id of ROLE_CHAPTER_IDS[role]) expect(ids).not.toContain(id);
    }
  });

  it('admin 仅可见通用 + 管理员章节', () => {
    const m = getUserManual('admin', NOW);
    const ids = m.chapters.map((c) => c.id);
    for (const id of ROLE_CHAPTER_IDS.admin) expect(ids).toContain(id);
    for (const role of ['doctor', 'nurse', 'pharmacist', 'patient'] as ManualRole[]) {
      for (const id of ROLE_CHAPTER_IDS[role]) expect(ids).not.toContain(id);
    }
  });

  it('patient 仅可见通用 + 患者章节', () => {
    const m = getUserManual('patient', NOW);
    const ids = m.chapters.map((c) => c.id);
    for (const id of ROLE_CHAPTER_IDS.patient) expect(ids).toContain(id);
    for (const role of ['doctor', 'nurse', 'pharmacist', 'admin'] as ManualRole[]) {
      for (const id of ROLE_CHAPTER_IDS[role]) expect(ids).not.toContain(id);
    }
  });

  it('未知/空角色应归一化为 doctor（含中文大小写与空格）', () => {
    expect(normalizeManualRole(undefined)).toBe<ManualRole>('doctor');
    expect(normalizeManualRole('')).toBe<ManualRole>('doctor');
    expect(normalizeManualRole('ghost')).toBe<ManualRole>('doctor');
    expect(normalizeManualRole(' NURSE ')).toBe<ManualRole>('nurse');
    expect(normalizeManualRole('Pharmacist')).toBe<ManualRole>('pharmacist');
    expect(getUserManual('ghost', NOW).role).toBe('doctor');
    expect(getUserManual(undefined, NOW).roleLabel).toBe('医生');
  });
});

describe('用户操作手册 - 目录结构', () => {
  it('toc 应与 chapters 同序、同 id，stepCount 与章节步骤数一致', () => {
    for (const role of ['doctor', 'nurse', 'pharmacist', 'admin', 'patient'] as ManualRole[]) {
      const m = getUserManual(role, NOW);
      expect(m.toc.length).toBe(m.chapters.length);
      m.toc.forEach((item, i) => {
        expect(item.id).toBe(m.chapters[i].id);
        expect(item.title).toBe(m.chapters[i].title);
        expect(item.stepCount).toBe(m.chapters[i].steps.length);
      });
    }
  });

  it('目录不应包含被角色过滤掉的章节 id', () => {
    const m = getUserManual('patient', NOW);
    const tocIds = new Set(m.toc.map((t) => t.id));
    expect(tocIds.has('doctor-outpatient')).toBe(false);
    expect(tocIds.has('nurse-handoff')).toBe(false);
    expect(tocIds.has('pharmacy-review')).toBe(false);
    expect(tocIds.has('admin-account')).toBe(false);
  });
});
