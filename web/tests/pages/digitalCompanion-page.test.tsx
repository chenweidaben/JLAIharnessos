/**
 * 健澜科技 jlmedaios - 数字陪诊页面测试（M3-Q）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖：
 *  - 患者演示登录；
 *  - 陪诊向导：下一步/上一步、大字体切换；
 *  - 授权管理：选 scope、保存授权、撤销；
 *  - 就诊人添加；
 *  - 断库：离线 Alert。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@test-utils';

import DigitalCompanionPage from '@/pages/digitalCompanion';
import { useDigitalCompanionStore } from '@/store/digitalCompanionStore';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/patientPortal', () => ({
  patientLoginApi: vi.fn(),
  listMyProfilesApi: vi.fn(),
  addProfileApi: vi.fn(),
}));
vi.mock('@/services/api/delegation', () => ({
  grantDelegationApi: vi.fn(),
  revokeDelegationApi: vi.fn(),
  listDelegationHistoryApi: vi.fn(),
}));

import { systemApi } from '@/services/api/system';
import {
  patientLoginApi,
  listMyProfilesApi,
  addProfileApi,
} from '@/services/api/patientPortal';
import {
  grantDelegationApi,
  revokeDelegationApi,
  listDelegationHistoryApi,
} from '@/services/api/delegation';

const sysM = vi.mocked(systemApi);
const mLogin = vi.mocked(patientLoginApi);
const mProfiles = vi.mocked(listMyProfilesApi);
const mAddProfile = vi.mocked(addProfileApi);
const mGrant = vi.mocked(grantDelegationApi);
const mRevoke = vi.mocked(revokeDelegationApi);
const mHistory = vi.mocked(listDelegationHistoryApi);

beforeEach(() => {
  vi.clearAllMocks();
  useDigitalCompanionStore.setState({
    loggedIn: false,
    accountId: null,
    isDemoLogin: false,
    profiles: [],
    currentProfile: null,
    history: [],
    healthOk: false,
    healthMsg: '',
  });
});

it('断库：显示离线 Alert，不渲染登录', async () => {
  sysM.health.mockRejectedValue(new Error('数据库不可用'));
  render(<DigitalCompanionPage />);
  await waitFor(() => expect(sysM.health).toHaveBeenCalled());
  expect(await screen.findByText(/不会以缓存或假数据冒充/)).toBeInTheDocument();
  expect(screen.queryByText('患者端登录（演示）')).not.toBeInTheDocument();
});

it('在线：患者演示登录成功', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  mLogin.mockResolvedValue({
    token: 'ptok',
    accountId: 'acc1',
    isDemoLogin: true,
    profileCount: 0,
  } as never);
  mProfiles.mockResolvedValue([]);
  render(<DigitalCompanionPage />);

  await waitFor(() => expect(sysM.health).toHaveBeenCalled());
  fireEvent.click(await screen.findByTestId('patient-login-btn'));

  await waitFor(() => expect(mLogin).toHaveBeenCalled());
  expect(await screen.findByText('数字陪诊向导')).toBeInTheDocument();
});

it('陪诊向导：下一步/上一步切换', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  mLogin.mockResolvedValue({
    token: 't', accountId: 'a', isDemoLogin: true, profileCount: 0,
  } as never);
  mProfiles.mockResolvedValue([]);
  render(<DigitalCompanionPage />);
  fireEvent.click(await screen.findByTestId('patient-login-btn'));

  const detail = await screen.findByTestId('step-detail');
  expect(within(detail).getByText('智能导诊')).toBeInTheDocument();

  fireEvent.click(screen.getByTestId('next-step'));
  await waitFor(() =>
    expect(within(detail).getByText('预约挂号')).toBeInTheDocument()
  );

  fireEvent.click(screen.getByText('上一步'));
  await waitFor(() =>
    expect(within(detail).getByText('智能导诊')).toBeInTheDocument()
  );
});

it('陪诊向导：大字体切换', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  mLogin.mockResolvedValue({
    token: 't', accountId: 'a', isDemoLogin: true, profileCount: 0,
  } as never);
  mProfiles.mockResolvedValue([]);
  render(<DigitalCompanionPage />);
  fireEvent.click(await screen.findByTestId('patient-login-btn'));

  await screen.findByTestId('step-detail');
  fireEvent.click(screen.getByTestId('font-toggle'));
  expect(screen.getByTestId('font-toggle').textContent).toContain('标准字体');
});

it('授权管理：添加就诊人并保存授权', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  mLogin.mockResolvedValue({
    token: 't', accountId: 'acc1', isDemoLogin: true, profileCount: 1,
  } as never);
  mProfiles.mockResolvedValue([
    {
      id: 'prof1',
      relation: 'parent',
      nameMasked: '测*人',
      gender: '男',
      authLevel: 1,
      isDefault: false,
      patientId: null,
      delegatedScopes: [],
    },
  ]);
  mAddProfile.mockResolvedValue({ id: 'prof2', authLevel: 1 });
  mGrant.mockResolvedValue({ profileId: 'prof1', scopes: ['booking'] });
  mRevoke.mockResolvedValue({ profileId: 'prof1' });
  mHistory.mockResolvedValue([
    {
      id: 'd1',
      profileId: 'prof1',
      granterAccountId: 'acc1',
      scopes: ['booking'],
      action: 'grant',
      status: 'active',
      note: null,
      createdAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'd2',
      profileId: 'prof1',
      granterAccountId: 'acc1',
      scopes: [],
      action: 'revoke',
      status: 'revoked',
      note: null,
      createdAt: '2026-10-01T00:01:00Z',
    },
  ]);

  render(<DigitalCompanionPage />);
  fireEvent.click(await screen.findByTestId('patient-login-btn'));

  fireEvent.click(await screen.findByText('家属代办授权'));

  // 选择就诊人
  const select = document.querySelector('.ant-select-selector') as HTMLElement;
  fireEvent.mouseDown(select);
  const option = await screen.findByText('测*人（父母）');
  fireEvent.click(option);

  // 历史表格渲染：scope 标签 + 空范围占位
  await waitFor(() => expect(screen.getAllByText('预约挂号/退号').length).toBeGreaterThan(0));

  // 勾选预约（checkbox label 是第一个匹配）
  fireEvent.click(screen.getAllByText('预约挂号/退号')[0]);

  fireEvent.click(screen.getByText('保存授权'));
  await waitFor(() => expect(mGrant).toHaveBeenCalled());
});

it('授权失败：显示错误 Alert', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  mLogin.mockResolvedValue({
    token: 't', accountId: 'acc1', isDemoLogin: true, profileCount: 1,
  } as never);
  mProfiles.mockResolvedValue([
    {
      id: 'prof1', relation: 'parent', nameMasked: '测*人', gender: '男',
      authLevel: 1, isDefault: false, patientId: null, delegatedScopes: [],
    },
  ]);
  mGrant.mockRejectedValue(new Error('高风险操作需二次确认'));
  mHistory.mockResolvedValue([]);

  render(<DigitalCompanionPage />);
  fireEvent.click(await screen.findByTestId('patient-login-btn'));
  fireEvent.click(await screen.findByText('家属代办授权'));

  const select = document.querySelector('.ant-select-selector') as HTMLElement;
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByText('测*人（父母）'));

  // 勾选支付（高风险）但不确认
  fireEvent.click(await screen.findByText('在线支付/退费'));
  fireEvent.click(screen.getByText('保存授权'));

  await waitFor(() => expect(screen.findByTestId('delegation-error')).resolves.toBeInTheDocument());
});

it('就诊人管理：添加就诊人', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  mLogin.mockResolvedValue({
    token: 't', accountId: 'a', isDemoLogin: true, profileCount: 0,
  } as never);
  mProfiles.mockResolvedValue([]);
  mAddProfile.mockResolvedValue({ id: 'np', authLevel: 1 });

  render(<DigitalCompanionPage />);
  fireEvent.click(await screen.findByTestId('patient-login-btn'));
  fireEvent.click(await screen.findByText('就诊人管理'));

  const nameInput = await screen.findByPlaceholderText('就诊人真实姓名');
  fireEvent.change(nameInput, { target: { value: '王老人' } });
  fireEvent.click(screen.getByTestId('add-profile-btn'));

  await waitFor(() => expect(mAddProfile).toHaveBeenCalled());
});

it('撤销全部授权：调用 revoke', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  mLogin.mockResolvedValue({
    token: 't', accountId: 'acc1', isDemoLogin: true, profileCount: 1,
  } as never);
  mProfiles.mockResolvedValue([
    {
      id: 'prof1', relation: 'parent', nameMasked: '测*人', gender: '男',
      authLevel: 1, isDefault: false, patientId: null,
      delegatedScopes: ['booking'],
    },
  ]);
  mRevoke.mockResolvedValue({ profileId: 'prof1' });
  mHistory.mockResolvedValue([]);

  render(<DigitalCompanionPage />);
  fireEvent.click(await screen.findByTestId('patient-login-btn'));
  fireEvent.click(await screen.findByText('家属代办授权'));

  const select = document.querySelector('.ant-select-selector') as HTMLElement;
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByText('测*人（父母）'));

  fireEvent.click(await screen.findByText('撤销全部授权'));
  await waitFor(() => expect(mRevoke).toHaveBeenCalled());
});

it('就诊人列表：显示关系标签（relationLabel）', async () => {
  sysM.health.mockResolvedValue({ db: 'up' } as never);
  mLogin.mockResolvedValue({
    token: 't', accountId: 'acc1', isDemoLogin: true, profileCount: 1,
  } as never);
  mProfiles.mockResolvedValue([
    {
      id: 'prof1', relation: 'parent', nameMasked: '测*人', gender: '男',
      authLevel: 1, isDefault: true, patientId: null, delegatedScopes: [],
    },
  ]);

  render(<DigitalCompanionPage />);
  fireEvent.click(await screen.findByTestId('patient-login-btn'));
  fireEvent.click(await screen.findByText('就诊人管理'));

  expect(await screen.findByText('父母')).toBeInTheDocument();
});
