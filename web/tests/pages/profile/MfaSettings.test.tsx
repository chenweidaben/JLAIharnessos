/**
 * 健澜科技杠OS - MFA 多因素认证绑定/管理组件测试
 *
 * Copyright (c) 2026 杭州健澜科技有限公司.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App as AntdApp } from 'antd';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@test-utils';

import MfaSettings from '@/pages/profile/MfaSettings';
import {
  getMfaStatus,
  enrollMfa,
  confirmMfa,
  disableMfa,
} from '@/services/api/auth';

vi.mock('@/services/api/auth', () => ({
  getMfaStatus: vi.fn(),
  enrollMfa: vi.fn(),
  confirmMfa: vi.fn(),
  disableMfa: vi.fn(),
}));

const status = vi.mocked(getMfaStatus);
const enroll = vi.mocked(enrollMfa);
const confirm = vi.mocked(confirmMfa);
const disable = vi.mocked(disableMfa);

function renderMfa() {
  return render(
    <AntdApp>
      <MfaSettings />
    </AntdApp>,
  );
}

const BACKUP = ['K7MP-2QRX', 'N4TH-8VKB'];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MfaSettings', () => {
  it('未开启时展示开始绑定入口', async () => {
    status.mockResolvedValue({ enabled: false, remainingBackupCodes: 0 });
    renderMfa();
    expect(await screen.findByText('开始绑定')).toBeInTheDocument();
    expect(screen.queryByText('关闭 MFA')).not.toBeInTheDocument();
  });

  it('完整绑定流程：扫码→输入动态码→展示一次性备份码→已开启', async () => {
    const user = userEvent.setup({ delay: null });
    status.mockResolvedValue({ enabled: false, remainingBackupCodes: 0 });
    enroll.mockResolvedValue({
      secret: 'JBSWY3DPK5XXE3DE',
      otpauthUri: 'otpauth://totp/test?secret=JBSWY3DPK5XXE3DE&issuer=gangos',
    });
    confirm.mockResolvedValue({ backupCodes: BACKUP });
    renderMfa();

    await user.click(await screen.findByText('开始绑定'));
    // 进入绑定步骤：展示二维码与密钥
    expect(await screen.findByText('JBSWY3DPK5XXE3DE')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();

    // 输入 6 位动态码并确认
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.click(screen.getByText('确认绑定'));

    // 一次性备份码弹窗
    expect(await screen.findByText('K7MP-2QRX')).toBeInTheDocument();
    expect(screen.getByText('N4TH-8VKB')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledWith('123456');

    // 关闭备份码弹窗（点取消按钮“关闭”，区别于“复制全部并关闭”）
    await user.click(screen.getByTestId('backup-codes-close'));
    // 确认成功后即进入已开启状态（背景卡片渲染，不依赖弹窗卸载动画）
    expect(await screen.findByText('已开启')).toBeInTheDocument();
    expect(screen.getByText('关闭 MFA')).toBeInTheDocument();
  }, 30000);

  it('动态码非 6 位数字时不提交确认', async () => {
    const user = userEvent.setup({ delay: null });
    status.mockResolvedValue({ enabled: false, remainingBackupCodes: 0 });
    enroll.mockResolvedValue({
      secret: 'JBSWY3DPK5XXE3DE',
      otpauthUri: 'otpauth://totp/test?secret=JBSWY3DPK5XXE3DE',
    });
    renderMfa();
    await user.click(await screen.findByText('开始绑定'));
    await screen.findByText('JBSWY3DPK5XXE3DE');
    await user.type(screen.getByPlaceholderText('000000'), '12');
    await user.click(screen.getByText('确认绑定'));
    expect(confirm).not.toHaveBeenCalled();
  });

  it('已开启时展示状态与剩余备份码，并可校验后停用', async () => {
    const user = userEvent.setup({ delay: null });
    status
      .mockResolvedValueOnce({ enabled: true, remainingBackupCodes: 8 })
      .mockResolvedValueOnce({ enabled: false, remainingBackupCodes: 0 });
    disable.mockResolvedValue({ disabled: true });
    renderMfa();

    expect(await screen.findByText('已开启')).toBeInTheDocument();
    expect(screen.getByText('8 个')).toBeInTheDocument();

    await user.click(screen.getByText('关闭 MFA'));
    const codeInput = await screen.findByPlaceholderText(/动态码或.*备份码/);
    await user.type(codeInput, '123456');
    await user.click(screen.getByText('确认关闭'));

    await waitFor(() => expect(disable).toHaveBeenCalledWith('123456'));
    // 停用后刷新回到未绑定
    expect(await screen.findByText('开始绑定')).toBeInTheDocument();
  });
});
