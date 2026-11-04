/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 登录页「演示角色一键登录」单测（P0-7 前端收尾）：
 *  - 点击医生按钮 → POST /auth/demo-login 成功后 tokenStorage.getAccessToken() 非空；
 *  - 后端返 400（非法 role）→ 页面弹出错误提示，不静默。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import LoginPage from '@/pages/LoginPage';
import { tokenStorage } from '@/utils/auth';

// 用 hoisted 句柄在 beforeEach 里显式安装 mock 实现，避免 restoreMocks 把工厂里的实现清空
const mocks = vi.hoisted(() => ({
  fetchCaptcha: vi.fn(),
  fetchQrCode: vi.fn(),
  mockSsoLogin: vi.fn(),
  ssoProviders: [] as Array<{ id: string; name: string; protocol: string }>,
  demoLoginApi: vi.fn(),
}));

vi.mock('@/mock/authMock', () => ({
  fetchCaptcha: mocks.fetchCaptcha,
  fetchQrCode: mocks.fetchQrCode,
  mockSsoLogin: mocks.mockSsoLogin,
  ssoProviders: mocks.ssoProviders,
  LoginError: class LoginError extends Error {
    code = 'BAD_CREDENTIALS';
    constructor(code: string, message: string) {
      super(message);
      this.name = 'LoginError';
      this.code = code;
    }
  },
  LoginMfaRequiredError: class LoginMfaRequiredError extends Error {
    challengeId = '';
    constructor(c: string) {
      super('MFA_REQUIRED');
      this.challengeId = c;
    }
  },
}));

vi.mock('@/services/api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api/auth')>();
  return { ...actual, demoLoginApi: mocks.demoLoginApi };
});

function okResponse(role: 'doctor' | 'nurse' | 'pharmacist' | 'admin') {
  const nameMap = {
    doctor: '演示医生',
    nurse: '演示护士',
    pharmacist: '演示药师',
    admin: '演示管理员',
  } as const;
  return {
    tokens: {
      accessToken: `demo-access-${role}-xyz`,
      refreshToken: '',
      expiresIn: 7200,
    },
    user: {
      id: `demo-${role}`,
      username: `demo-${role}`,
      realName: nameMap[role],
      employeeNo: '',
      gender: 'unknown' as const,
      deptCode: '',
      deptName: '',
      title: '',
      phone: '',
      email: '',
      status: 'active' as const,
      roles: [],
      roleCodes: [role] as unknown as never,
      permissions: ['dashboard:view'],
      dataScope: 'dept' as const,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mocks.fetchCaptcha.mockResolvedValue({ captchaId: 'c1', image: '' });
  mocks.fetchQrCode.mockResolvedValue({
    ticket: 'q1',
    image: '',
    status: 'waiting',
    expiresAt: Date.now() + 60_000,
  });
  mocks.mockSsoLogin.mockResolvedValue({ url: '' });
});

it('点击医生演示按钮后 token 写入 storage', async () => {
  mocks.demoLoginApi.mockResolvedValue(okResponse('doctor'));
  render(<LoginPage />);

  fireEvent.click(await screen.findByText('演示角色'));
  fireEvent.click(screen.getByText('医生'));

  await waitFor(() => {
    expect(mocks.demoLoginApi).toHaveBeenCalledWith('doctor');
  });
  await waitFor(() => {
    expect(tokenStorage.getAccessToken()).toBe('demo-access-doctor-xyz');
  });
});

it('后端返 400 时页面弹出错误提示，不静默', async () => {
  mocks.demoLoginApi.mockRejectedValue(new Error('role 必须为 doctor/nurse/pharmacist/admin 之一'));
  render(<LoginPage />);

  fireEvent.click(await screen.findByText('演示角色'));
  fireEvent.click(screen.getByText('管理员'));

  expect(
    await screen.findByText('role 必须为 doctor/nurse/pharmacist/admin 之一'),
  ).toBeInTheDocument();
  expect(tokenStorage.getAccessToken()).toBe('');
});
