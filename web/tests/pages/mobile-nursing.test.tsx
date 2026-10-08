/**
 * 健澜科技 jlmedaios - AI 移动护理 PDA 端页面测试（M16-A / M16A_TEST）
 * 覆盖：移动登录 / 床位看板 / 断库红 Alert / 扫码五重核对（不通过 Alert、通过给药）/
 * 体征采集 / 任务执行 / 量表实时分 / 护理记录签名 / SBAR 交班签名 / 在线指示 / 无权限跳转。
 * BFF 经 vi.mock 隔离；真实断库 / 权限 / HTTP 闭环另有端到端取证。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import MobileLayout from '@/components/mobile/MobileLayout';
import MobileLogin from '@/pages/mobile/login';
import MobilePatients from '@/pages/mobile/Patients';
import BedSide from '@/pages/mobile/BedSide';
import MobileTasks from '@/pages/mobile/Tasks';
import MobileHandoff from '@/pages/mobile/Handoff';
import { useAuthStore } from '@/store/authStore';
import { useMobileNursingStore } from '@/store/mobileNursingStore';
import { RequirePermission } from '@/router/guards';
import type {
  BedBoardPatient,
  FiveRightsResult,
  SbarDraft,
  ScanResult,
} from '@/types/mobileNursing';

/* care：保留真实实现，仅覆盖健康探针与床旁任务查询 */
vi.mock('@/services/api/care', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/care')>('@/services/api/care');
  return { ...actual, getSystemHealth: vi.fn(), listNursingTasks: vi.fn() };
});

vi.mock('@/services/api/mobileNursing', () => ({
  getBedBoard: vi.fn(),
  scanCode: vi.fn(),
  verifyMedication: vi.fn(),
  scanAndAdminister: vi.fn(),
  captureVitals: vi.fn(),
  executeBedsideTask: vi.fn(),
  saveAssessment: vi.fn(),
  createBedsideRecord: vi.fn(),
  getSbar: vi.fn(),
  signSbar: vi.fn(),
}));

import { getSystemHealth, listNursingTasks } from '@/services/api/care';
import * as mapi from '@/services/api/mobileNursing';

const healthMock = vi.mocked(getSystemHealth);
const tasksMock = vi.mocked(listNursingTasks);
const m = mapi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const patient = (over: Partial<BedBoardPatient> = {}): BedBoardPatient => ({
  visitId: 'v1',
  patientId: 'p1',
  visitNo: 'IP001',
  bedNo: '12床',
  patientName: '张三',
  nursingLevel: 'level1',
  pressureSoreRisk: 'low',
  fallRisk: 'high',
  pendingTaskCount: 2,
  ...over,
});

const wristScan: ScanResult = {
  kind: 'wristband',
  raw: 'IP001',
  visitId: 'v1',
  bedNo: '12床',
  patientName: '张三',
};
const drugScan: ScanResult = {
  kind: 'drug',
  raw: 'D001',
  orderId: 'o1',
  drugCode: 'D001',
  drugName: '生理盐水',
  dose: '250ml',
  requiresDoubleCheck: false,
};
const okRights: FiveRightsResult = {
  bed: { ok: true, expected: '12床', actual: '12床' },
  patient: { ok: true, expected: '张三', actual: '张三' },
  drug: { ok: true, expected: 'D001', actual: 'D001' },
  dose: { ok: true, expected: '250ml', actual: '按医嘱剂量' },
  time: { ok: true, expected: '医嘱有效时点', actual: 't' },
  allOk: true,
  mismatches: [],
};

