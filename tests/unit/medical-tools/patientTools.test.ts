/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 患者管理工具（query_patient / get_patient_detail / get_patient_history）
 */

import { describe, it, expect } from 'bun:test';
import { makeDoctorContext, emptyCtx } from './helpers.js';
import { queryPatientTool } from '@/medical-tools/patient/queryPatient.js';
import { getPatientDetailTool } from '@/medical-tools/patient/getPatientDetail.js';
import { getPatientHistoryTool } from '@/medical-tools/patient/getPatientHistory.js';

const ctx = makeDoctorContext();

describe('query_patient 查询患者', () => {
  it('按姓名模糊查询应返回脱敏患者列表', async () => {
    const res = await queryPatientTool.execute({ name: '张' }, ctx);
    expect(res.success).toBe(true);
    const data = res.data as { total: number; data: { name: string }[] };
    expect(data.total).toBeGreaterThanOrEqual(1);
    // 姓名应脱敏（含 *）
    expect(data.data[0].name).toContain('*');
  });

  it('按 patientId 精确查询应返回唯一患者', async () => {
    const res = await queryPatientTool.execute({ patientId: 'P2026090001' }, ctx);
    const data = res.data as { total: number; data: { patientId: string }[] };
    expect(data.total).toBe(1);
    expect(data.data[0].patientId).toBe('P2026090001');
  });

  it('按性别+年龄范围组合筛选', async () => {
    const res = await queryPatientTool.execute(
      { gender: '男', ageRange: { min: 50, max: 70 } },
      ctx,
    );
    const data = res.data as { data: { gender: string; age: number }[] };
    expect(data.data.every((p) => p.gender === '男' && p.age >= 50 && p.age <= 70)).toBe(true);
  });

  it('分页应正确切片', async () => {
    const res = await queryPatientTool.execute({ gender: '男', page: 1, pageSize: 2 }, ctx);
    const data = res.data as { data: unknown[] };
    expect(data.data.length).toBeLessThanOrEqual(2);
  });

  it('未提供任何查询条件应校验失败', async () => {
    await expect(queryPatientTool.execute({}, ctx)).rejects.toThrow();
  });

  it('按身份证号查询', async () => {
    const res = await queryPatientTool.execute({ idCard: '330106196803152318' }, ctx);
    const data = res.data as { total: number };
    expect(data.total).toBe(1);
  });
});

describe('get_patient_detail 患者详细档案', () => {
  it('获取存在患者应返回脱敏完整档案', async () => {
    const res = await getPatientDetailTool.execute({ patientId: 'P2026090001' }, ctx);
    expect(res.success).toBe(true);
    const data = res.data as {
      data: {
        idCardMasked: string;
        phoneMasked: string;
        addressMasked: string;
        allergies: unknown[];
        currentMedications: unknown[];
      };
    };
    expect(data.data.idCardMasked).not.toContain('330106196803152318');
    expect(data.data.idCardMasked).toContain('*');
    expect(data.data.phoneMasked).toContain('*');
    expect(data.data.addressMasked).toContain('*');
    expect(data.data.allergies.length).toBeGreaterThan(0);
    expect(data.data.currentMedications.length).toBeGreaterThan(0);
  });

  it('includeHistory=false 时不应返回既往史', async () => {
    const res = await getPatientDetailTool.execute(
      { patientId: 'P2026090001', includeHistory: false },
      ctx,
    );
    const data = res.data as { data: { pastHistory: unknown[] } };
    expect(data.data.pastHistory.length).toBe(0);
  });

  it('includeAllergies=false 时不应返回过敏史', async () => {
    const res = await getPatientDetailTool.execute(
      { patientId: 'P2026090001', includeAllergies: false },
      ctx,
    );
    const data = res.data as { data: { allergies: unknown[] } };
    expect(data.data.allergies.length).toBe(0);
  });

  it('includeMedications=false 时不应返回用药', async () => {
    const res = await getPatientDetailTool.execute(
      { patientId: 'P2026090001', includeMedications: false },
      ctx,
    );
    const data = res.data as { data: { currentMedications: unknown[] } };
    expect(data.data.currentMedications.length).toBe(0);
  });

  it('不存在患者应返回 PATIENT_NOT_FOUND', async () => {
    const res = await getPatientDetailTool.execute({ patientId: 'P_NOT_EXIST' }, ctx);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('PATIENT_NOT_FOUND');
  });
});

describe('get_patient_history 就诊历史', () => {
  it('获取患者就诊历史应返回倒序列表', async () => {
    const res = await getPatientHistoryTool.execute({ patientId: 'P2026090001' }, emptyCtx);
    expect(res.success).toBe(true);
    const data = res.data as { total: number; visits: { visitDate: string }[] };
    expect(data.total).toBeGreaterThanOrEqual(1);
    // 倒序校验
    const dates = data.visits.map((v) => v.visitDate);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it('按就诊类型筛选', async () => {
    const res = await getPatientHistoryTool.execute(
      { patientId: 'P2026090001', visitType: '住院' },
      emptyCtx,
    );
    const data = res.data as { visits: { visitType: string }[] };
    expect(data.visits.every((v) => v.visitType === '住院')).toBe(true);
  });

  it('按时间范围筛选', async () => {
    const res = await getPatientHistoryTool.execute(
      { patientId: 'P2026090001', startDate: '2026-01-01', endDate: '2026-12-31' },
      emptyCtx,
    );
    const data = res.data as { visits: { visitDate: string }[] };
    expect(
      data.visits.every((v) => v.visitDate >= '2026-01-01' && v.visitDate <= '2026-12-31'),
    ).toBe(true);
  });

  it('limit 应限制返回条数', async () => {
    const res = await getPatientHistoryTool.execute(
      { patientId: 'P2026090001', limit: 1 },
      emptyCtx,
    );
    const data = res.data as { visits: unknown[] };
    expect(data.visits.length).toBeLessThanOrEqual(1);
  });

  it('不存在患者应返回空列表', async () => {
    const res = await getPatientHistoryTool.execute({ patientId: 'P_NOT_EXIST' }, emptyCtx);
    expect(res.success).toBe(true);
    const data = res.data as { total: number };
    expect(data.total).toBe(0);
  });
});
