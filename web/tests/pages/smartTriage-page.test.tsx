/**
 * 健澜科技 jlmedaios - 智能导诊页面测试（M3-P）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖：
 *  - 在线：导诊（症状→推荐→选择）、预问诊表单、医护报告 Tab；
 *  - 断库：离线 Alert，不渲染业务内容。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@test-utils';

import SmartTriagePage from '@/pages/smartTriage';
import { useSmartTriageStore } from '@/store/smartTriageStore';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/smartTriage', () => ({
  startTriageApi: vi.fn(),
  chooseDepartmentApi: vi.fn(),
  submitPreliminaryApi: vi.fn(),
  listMyTriageApi: vi.fn(),
  listPreliminaryApi: vi.fn(),
  consumePreliminaryApi: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({
  user: {
    id: 'admin1',
    realName: '管理员',
    roles: ['admin'] as string[],
    roleCodes: ['admin'] as string[],
    permissions: ['triage:use', 'triage:view'] as string[],
  },
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (sel?: (s: { user: typeof mockUser.user }) => unknown) =>
    sel ? sel({ user: mockUser.user }) : { user: mockUser.user },
}));

import { systemApi } from '@/services/api/system';
import {
  startTriageApi,
  chooseDepartmentApi,
  submitPreliminaryApi,
  listPreliminaryApi,
  consumePreliminaryApi,
} from '@/services/api/smartTriage';

const sysM = vi.mocked(systemApi);

const recommendations = [
  {
    department: '呼吸内科',
    confidence: 0.85,
    matchedKeywords: ['咳嗽', '发热'],
    reason: '命中咳嗽、发热等呼吸症状',
  },
  {
    department: '内科',
    confidence: 0.5,
    matchedKeywords: ['发热'],
    reason: '发热为常见内科症状',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  useSmartTriageStore.getState().reset();
});

it('在线：导诊全流程（症状→推荐→选择）', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  startTriageApi.mockResolvedValue({
    session: {
      id: 's1', accountId: 'admin1', symptoms: '咳嗽发热',
      recommendations, status: 'open', dialog: [],
    },
    recommendations,
  } as never);
  chooseDepartmentApi.mockResolvedValue({
    id: 's1', status: 'completed', chosenDepartment: '呼吸内科',
    recommendations,
  } as never);

  render(<SmartTriagePage />);

  await waitFor(() => {
    expect(sysM.health).toHaveBeenCalled();
  });

  const symptoms = await screen.findByTestId('triage-symptoms');
  fireEvent.change(symptoms, { target: { value: '咳嗽发热两天' } });

  const startBtn = screen.getByTestId('triage-start');
  await waitFor(() => expect(startBtn).not.toBeDisabled());
  fireEvent.click(startBtn);

  const recs = await screen.findByTestId('triage-recommendations');
  expect(recs.textContent).toContain('呼吸内科');
  expect(recs.textContent).toContain('首选');

  fireEvent.click(screen.getByTestId('choose-dept-0'));
  await waitFor(() => {
    expect(chooseDepartmentApi).toHaveBeenCalledWith(
      expect.objectContaining({ department: '呼吸内科' }),
    );
  });

  // 点击「重新导诊」覆盖重置函数
  fireEvent.click(screen.getByText('重新导诊'));
  const symptomsAfter = await screen.findByTestId('triage-symptoms');
  expect(symptomsAfter.textContent).toBe('');
});

it('在线：预问诊表单可填写并提交', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  submitPreliminaryApi.mockResolvedValue({
    consultation: {
      id: 'p1', status: 'completed', targetDepartment: '呼吸内科',
      reportText: '预问诊报告',
    },
    reportText: '预问诊报告',
  } as never);

  render(<SmartTriagePage />);

  await waitFor(() => expect(sysM.health).toHaveBeenCalled());
  fireEvent.click(screen.getByText('预问诊'));

  const form = await screen.findByTestId('preliminary-form');
  fireEvent.change(form.querySelector('[data-testid="f-chief"]')!, {
    target: { value: '咳嗽 2 天' },
  });
  fireEvent.change(form.querySelector('[data-testid="f-present"]')!, {
    target: { value: '2 天前出现咳嗽，伴发热' },
  });

  fireEvent.click(screen.getByTestId('preliminary-submit'));
  const done = await screen.findByTestId('preliminary-done');
  expect(done.textContent).toContain('预问诊报告已生成');
  expect(submitPreliminaryApi).toHaveBeenCalled();
});

it('在线：预问诊提交失败显示错误提示', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  submitPreliminaryApi.mockRejectedValue(new Error('请完善：主诉'));

  render(<SmartTriagePage />);
  await waitFor(() => expect(sysM.health).toHaveBeenCalled());
  fireEvent.click(screen.getByText('预问诊'));

  const form = await screen.findByTestId('preliminary-form');
  fireEvent.change(form.querySelector('[data-testid="f-chief"]')!, {
    target: { value: '咳嗽' },
  });
  fireEvent.change(form.querySelector('[data-testid="f-present"]')!, {
    target: { value: '咳嗽 2 天' },
  });

  fireEvent.click(screen.getByTestId('preliminary-submit'));
  await waitFor(() => {
    expect(form.textContent).toContain('请完善：主诉');
  });
});

it('医护：报告列表 → 查看详情 → 采用报告', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  const report = {
    id: 'p1',
    targetDepartment: '呼吸内科',
    chiefComplaint: '咳嗽 2 天',
    status: 'completed',
    reportText: '【预问诊报告】\n主诉：咳嗽 2 天\n现病史：2 天前出现咳嗽。',
  };
  listPreliminaryApi.mockResolvedValue([report] as never);
  consumePreliminaryApi.mockResolvedValue({
    ...report,
    status: 'consumed',
  } as never);

  render(<SmartTriagePage />);
  await waitFor(() => expect(sysM.health).toHaveBeenCalled());

  fireEvent.click(screen.getByText('预问诊报告（医护）'));

  // 表格渲染出查看按钮
  const viewBtn = await screen.findByTestId('view-p1');
  fireEvent.click(viewBtn);

  // Modal 详情
  const reportText = await screen.findByTestId('report-text');
  expect(reportText.textContent).toContain('咳嗽 2 天');
  expect(screen.getAllByText('呼吸内科').length).toBeGreaterThan(0);

  // 采用报告
  fireEvent.click(screen.getByTestId('modal-consume'));
  await waitFor(() => {
    expect(consumePreliminaryApi).toHaveBeenCalledWith('p1');
  });
});

it('医护：表格采用按钮 + 确认弹窗', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  const report = {
    id: 'p2', targetDepartment: '内科', chiefComplaint: '头晕',
    status: 'completed', reportText: '报告',
  };
  listPreliminaryApi.mockResolvedValue([report] as never);
  consumePreliminaryApi.mockResolvedValue({ ...report, status: 'consumed' } as never);

  render(<SmartTriagePage />);
  await waitFor(() => expect(sysM.health).toHaveBeenCalled());
  fireEvent.click(screen.getByText('预问诊报告（医护）'));

  const consumeBtn = await screen.findByTestId('consume-p2');
  fireEvent.click(consumeBtn);

  // 确认弹窗
  const confirmOk = await screen.findByText('确 定');
  fireEvent.click(confirmOk);
  await waitFor(() => {
    expect(consumePreliminaryApi).toHaveBeenCalledWith('p2');
  });
});

it('医护：已采用/无科室报告的状态渲染', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  const consumed = {
    id: 'p3', targetDepartment: null, chiefComplaint: '乏力',
    status: 'consumed', reportText: '报告',
  };
  listPreliminaryApi.mockResolvedValue([consumed] as never);

  render(<SmartTriagePage />);
  await waitFor(() => expect(sysM.health).toHaveBeenCalled());
  fireEvent.click(screen.getByText('预问诊报告（医护）'));

  // 表格渲染已采用状态
  const tag = await screen.findByText('已采用');
  expect(tag).toBeTruthy();

  // 查看详情，Modal 显示未指定科室
  fireEvent.click(screen.getByTestId('view-p3'));
  expect(await screen.findByText('未指定')).toBeTruthy();
});

it('患者视角：不显示医护报告 Tab，初始显示空状态', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  // 切换为患者角色
  const original = mockUser.user;
  mockUser.user = {
    id: 'patient1',
    realName: '患者',
    roles: ['patient'],
    roleCodes: ['patient'],
    permissions: ['triage:use'],
  };

  render(<SmartTriagePage />);
  await waitFor(() => expect(sysM.health).toHaveBeenCalled());

  // 不显示医护 Tab
  expect(screen.queryByText('预问诊报告（医护）')).toBeNull();
  // 初始空状态
  expect(screen.getByText('请输入症状开始导诊')).toBeTruthy();

  // 点击页面顶部刷新按钮（覆盖 header 刷新函数）
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  fireEvent.click(screen.getByText('刷新'));
  await waitFor(() => expect(sysM.health).toHaveBeenCalledTimes(2));

  mockUser.user = original;
});

it('断库：离线 Alert，不渲染业务内容', async () => {
  sysM.health.mockRejectedValue(new Error('数据库不可用'));

  render(<SmartTriagePage />);

  const offline = await screen.findByTestId('triage-offline');
  expect(offline.textContent).toContain('系统暂时不可用');
  expect(screen.queryByTestId('triage-tabs')).toBeNull();
});
