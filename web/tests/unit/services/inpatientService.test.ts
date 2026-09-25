/**
 * 健澜科技 jlmedaios - 住院服务层（API 映射）测试（M1-A）
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * mock 底层 request，断言住院各端点的方法 / 路径 / 查询参数 / 请求体映射正确。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/request', () => ({
  get: vi.fn(),
  post: vi.fn(),
}));

import { get, post } from '@/services/request';
import {
  getSystemHealth,
  getBedMap,
  getInpatients,
  getInpatient,
  createAdmission,
  changeBed,
  transfer,
  discharge,
  setBedStatus,
} from '@/services/api/inpatient';

beforeEach(() => {
  vi.mocked(get).mockReset().mockResolvedValue({});
  vi.mocked(post).mockReset().mockResolvedValue({});
});

describe('住院 API 映射', () => {
  it('getSystemHealth → GET /system/health', async () => {
    await getSystemHealth();
    expect(get).toHaveBeenCalledWith('/system/health');
  });

  it('getBedMap → GET /inpatient/bed-map 并透传查询', async () => {
    await getBedMap({ campusCode: 'CAMPUS-MAIN', wardId: 'w1' });
    expect(get).toHaveBeenCalledWith('/inpatient/bed-map', {
      campusCode: 'CAMPUS-MAIN',
      wardId: 'w1',
    });
  });

  it('getBedMap 无参时传空对象', async () => {
    await getBedMap();
    expect(get).toHaveBeenCalledWith('/inpatient/bed-map', {});
  });

  it('getInpatients → GET /inpatient/patients', async () => {
    await getInpatients({ department: '心血管内科' });
    expect(get).toHaveBeenCalledWith('/inpatient/patients', { department: '心血管内科' });
  });

  it('getInpatient → GET /inpatient/patients/:id', async () => {
    await getInpatient('v1');
    expect(get).toHaveBeenCalledWith('/inpatient/patients/v1');
  });

  it('createAdmission → POST /inpatient/admissions', async () => {
    const payload = { wardId: 'w1', diagnosis: 'x', condition: 'stable' } as never;
    await createAdmission(payload);
    expect(post).toHaveBeenCalledWith('/inpatient/admissions', payload);
  });

  it('changeBed → POST bed-change，体含 targetBedId/reason', async () => {
    await changeBed('v1', 'b9', '调整');
    expect(post).toHaveBeenCalledWith('/inpatient/patients/v1/bed-change', {
      targetBedId: 'b9',
      reason: '调整',
    });
  });

  it('transfer → POST transfer，体含 targetWardId/targetBedId/reason', async () => {
    await transfer('v1', 'w2', 'b3', '转科');
    expect(post).toHaveBeenCalledWith('/inpatient/patients/v1/transfer', {
      targetWardId: 'w2',
      targetBedId: 'b3',
      reason: '转科',
    });
  });

  it('transfer 省略 targetBedId 时为 undefined', async () => {
    await transfer('v1', 'w2');
    expect(post).toHaveBeenCalledWith('/inpatient/patients/v1/transfer', {
      targetWardId: 'w2',
      targetBedId: undefined,
      reason: undefined,
    });
  });

  it('discharge → POST discharge，体含 reason', async () => {
    await discharge('v1', '痊愈');
    expect(post).toHaveBeenCalledWith('/inpatient/patients/v1/discharge', { reason: '痊愈' });
  });

  it('setBedStatus → POST beds/:id/status', async () => {
    await setBedStatus('b1', 'maintenance', '检修');
    expect(post).toHaveBeenCalledWith('/inpatient/beds/b1/status', {
      status: 'maintenance',
      reason: '检修',
    });
  });
});
