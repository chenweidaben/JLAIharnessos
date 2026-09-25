/**
 * 健澜科技 jlmedaios - 住院组件测试（M1-A）
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 覆盖：InpatientList（列表/空态/检索/点击）、InpatientBedMap（四态色块/
 * 占用床点击/加载与空态）、AdmissionForm（无权限告警/填写提交）、
 * BedPatientDrawer（打开摘要/移动史/出院按钮权限/确认出院）。
 *
 * BFF 服务经 vi.mock 隔离；store 直接 setState 注入夹具，真实落库由后端/E2E 覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import InpatientList from '@/components/inpatient/InpatientList';
import InpatientBedMap from '@/components/inpatient/InpatientBedMap';
import AdmissionForm from '@/components/inpatient/AdmissionForm';
import BedPatientDrawer from '@/components/inpatient/BedPatientDrawer';
import { useInpatientStore } from '@/store/inpatientStore';
import { useAuthStore } from '@/store/authStore';
import type {
  BedMapResponse,
  InpatientDetail,
  InpatientListItem,
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

const ALL_PERMS = [
  'inpatient:view',
  'inpatient:admit',
  'inpatient:manage',
  'inpatient:discharge',
  'inpatient:bed:manage',
];

const listItem: InpatientListItem = {
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
  daysInHospital: 2,
  allergies: [],
  tags: [],
};

function bedMapWith(beds: any[]): BedMapResponse {
  return {
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
        stats: {
          total: beds.length,
          available: beds.filter((b) => b.status === 'available').length,
          occupied: beds.filter((b) => b.status === 'occupied').length,
          maintenance: beds.filter((b) => b.status === 'maintenance').length,
          isolation: beds.filter((b) => b.status === 'isolation').length,
        },
        beds,
      },
    ],
    generatedAt: '2026-09-25T01:30:00.000Z',
  };
}

const occupiedBed = {
  id: 'b1',
  bedNo: '0501-1',
  roomNo: '0501',
  bedType: 'standard',
  status: 'occupied',
  occupant: {
    visitId: 'v1',
    patientId: 'p1',
    mrn: 'PAT000017',
    nameMasked: '王*',
    gender: '男',
    age: 66,
    diagnosis: '急性冠状动脉综合征（虚构）',
    condition: 'serious',
    nursingLevel: 'level1',
    attendingDoctorId: 'd1',
    admittedAt: '2026-09-25T01:00:00.000Z',
    allergies: [],
    tags: [],
  },
};
const freeBed = {
  id: 'b2',
  bedNo: '0501-2',
  roomNo: '0501',
  bedType: 'standard',
  status: 'available',
  occupant: null,
};

const detail: InpatientDetail = {
  ...listItem,
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
    {
      id: 'e2',
      eventType: 'transfer',
      fromWard: '心血管内科一病区',
      toWard: '呼吸内科一病区',
      fromBed: '0501-1',
      toBed: '0801-1',
      fromDepartment: '心血管内科',
      toDepartment: '呼吸内科',
      reason: '转呼吸',
      operatorId: 'd1',
      eventAt: '2026-09-26T01:00:00.000Z',
    },
  ],
};

const inpatientInitial = useInpatientStore.getState();
const authInitial = useAuthStore.getState();

beforeEach(() => {
  useInpatientStore.setState({ ...inpatientInitial });
  useAuthStore.setState({ ...authInitial, permissions: ALL_PERMS, user: { permissions: ALL_PERMS } as never });
  vi.mocked(api.createAdmission).mockResolvedValue(listItem);
  vi.mocked(api.discharge).mockResolvedValue(detail);
  vi.mocked(api.changeBed).mockResolvedValue(detail);
  vi.mocked(api.transfer).mockResolvedValue(detail);
});

/* ----------------------------- InpatientList ----------------------------- */

describe('InpatientList 在院列表', () => {
  it('渲染在院患者与总人数', async () => {
    useInpatientStore.setState({ patients: [listItem], total: 1 });
    render(<InpatientList />);
    expect(await screen.findByText('王*')).toBeInTheDocument();
    expect(screen.getByText('共 1 人')).toBeInTheDocument();
  });

  it('无患者时显示空状态', () => {
    useInpatientStore.setState({ patients: [], total: 0 });
    render(<InpatientList />);
    expect(screen.getByText('当前范围无在院患者')).toBeInTheDocument();
  });

  it('检索框输入后按关键词过滤', async () => {
    useInpatientStore.setState({ patients: [listItem], total: 1 });
    render(<InpatientList />);
    const search = await screen.findByPlaceholderText('搜索床号/姓名/住院号/诊断');
    fireEvent.change(search, { target: { value: 'PAT000017' } });
    expect(await screen.findByText('王*')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: '不存在关键词' } });
    await waitFor(() => expect(screen.queryByText('王*')).not.toBeInTheDocument());
  });

  it('点击行触发 selectVisit', async () => {
    useInpatientStore.setState({ patients: [listItem], total: 1 });
    render(<InpatientList />);
    await screen.findByText('王*');
    fireEvent.click(screen.getByText('王*'));
    await waitFor(() =>
      expect(useInpatientStore.getState().selectedVisitId).toBe('v1'),
    );
  });
});

