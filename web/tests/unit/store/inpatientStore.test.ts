/**
 * 健澜科技 jlmedaios - 住院工作台状态管理测试（M1-A）
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * inpatientStore 测试：健康探活（含 BFF/DB 不可用显式报错）、床位图、
 * 在院列表、在院详情选择、查询条件，以及入院/换床/转科/出院/床位维护写操作
 * 成功后自动刷新读模型。通过 vi.mock 隔离 BFF，真实落库由后端测试与 E2E 覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useInpatientStore } from '@/store/inpatientStore';
import type {
  BedMapResponse,
  InpatientDetail,
  InpatientListItem,
  SystemHealth,
} from '@/types/inpatient';

vi.mock('@/services/api/inpatient', () => ({
  getSystemHealth: vi.fn(),
  getBedMap: vi.fn(),
  getInpatients: vi.fn(),
  getInpatient: vi.fn(),
  createAdmission: vi.fn(),
  changeBed: vi.fn(),
  transfer: vi.fn(),
  discharge: vi.fn(),
  setBedStatus: vi.fn(),
}));

import * as api from '@/services/api/inpatient';

/* ---------------- 夹具 ---------------- */

const health: SystemHealth = {
  status: 'ok',
  version: '0.2.0',
  demoMode: false,
  db: 'up',
};

const item: InpatientListItem = {
  visitId: 'v1',
  visitNo: 'IP2026090001',
  patientId: 'p1',
  mrn: 'PAT000017',
  nameMasked: '王*',
  gender: '男',
  age: 66,
  department: '心血管内科',
  wardId: 'w1',
  wardName: '心血管内科一病区',
  bedId: 'b1',
  bedNo: '0501-1',
  roomNo: '0501',
  diagnosis: '急性冠状动脉综合征（虚构）',
  condition: 'serious',
  nursingLevel: 'level1',
  attendingDoctorId: 'd1',
  admittedAt: '2026-09-25T01:00:00.000Z',
  daysInHospital: 0,
  allergies: [],
  tags: [],
};

const bedMap: BedMapResponse = {
  campuses: [{ code: 'CAMPUS-MAIN', name: '解放路院区' }],
  wards: [
    {
      id: 'w1',
      code: 'WARD-CARDIO-1',
      name: '心血管内科一病区',
      department: '心血管内科',
      campusId: 'c1',
      campusCode: 'CAMPUS-MAIN',
      campusName: '解放路院区',
      floor: '5F',
      stats: { total: 1, available: 0, occupied: 1, maintenance: 0, isolation: 0 },
      beds: [
        {
          id: 'b1',
          bedNo: '0501-1',
          roomNo: '0501',
          bedType: 'standard',
          status: 'occupied',
          occupant: null,
        },
      ],
    },
  ],
  generatedAt: '2026-09-25T01:30:00.000Z',
};

const detail: InpatientDetail = {
  ...item,
  admissionNo: 'ADM2026090001',
  admissionType: 'elective',
  source: 'outpatient',
  movements: [
    {
      id: 'e1',
      eventType: 'admit',
      fromWard: null,
      toWard: '心血管内科一病区',
      fromBed: null,
      toBed: '0501-1',
      fromDepartment: null,
      toDepartment: '心血管内科',
      reason: null,
      operatorId: 'd1',
      eventAt: '2026-09-25T01:00:00.000Z',
    },
  ],
};

const initialState = useInpatientStore.getState();

beforeEach(() => {
  useInpatientStore.setState({ ...initialState });
  vi.mocked(api.getSystemHealth).mockResolvedValue(health);
  vi.mocked(api.getBedMap).mockResolvedValue(bedMap);
  vi.mocked(api.getInpatients).mockResolvedValue({ items: [item], total: 1 });
  vi.mocked(api.getInpatient).mockResolvedValue(detail);
  vi.mocked(api.createAdmission).mockResolvedValue(item);
  vi.mocked(api.changeBed).mockResolvedValue(detail);
  vi.mocked(api.transfer).mockResolvedValue(detail);
  vi.mocked(api.discharge).mockResolvedValue(detail);
  vi.mocked(api.setBedStatus).mockResolvedValue({});
});

describe('inpatientStore 初始状态', () => {
  it('数据字段为初始空态、ready 为探测中', () => {
    const s = useInpatientStore.getState();
    expect(s.ready).toBeNull();
    expect(s.health).toBeNull();
    expect(s.bedMap).toBeNull();
    expect(s.patients).toEqual([]);
    expect(s.total).toBe(0);
    expect(s.selectedVisitId).toBeNull();
    expect(s.detail).toBeNull();
    expect(s.error).toBeNull();
  });
});