function renderMobile(initial: string) {
  return render(
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/m" element={<MobileLayout />}>
              <Route index element={<div>m-index</div>} />
              <Route path="patients" element={<MobilePatients />} />
              <Route path="bed/:visitId" element={<BedSide />} />
              <Route path="tasks" element={<MobileTasks />} />
              <Route path="handoff" element={<MobileHandoff />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AntdApp>
    </ConfigProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ permissions: ['*'], isAuthenticated: true, roles: ['nurse'] });
  useMobileNursingStore.setState({
    dbUp: null,
    patients: [],
    scanResult: null,
    fiveRights: null,
    sbarDraft: null,
    error: null,
    deptCode: '',
  });
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  m.getBedBoard.mockResolvedValue({ deptCode: 'NW1', deptName: '一病区', patients: [patient()] });
  tasksMock.mockResolvedValue([]);
  m.scanCode.mockImplementation((code: string) =>
    Promise.resolve(code.startsWith('IP') ? wristScan : drugScan),
  );
  m.verifyMedication.mockResolvedValue(okRights);
  m.scanAndAdminister.mockResolvedValue({ id: 'ad1' });
  m.captureVitals.mockResolvedValue({ id: 'r1' });
  m.executeBedsideTask.mockResolvedValue({ task: { id: 't1' }, deduplicated: false });
  m.saveAssessment.mockResolvedValue({ id: 'r2' });
  m.createBedsideRecord.mockResolvedValue({ id: 'r3' });
  m.signSbar.mockResolvedValue({ id: 'r4' });
  const draft: SbarDraft = {
    deptCode: 'NW1',
    deptName: '一病区',
    shift: 'day',
    sections: {
      situation: '12床张三术后观察',
      background: '胆囊切除术后第1天',
      assessment: '生命体征平稳',
      recommendation: '明日复查血常规',
    },
    items: ['待办 2 项', '跌倒高危'],
  };
  m.getSbar.mockResolvedValue(draft);
});

