/**
 * 健澜科技 jlmedaios - 手术麻醉工作站页面测试（M9-C）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：健康标签、队列渲染、状态 Tab 筛选；
 *  - 全生命周期操作：排班→三方核对→诱导→术中事件/阶段推进→PACU 评分/双签→离室；
 *  - 取消流程；断库离线 Alert（不渲染业务内容）。
 *
 * BFF 经 vi.mock 隔离；真实断库另有 HTTP 端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import SurgeryPage from '@/pages/surgery';
import type { SurgeryRequest, SurgeryDetail } from '@/types/surgery';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/surgery', () => ({
  submitSurgery: vi.fn(),
  listSurgeries: vi.fn(),
  getSurgery: vi.fn(),
  scheduleSurgery: vi.fn(),
  precheckSurgery: vi.fn(),
  inductionSurgery: vi.fn(),
  stageSurgery: vi.fn(),
  eventSurgery: vi.fn(),
  pacuAssess: vi.fn(),
  signSurgery: vi.fn(),
  dischargeSurgery: vi.fn(),
  cancelSurgery: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as api from '@/services/api/surgery';

const healthMock = vi.mocked(getSystemHealth);
const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function req(over: Partial<SurgeryRequest> = {}): SurgeryRequest {
  return {
    id: 's1', requestNo: 'SUR001', visitId: 'v1', patientId: 'p1',
    surgeryType: 'elective', plannedProcedure: '腹腔镜胆囊切除术',
    diagnosis: '胆囊结石伴胆囊炎', plannedDate: '2026-10-10',
    department: '普外科', surgeonId: null, anesthetistId: null,
    anesthesiaMethod: null, status: 'requested', precheck: {},
    surgeonSignedAt: null, anesthetistSignedAt: null,
    createdAt: '2026-10-01T08:00:00.000Z', ...over,
  };
}
function detailOf(r: SurgeryRequest, events: SurgeryDetail['events'] = []): SurgeryDetail {
  return { req: r, events };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  m.listSurgeries.mockResolvedValue([req()]);
  m.getSurgery.mockResolvedValue(detailOf(req()));
  m.submitSurgery.mockResolvedValue(req({ requestNo: 'SURX1' }));
  m.scheduleSurgery.mockResolvedValue(req({ status: 'scheduled' }));
  m.precheckSurgery.mockResolvedValue(req({ status: 'prechecked' }));
  m.inductionSurgery.mockResolvedValue(req({ status: 'induction' }));
  m.stageSurgery.mockResolvedValue(req({ status: 'maintenance' }));
  m.eventSurgery.mockResolvedValue(req());
  m.pacuAssess.mockResolvedValue({ req: req({ status: 'pacu' }), canDischarge: false });
  m.signSurgery.mockResolvedValue(req({ surgeonSignedAt: '2026-10-10T09:00:00.000Z' }));
  m.dischargeSurgery.mockResolvedValue(req({ status: 'discharged' }));
  m.cancelSurgery.mockResolvedValue(req({ status: 'cancelled' }));
});

it('在线：健康标签 + 队列渲染 + 状态 Tab 筛选', async () => {
  m.listSurgeries.mockResolvedValue([
    req(),
    req({ id: 's2', requestNo: 'SUR002', status: 'pacu', plannedProcedure: '阑尾切除术' }),
  ]);
  render(<SurgeryPage />);

  expect(await screen.findByTestId('surgery-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  expect(await screen.findByText('腹腔镜胆囊切除术')).toBeInTheDocument();
  expect(screen.getByText('阑尾切除术')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'PACU (1)' }));
  await waitFor(() => expect(screen.queryByText('腹腔镜胆囊切除术')).not.toBeInTheDocument());
  expect(screen.getByText('阑尾切除术')).toBeInTheDocument();
});

it('requested：打开详情 → 排班 → 调用 schedule', async () => {
  m.getSurgery.mockResolvedValue(detailOf(req()));
  render(<SurgeryPage />);

  fireEvent.click(await screen.findByTestId('open-s1'));
  expect(await screen.findByText('手术申请详情 · SUR001')).toBeInTheDocument();
  expect(screen.getByText('手术排班')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '确认排程' }));
  await waitFor(() => expect(m.scheduleSurgery).toHaveBeenCalledTimes(1), { timeout: 5000 });
});

it('scheduled：术前三方核对 → 调用 precheck', async () => {
  m.listSurgeries.mockResolvedValue([req({ status: 'scheduled' })]);
  m.getSurgery.mockResolvedValue(detailOf(req({ status: 'scheduled' })));
  render(<SurgeryPage />);

  fireEvent.click(await screen.findByTestId('open-s1'));
  expect(await screen.findByText('术前三方核对（患者/术式/麻醉/术者/抗生素/皮试）')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '完成三方核对' }));
  await waitFor(() => expect(m.precheckSurgery).toHaveBeenCalledTimes(1), { timeout: 5000 });
});

it('prechecked：麻醉诱导 → 调用 induction', async () => {
  m.listSurgeries.mockResolvedValue([req({ status: 'prechecked' })]);
  m.getSurgery.mockResolvedValue(detailOf(req({ status: 'prechecked' })));
  render(<SurgeryPage />);

  fireEvent.click(await screen.findByTestId('open-s1'));
  expect((await screen.findAllByText('麻醉诱导')).length).toBeGreaterThan(0);

  fireEvent.change(screen.getByPlaceholderText('药物、剂量、生命体征等'), {
    target: { value: '丙泊酚 120mg 静注' },
  });
  fireEvent.click(screen.getByRole('button', { name: '开始麻醉诱导' }));
  await waitFor(() => expect(m.inductionSurgery).toHaveBeenCalledTimes(1), { timeout: 5000 });
});

it('术中：记录事件 + 阶段推进', async () => {
  m.listSurgeries.mockResolvedValue([req({ status: 'maintenance' })]);
  m.getSurgery.mockResolvedValue(detailOf(req({ status: 'maintenance' }), [
    { id: 'e1', eventType: '血压波动', occurredAt: '2026-10-10T09:30:00.000Z', payload: { note: 'SBP 90mmHg' } },
  ]));
  render(<SurgeryPage />);

  fireEvent.click(await screen.findByTestId('open-s1'));
  expect(await screen.findByText('术中管理')).toBeInTheDocument();
  expect(screen.getByText('血压波动')).toBeInTheDocument();

  // 选择事件类型（antd Select：selector mouseDown + option-content 点击）
  const combo = screen.getByRole('combobox');
  fireEvent.mouseDown(combo.closest('.ant-select')!.querySelector('.ant-select-selector')!);
  fireEvent.click(await screen.findByText('出血', { selector: '.ant-select-item-option-content' }));
  fireEvent.change(screen.getByPlaceholderText('事件说明'), {
    target: { value: '术中出血 200ml' },
  });
  fireEvent.click(screen.getByRole('button', { name: '记录事件' }));
  await waitFor(() => expect(m.eventSurgery).toHaveBeenCalledTimes(1), { timeout: 5000 });

  // 阶段推进（状态机决定唯一下一阶段：maintenance→recovery）
  fireEvent.change(screen.getByPlaceholderText('阶段备注'), {
    target: { value: '生命体征平稳' },
  });
  fireEvent.click(screen.getByRole('button', { name: '推进至 麻醉复苏' }));
  await waitFor(() => expect(m.stageSurgery).toHaveBeenCalledTimes(1), { timeout: 5000 });
}, 30000);

it('pacu：评分提交 + 双签禁用逻辑 + 离室', async () => {
  m.listSurgeries.mockResolvedValue([req({ status: 'pacu' })]);
  m.getSurgery.mockResolvedValue(detailOf(req({ status: 'pacu' })));
  render(<SurgeryPage />);

  fireEvent.click(await screen.findByTestId('open-s1'));
  expect(await screen.findByText('PACU 复苏评分与离室')).toBeInTheDocument();

  // 未签名时"执行离室"禁用
  const dischargeBtn = screen.getByRole('button', { name: '执行离室' });
  expect((dischargeBtn as HTMLButtonElement).disabled).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: '术者签名' }));
  await waitFor(() => expect(m.signSurgery).toHaveBeenCalledWith('s1', 'surgeon'), { timeout: 5000 });
});

it('取消流程：打开取消 Modal → 提交原因 → 调用 cancel', async () => {
  render(<SurgeryPage />);

  fireEvent.click(await screen.findByTestId('open-s1'));
  fireEvent.click(await screen.findByRole('button', { name: '取消申请' }));
  fireEvent.change(await screen.findByPlaceholderText('说明取消原因'), {
    target: { value: '患者暂缓手术' },
  });
  const okBtn = await screen.findByRole('button', { name: /确\s*定|OK/i });
  fireEvent.click(okBtn);
  await waitFor(() => expect(m.cancelSurgery).toHaveBeenCalledWith('s1', '患者暂缓手术'), { timeout: 5000 });
}, 30000);

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('ECONNREFUSED'));
  render(<SurgeryPage />);

  expect(await screen.findByTestId('surgery-offline-alert')).toBeInTheDocument();
  expect(screen.queryByText('新建手术申请')).not.toBeInTheDocument();
  expect(m.listSurgeries).not.toHaveBeenCalled();
});

it('刷新：点击刷新重新探活并重载列表', async () => {
  render(<SurgeryPage />);
  await screen.findByTestId('surgery-health-tag');
  expect(m.listSurgeries).toHaveBeenCalledTimes(1);

  const refreshBtn = await screen.findByText(/刷\s*新/);
  fireEvent.click(refreshBtn.closest('button') ?? refreshBtn);
  await waitFor(() => expect(healthMock).toHaveBeenCalledTimes(2), { timeout: 5000 });
  await waitFor(() => expect(m.listSurgeries).toHaveBeenCalledTimes(2), { timeout: 5000 });
});

it('新建申请：打开 Modal → 填表提交 → 调用 submit', async () => {
  render(<SurgeryPage />);
  await screen.findByTestId('surgery-health-tag');

  const newBtn = await screen.findByText('新建手术申请');
  fireEvent.click(newBtn.closest('button') ?? newBtn);
  expect(await screen.findByPlaceholderText('住院就诊 UUID')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('住院就诊 UUID'), { target: { value: 'v1' } });
  fireEvent.change(screen.getByPlaceholderText('患者 UUID'), { target: { value: 'p1' } });
  fireEvent.change(screen.getByPlaceholderText('如：腹腔镜胆囊切除术'), { target: { value: '腹腔镜胆囊切除术' } });
  fireEvent.change(screen.getByPlaceholderText('如：普外科'), { target: { value: '普外科' } });

  const okBtn = await screen.findByRole('button', { name: /确\s*定|OK/i });
  fireEvent.click(okBtn);
  await waitFor(() => expect(m.submitSurgery).toHaveBeenCalledTimes(1), { timeout: 5000 });
  const arg = (m.submitSurgery as ReturnType<typeof vi.fn>).mock.calls[0][0] as { visitId: string; patientId: string; plannedProcedure: string };
  expect(arg.visitId).toBe('v1');
  expect(arg.patientId).toBe('p1');
  expect(arg.plannedProcedure).toBe('腹腔镜胆囊切除术');
}, 30000);