describe('inpatientStore 健康探活', () => {
  it('db=up → ready=true 并记录 health', async () => {
    await useInpatientStore.getState().checkHealth();
    const s = useInpatientStore.getState();
    expect(s.ready).toBe(true);
    expect(s.health?.db).toBe('up');
    expect(s.loadingHealth).toBe(false);
  });

  it('db=skipped（演示模式）→ ready=true', async () => {
    vi.mocked(api.getSystemHealth).mockResolvedValueOnce({ ...health, db: 'skipped' });
    await useInpatientStore.getState().checkHealth();
    expect(useInpatientStore.getState().ready).toBe(true);
  });

  it('BFF/数据库不可用 → ready=false 且显式报错，不造假成功', async () => {
    vi.mocked(api.getSystemHealth).mockRejectedValueOnce(new Error('网络错误'));
    await useInpatientStore.getState().checkHealth();
    const s = useInpatientStore.getState();
    expect(s.ready).toBe(false);
    expect(s.error).toBe('网络错误');
  });
});

describe('inpatientStore 读模型', () => {
  it('fetchBedMap 成功填充床位图', async () => {
    await useInpatientStore.getState().fetchBedMap();
    const s = useInpatientStore.getState();
    expect(s.bedMap?.wards).toHaveLength(1);
    expect(s.loadingMap).toBe(false);
  });

  it('fetchBedMap 失败设置错误', async () => {
    vi.mocked(api.getBedMap).mockRejectedValueOnce(new Error('床位图加载失败'));
    await useInpatientStore.getState().fetchBedMap();
    expect(useInpatientStore.getState().error).toBe('床位图加载失败');
  });

  it('fetchPatients 成功填充列表与 total', async () => {
    await useInpatientStore.getState().fetchPatients();
    const s = useInpatientStore.getState();
    expect(s.patients).toHaveLength(1);
    expect(s.total).toBe(1);
  });

  it('fetchPatients 失败设置错误', async () => {
    vi.mocked(api.getInpatients).mockRejectedValueOnce(new Error('列表加载失败'));
    await useInpatientStore.getState().fetchPatients();
    expect(useInpatientStore.getState().error).toBe('列表加载失败');
  });
});

describe('inpatientStore 选择与查询', () => {
  it('selectVisit(id) 加载详情', async () => {
    await useInpatientStore.getState().selectVisit('v1');
    const s = useInpatientStore.getState();
    expect(s.selectedVisitId).toBe('v1');
    expect(s.detail?.admissionNo).toBe('ADM2026090001');
  });

  it('selectVisit(null) 清空选择与详情', async () => {
    await useInpatientStore.getState().selectVisit('v1');
    await useInpatientStore.getState().selectVisit(null);
    const s = useInpatientStore.getState();
    expect(s.selectedVisitId).toBeNull();
    expect(s.detail).toBeNull();
  });

  it('selectVisit 失败设置错误', async () => {
    vi.mocked(api.getInpatient).mockRejectedValueOnce(new Error('详情加载失败'));
    await useInpatientStore.getState().selectVisit('v1');
    expect(useInpatientStore.getState().error).toBe('详情加载失败');
  });

  it('setQuery 更新查询并触发刷新', async () => {
    useInpatientStore.getState().setQuery({ wardId: 'w1' });
    expect(useInpatientStore.getState().query.wardId).toBe('w1');
    // 异步刷新（void），等待一个微任务
    await Promise.resolve();
    await Promise.resolve();
    expect(vi.mocked(api.getBedMap)).toHaveBeenCalled();
  });
});

describe('inpatientStore ADT 写操作', () => {
  it('admit 调用服务、返回列表项并刷新读模型', async () => {
    const payload: any = { wardId: 'w1', diagnosis: 'x', condition: 'stable', admissionType: 'elective', source: 'other' };
    const r = await useInpatientStore.getState().admit(payload);
    expect(r.visitId).toBe('v1');
    expect(vi.mocked(api.createAdmission)).toHaveBeenCalledWith(payload);
    expect(vi.mocked(api.getBedMap)).toHaveBeenCalled();
    expect(useInpatientStore.getState().acting).toBe(false);
  });

  it('changeBed 调用服务并刷新', async () => {
    await useInpatientStore.getState().changeBed('v1', 'b2', '换床');
    expect(vi.mocked(api.changeBed)).toHaveBeenCalledWith('v1', 'b2', '换床');
  });

  it('transfer 调用服务并刷新', async () => {
    await useInpatientStore.getState().transfer('v1', 'w2', undefined, '转科');
    expect(vi.mocked(api.transfer)).toHaveBeenCalledWith('v1', 'w2', undefined, '转科');
  });

  it('discharge 调用服务并刷新；若为当前选中则清空选择', async () => {
    await useInpatientStore.getState().selectVisit('v1');
    await useInpatientStore.getState().discharge('v1', '出院');
    expect(vi.mocked(api.discharge)).toHaveBeenCalledWith('v1', '出院');
    expect(useInpatientStore.getState().selectedVisitId).toBeNull();
  });

  it('setBedStatus 调用服务并刷新', async () => {
    await useInpatientStore.getState().setBedStatus('b2', 'maintenance', '维护');
    expect(vi.mocked(api.setBedStatus)).toHaveBeenCalledWith('b2', 'maintenance', '维护');
  });
});