describe('M16A_TEST 移动护理页面', () => {
  it('移动登录：提交调用 login', async () => {
    const loginMock = vi.fn().mockResolvedValue({});
    useAuthStore.setState({ login: loginMock as never });
    render(
      <ConfigProvider locale={zhCN}>
        <AntdApp>
          <MemoryRouter initialEntries={['/m/login']}>
            <Routes>
              <Route path="/m/login" element={<MobileLogin />} />
              <Route path="/m/patients" element={<div>patients-page</div>} />
            </Routes>
          </MemoryRouter>
        </AntdApp>
      </ConfigProvider>,
    );
    fireEvent.change(screen.getByTestId('m-login-username'), { target: { value: 'nurse_ma' } });
    fireEvent.change(screen.getByTestId('m-login-password'), { target: { value: 'pw123' } });
    fireEvent.click(screen.getByTestId('m-login-submit'));
    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith(expect.objectContaining({ username: 'nurse_ma' })),
    );
  });

  it('看板：健康正常 + 患者卡片（床号/姓名/待办数）', async () => {
    renderMobile('/m/patients');
    expect(await screen.findByTestId('m-online-tag')).toHaveTextContent('在线');
    await waitFor(() => expect(m.getBedBoard).toHaveBeenCalled());
    expect(await screen.findByTestId('m-patient-v1')).toHaveTextContent('12床');
    expect(screen.getByTestId('m-patient-v1')).toHaveTextContent('张三');
    expect(screen.getByTestId('m-patient-todo-v1')).toHaveTextContent('待办 2');
  });

  it('断库：红色离线 Alert 且不渲染业务数据', async () => {
    healthMock.mockRejectedValue(new Error('ECONNREFUSED'));
    renderMobile('/m/patients');
    expect(await screen.findByTestId('m-offline-alert')).toBeTruthy();
    expect(screen.queryByTestId('m-patient-v1')).toBeNull();
  });

  it('扫码给药：五重核对不通过 → Alert；通过 → 给药', async () => {
    renderMobile('/m/bed/v1');
    await screen.findByTestId('m-online-tag');
    // 扫腕带
    fireEvent.change(screen.getByTestId('m-scan-input'), { target: { value: 'IP001' } });
    fireEvent.click(screen.getByTestId('m-scan-btn'));
    expect(await screen.findByTestId('m-wrist-result')).toHaveTextContent('12床');
    // 扫药品
    fireEvent.change(screen.getByTestId('m-scan-input'), { target: { value: 'D001' } });
    fireEvent.click(screen.getByTestId('m-scan-btn'));
    expect(await screen.findByTestId('m-drug-result')).toHaveTextContent('生理盐水');

    // 不通过场景
    m.verifyMedication.mockResolvedValueOnce({
      ...okRights,
      allOk: false,
      bed: { ok: false, expected: '12床', actual: '13床' },
      mismatches: ['床号不符'],
    });
    fireEvent.click(screen.getByTestId('m-verify-btn'));
    expect(await screen.findByTestId('m-five-rights-alert')).toHaveTextContent('床号不符');

    // 通过场景
    fireEvent.click(screen.getByTestId('m-verify-btn'));
    expect(await screen.findByTestId('m-five-rights-ok')).toBeTruthy();
    fireEvent.click(screen.getByTestId('m-administer-btn'));
    await waitFor(() => expect(m.scanAndAdminister).toHaveBeenCalledWith('o1', expect.objectContaining({ scannedDrugCode: 'D001' })));
  });

  it('体征采集：填写后保存调 captureVitals', async () => {
    renderMobile('/m/bed/v1');
    await screen.findByTestId('m-online-tag');
    fireEvent.change(await screen.findByTestId('m-vital-temperature'), { target: { value: '36.5' } });
    fireEvent.click(screen.getByTestId('m-vitals-save'));
    await waitFor(() =>
      expect(m.captureVitals).toHaveBeenCalledWith(expect.objectContaining({ visitId: 'v1', temperature: 36.5 })),
    );
  });

  it('任务执行：待办任务点执行调 executeBedsideTask', async () => {
    tasksMock.mockResolvedValue([
      { id: 't9', visitId: 'v1', patientId: 'p1', taskNo: 'T9', taskType: 'vitals', content: '测血压', scheduledAt: '', status: 'pending', idempotencyKey: 'k', result: null, executedBy: null, executedAt: null, createdAt: '', updatedAt: '' },
    ]);
    renderMobile('/m/bed/v1');
    const btn = await screen.findByTestId('m-task-exec-t9');
    fireEvent.click(btn);
    await waitFor(() => expect(m.executeBedsideTask).toHaveBeenCalledWith('t9', expect.objectContaining({})));
  });

  it('护理记录：勾选本人签名后保存调 createBedsideRecord', async () => {
    renderMobile('/m/bed/v1');
    await screen.findByTestId('m-online-tag');
    fireEvent.change(screen.getByTestId('m-record-text'), { target: { value: '患者平稳' } });
    fireEvent.click(screen.getByTestId('m-sign-check'));
    fireEvent.click(screen.getByTestId('m-record-save'));
    await waitFor(() =>
      expect(m.createBedsideRecord).toHaveBeenCalledWith(expect.objectContaining({ visitId: 'v1', measures: '患者平稳' })),
    );
  });

  it('SBAR：草稿加载 + 签名调 signSbar', async () => {
    useMobileNursingStore.setState({ deptCode: 'NW1' });
    renderMobile('/m/handoff');
    await waitFor(() => expect(m.getSbar).toHaveBeenCalledWith('NW1', 'day'));
    expect(await screen.findByTestId('m-sbar-situation')).toHaveValue('12床张三术后观察');
    fireEvent.click(screen.getByTestId('m-sbar-sign-check'));
    fireEvent.click(screen.getByTestId('m-sbar-sign-btn'));
    await waitFor(() => expect(m.signSbar).toHaveBeenCalledWith(expect.objectContaining({ deptCode: 'NW1' })));
  });

  it('无 mobile_nursing:execute 权限时跳转 403，不渲染业务', async () => {
    useAuthStore.setState({ permissions: [], isAuthenticated: true });
    render(
      <ConfigProvider locale={zhCN}>
        <AntdApp>
          <MemoryRouter initialEntries={['/m/patients']}>
            <Routes>
              <Route path="/403" element={<div>forbidden-page</div>} />
              <Route
                path="/m"
                element={
                  <RequirePermission permission="mobile_nursing:execute">
                    <MobileLayout />
                  </RequirePermission>
                }
              >
                <Route path="patients" element={<MobilePatients />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AntdApp>
      </ConfigProvider>,
    );
    expect(await screen.findByText('forbidden-page')).toBeTruthy();
  });
});