/* ----------------------------- InpatientBedMap ----------------------------- */

describe('InpatientBedMap 床位图', () => {
  it('渲染床位色块与病区统计', async () => {
    useInpatientStore.setState({ bedMap: bedMapWith([occupiedBed, freeBed]) });
    render(<InpatientBedMap />);
    // 病区名同时出现在 Segmented 与卡片标题，故用 getAllByText
    expect((await screen.findAllByText('心血管内科一病区')).length).toBeGreaterThan(0);
    expect(screen.getByText('王*')).toBeInTheDocument();
    expect(screen.getByText('0501-2')).toBeInTheDocument();
  });

  it('加载中且无数据时显示加载态', () => {
    useInpatientStore.setState({ bedMap: null, loadingMap: true });
    const { container } = render(<InpatientBedMap />);
    // antd v5 独立 Spin 的 tip 不渲染文字，断言 spinner 容器存在
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('无病区时显示空状态', () => {
    useInpatientStore.setState({ bedMap: null, loadingMap: false });
    render(<InpatientBedMap />);
    expect(screen.getByText(/暂无可显示的病区/)).toBeInTheDocument();
  });

  it('点击占用床打开患者摘要', async () => {
    useInpatientStore.setState({ bedMap: bedMapWith([occupiedBed, freeBed]) });
    render(<InpatientBedMap />);
    const name = await screen.findByText('王*');
    fireEvent.click(name);
    await waitFor(() =>
      expect(useInpatientStore.getState().selectedVisitId).toBe('v1'),
    );
  });
});

/* ----------------------------- AdmissionForm ----------------------------- */

describe('AdmissionForm 入院登记', () => {
  it('无 inpatient:admit 权限时显示告警', () => {
    useAuthStore.setState({ permissions: [], user: { permissions: [] } as never });
    render(<AdmissionForm />);
    expect(screen.getByText(/您没有入院登记权限/)).toBeInTheDocument();
  });

  it('填写病区与诊断后提交调用 createAdmission', async () => {
    useInpatientStore.setState({ bedMap: bedMapWith([freeBed]) });
    render(<AdmissionForm />);

    // 脱敏姓名（新建患者必填）
    const name = screen.getByPlaceholderText('如 张*强');
    fireEvent.change(name, { target: { value: '测*试' } });

    // 选择收治病区（antd Select：打开下拉后按选项文本点击）
    const wardSelect = screen.getByText('选择病区');
    fireEvent.mouseDown(wardSelect);
    const option = await screen.findByText(/心血管内科一病区（/);
    fireEvent.click(option);

    // 入院诊断
    const diagnosis = screen.getByPlaceholderText('如 急性非ST段抬高型心肌梗死');
    fireEvent.change(diagnosis, { target: { value: '测试诊断（虚构）' } });

    // 提交
    fireEvent.click(screen.getByRole('button', { name: '提交入院并分配床位' }));

    await waitFor(() => expect(api.createAdmission).toHaveBeenCalled());
    const payload = vi.mocked(api.createAdmission).mock.calls[0][0] as any;
    expect(payload.diagnosis).toBe('测试诊断（虚构）');
  });
});

/* ----------------------------- BedPatientDrawer ----------------------------- */

describe('BedPatientDrawer 患者摘要抽屉', () => {
  it('未选择患者时抽屉关闭', () => {
    render(<BedPatientDrawer />);
    expect(screen.queryByText('ADT 移动史')).not.toBeInTheDocument();
  });

  it('选中后展示基本信息与 ADT 移动史', async () => {
    useInpatientStore.setState({
      selectedVisitId: 'v1',
      detail,
      bedMap: bedMapWith([occupiedBed, freeBed]),
    });
    render(<BedPatientDrawer />);
    expect(await screen.findByText('ADT 移动史')).toBeInTheDocument();
    expect(screen.getByText('ADM2026090001')).toBeInTheDocument();
    expect(screen.getAllByText('转科').length).toBeGreaterThan(0);
  });

  it('无 discharge 权限时出院按钮禁用', async () => {
    useAuthStore.setState({
      permissions: ['inpatient:view'],
      user: { permissions: ['inpatient:view'] } as never,
    });
    useInpatientStore.setState({ selectedVisitId: 'v1', detail });
    render(<BedPatientDrawer />);
    const btn = await screen.findByRole('button', { name: '办理出院' });
    expect(btn).toBeDisabled();
  });

  it('有权限时点击出院并在 Popconfirm 确认 → 调用 discharge', async () => {
    useInpatientStore.setState({
      selectedVisitId: 'v1',
      detail,
      bedMap: bedMapWith([occupiedBed, freeBed]),
    });
    render(<BedPatientDrawer />);
    const btn = await screen.findByRole('button', { name: '办理出院' });
    fireEvent.click(btn);
    const confirm = await screen.findByText('确认出院');
    fireEvent.click(confirm);
    await waitFor(() => expect(api.discharge).toHaveBeenCalled());
  });
});
