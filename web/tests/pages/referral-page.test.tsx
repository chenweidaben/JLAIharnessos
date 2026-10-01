/**
 * 健澜科技 jlmedaios - 双向转诊页面测试（M3-R）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：发起转诊登记、方向切换、队列点击处理；
 *  - 详情：补充资料、接收（生成本院就诊）、拒绝、完成、取消；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/HTTP 另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import ReferralPage from '@/pages/referral';
import type { ReferralDetail, ReferralOrder } from '@/types/referral';

vi.mock('@/services/api/referral', () => ({
  createReferralApi: vi.fn(),
  listReferralsApi: vi.fn(),
  getReferralApi: vi.fn(),
  addDocumentApi: vi.fn(),
  acceptReferralApi: vi.fn(),
  rejectReferralApi: vi.fn(),
  completeReferralApi: vi.fn(),
  cancelReferralApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/referral';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function order(over: Partial<ReferralOrder> = {}): ReferralOrder {
  return {
    id: 'r1',
    referralNo: 'REF20261001001',
    direction: 'incoming',
    patientId: null,
    profileId: null,
    patientName: '张*三',
    gender: '男',
    birthDate: null,
    sourceOrg: '县人民医院',
    sourceDept: '内科',
    sourceDoctor: '李医生',
    targetOrg: '本院',
    targetDept: '心血管内科',
    reason: '胸痛待查',
    urgency: 'normal',
    status: 'submitted',
    encounterId: null,
    acceptedBy: null,
    acceptedAt: null,
    rejectedReason: null,
    createdBy: 'u1',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    ...over,
  };
}

function detail(over: Partial<ReferralDetail> = {}): ReferralDetail {
  return {
    referral: order(),
    documents: [
      {
        id: 'd1',
        referralId: 'r1',
        docType: 'lab',
        title: '血常规',
        contentRef: null,
        contentText: '白细胞 11.2',
        sourceOrg: '县人民医院',
        receivedAt: '2026-10-01T08:00:00Z',
        createdAt: '2026-10-01T08:00:00Z',
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'up',
  });
  m.listReferralsApi.mockResolvedValue([order(), order({ id: 'r2', direction: 'outgoing' })]);
  m.getReferralApi.mockResolvedValue(detail());
  m.createReferralApi.mockResolvedValue(order({ id: 'r3' }));
  m.addDocumentApi.mockResolvedValue(detail());
  m.acceptReferralApi.mockResolvedValue(
    detail({
      referral: order({
        status: 'accepted',
        encounterId: 'v1',
        patientId: 'pat1',
      }),
    }),
  );
  m.rejectReferralApi.mockResolvedValue(
    order({ status: 'rejected', rejectedReason: '资料不全' }),
  );
  m.completeReferralApi.mockResolvedValue(order({ status: 'completed' }));
  m.cancelReferralApi.mockResolvedValue(order({ status: 'cancelled' }));
});

async function waitOnline() {
  return screen.findByTestId('ref-content');
}

it('在线：发起转诊登记', async () => {
  render(<ReferralPage />);
  await waitOnline();

  // 填写表单
  fireEvent.change(screen.getByPlaceholderText('院外患者姓名'), {
    target: { value: '王患者' },
  });
  fireEvent.change(screen.getByPlaceholderText('如 某某县人民医院'), {
    target: { value: '县医院' },
  });
  fireEvent.change(screen.getByPlaceholderText('如 本院'), {
    target: { value: '本院' },
  });
  fireEvent.change(screen.getByPlaceholderText('病情摘要与转诊原因'), {
    target: { value: '需进一步检查' },
  });

  fireEvent.click(screen.getByText('登记转诊单'));
  await waitFor(() => expect(m.createReferralApi).toHaveBeenCalledTimes(1));
});

it('队列：方向切换过滤', async () => {
  render(<ReferralPage />);
  await waitOnline();

  fireEvent.click(screen.getByRole('radio', { name: '转入' }));
  await waitFor(() =>
    expect(m.listReferralsApi).toHaveBeenCalledWith({ direction: 'incoming' }),
  );

  fireEvent.click(screen.getByRole('radio', { name: '转出' }));
  await waitFor(() =>
    expect(m.listReferralsApi).toHaveBeenCalledWith({ direction: 'outgoing' }),
  );
});

it('队列：点击处理打开详情', async () => {
  render(<ReferralPage />);
  await waitOnline();

  const buttons = screen.getAllByText('处理');
  fireEvent.click(buttons[0]);
  await waitFor(() => expect(m.getReferralApi).toHaveBeenCalledWith('r1'));
  expect(await screen.findByText('转诊详情 · REF20261001001')).toBeInTheDocument();
});

it('详情：补充资料', async () => {
  render(<ReferralPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('处理')[0]);
  await screen.findByText('转诊详情 · REF20261001001');

  fireEvent.click(screen.getByText('补充资料'));
  fireEvent.change(screen.getByPlaceholderText('如 胸部CT'), {
    target: { value: '胸部CT' },
  });
  fireEvent.click(screen.getByRole('button', { name: '确 定' }));
  await waitFor(() => expect(m.addDocumentApi).toHaveBeenCalledTimes(1));
});

it('接收：生成本院就诊', async () => {
  render(<ReferralPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('处理')[0]);
  await screen.findByText('转诊详情 · REF20261001001');

  fireEvent.click(screen.getByRole('button', { name: '接收并生成本院就诊' }));
  const acceptModal = await screen.findByRole('dialog', {
    name: '接收转诊并生成本院就诊',
  });
  fireEvent.change(
    within(acceptModal).getByPlaceholderText('如 心血管内科'),
    { target: { value: '心血管内科' } },
  );
  fireEvent.click(within(acceptModal).getByRole('button', { name: '确 定' }));
  await waitFor(() => expect(m.acceptReferralApi).toHaveBeenCalledTimes(1));
});

it('拒绝：填写原因', async () => {
  render(<ReferralPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('处理')[0]);
  await screen.findByText('转诊详情 · REF20261001001');

  fireEvent.click(screen.getByRole('button', { name: '拒 绝' }));
  const rejectModal = await screen.findByRole('dialog', { name: '拒绝转诊' });
  fireEvent.change(within(rejectModal).getByRole('textbox'), {
    target: { value: '资料不全' },
  });
  fireEvent.click(within(rejectModal).getByRole('button', { name: '确 定' }));
  await waitFor(() => expect(m.rejectReferralApi).toHaveBeenCalledTimes(1));
});

it('已接收后：完成', async () => {
  m.getReferralApi.mockResolvedValue(
    detail({
      referral: order({
        status: 'accepted',
        encounterId: 'v1',
        patientId: 'pat1',
      }),
    }),
  );
  render(<ReferralPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('处理')[0]);
  await screen.findByText('转诊详情 · REF20261001001');

  fireEvent.click(screen.getByRole('button', { name: '完 成' }));
  await waitFor(() => expect(m.completeReferralApi).toHaveBeenCalledTimes(1));
});

it('待处理：取消', async () => {
  render(<ReferralPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('处理')[0]);
  await screen.findByText('转诊详情 · REF20261001001');

  fireEvent.click(screen.getByRole('button', { name: '取 消' }));
  // Popconfirm 确认
  fireEvent.click(await screen.findByRole('button', { name: '确 定' }));
  await waitFor(() => expect(m.cancelReferralApi).toHaveBeenCalledTimes(1));
});

it('随附资料列表渲染', async () => {
  render(<ReferralPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByText('处理')[0]);
  await screen.findByText('转诊详情 · REF20261001001');
  expect(screen.getByText('血常规')).toBeInTheDocument();
});

it('断库：显式离线 Alert，不渲染业务内容；刷新恢复', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'down',
  });
  render(<ReferralPage />);
  expect(await screen.findByTestId('ref-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('ref-content')).toBeNull();
  expect(screen.getByTestId('ref-health-tag')).toHaveTextContent('BFF/DB 不可用');

  // 点击离线 Alert 中的刷新（onRefresh），此时恢复在线
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'up',
  });
  m.listReferralsApi.mockResolvedValueOnce([]);
  fireEvent.click(screen.getByRole('button', { name: '刷 新' }));
  expect(await screen.findByTestId('ref-content')).toBeInTheDocument();
});
