/**
 * 健澜科技 jlmedaios - 输血管理工作站页面测试（M10-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：健康标签、队列渲染、详情加载；
 *  - 新建申请（成分/血型/剂量/指征必填）；
 *  - 按状态的操作流：requested 配血 → crossmatched 发血 → dispensed 双人核对输注
 *    → transfusing 完成输注 → completed 不良反应上报；
 *  - 断库离线 Alert（不渲染业务内容）。
 *
 * BFF 经 vi.mock 隔离；真实断库另有 HTTP 端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import TransfusionPage from '@/pages/transfusion';
import type { TransfusionRequest, TransfusionDetail } from '@/types/transfusion';

vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

vi.mock('@/services/api/transfusion', () => ({
  applyTransfusion: vi.fn(),
  listTransfusions: vi.fn(),
  getTransfusion: vi.fn(),
  crossmatchTransfusion: vi.fn(),
  dispenseTransfusion: vi.fn(),
  startTransfusion: vi.fn(),
  completeTransfusion: vi.fn(),
  stopTransfusion: vi.fn(),
  cancelTransfusion: vi.fn(),
  reportReaction: vi.fn(),
}));

import { getSystemHealth } from '@/services/api/pharmacy';
import * as api from '@/services/api/transfusion';

const healthMock = vi.mocked(getSystemHealth);
const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function req(over: Partial<TransfusionRequest> = {}): TransfusionRequest {
  return {
    id: 't1', requestNo: 'BLOOD001', visitId: 'v1', patientId: 'p1',
    department: '普外科', applicantId: 'u1',
    indication: '重度贫血 Hb 65 g/L',
    indicationMeta: { hb: 65, cds: { suggestion: 'Hb 65 g/L < 70，符合红细胞输注指征' } },
    bloodType: 'O', component: 'red_cell', unitCount: 2, urgency: 'routine',
    status: 'requested', rejectReason: null,
    crossmatchResult: null, crossmatchNote: null, crossmatchedBy: null, crossmatchedAt: null,
    batchNo: null, dispensedBy: null, dispensedAt: null,
    cancelledBy: null, cancelledAt: null, cancelReason: null,
    createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z', ...over,
  };
}
function detailOf(r: TransfusionRequest): TransfusionDetail {
  return {
    req: r,
    transfusion: r.status === 'transfusing' ? {
      id: 'tr1', requestId: r.id, startAt: '2026-10-01T09:00:00.000Z', endAt: null,
      transfusedBy: 'nurse_ma', coSignBy: 'admin', dripRate: '20 滴/分', status: 'ongoing',
      vitalSigns: {}, stopReason: null, createdAt: '2026-10-01T09:00:00.000Z',
    } : null,
    reactions: [],
    stock: [{ id: 'st1', bloodType: 'O', component: 'red_cell', batchNo: 'RC-O-2026-001', units: 20, expiryDate: '2026-12-31' }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({ status: 'ok', demoMode: false, db: 'up' });
  m.listTransfusions.mockResolvedValue([req()]);
  m.applyTransfusion.mockResolvedValue({ req: req({ requestNo: 'BLOODX1' }), created: true });
  m.crossmatchTransfusion.mockResolvedValue(req({ status: 'crossmatched' }));
  m.dispenseTransfusion.mockResolvedValue(req({ status: 'dispensed', batchNo: 'RC-O-2026-001' }));
  m.startTransfusion.mockResolvedValue(req({ status: 'transfusing' }));
  m.completeTransfusion.mockResolvedValue(req({ status: 'completed' }));
  m.stopTransfusion.mockResolvedValue(req({ status: 'cancelled', cancelReason: '停输' }));
  m.cancelTransfusion.mockResolvedValue(req({ status: 'cancelled', cancelReason: '取消' }));
  m.reportReaction.mockResolvedValue({ reaction: {}, req: req() });
});

/** 打开申请详情（队列行点击） */
async function openDetail(status: TransfusionRequest['status']) {
  m.getTransfusion.mockResolvedValue(detailOf(req({ status })));
  render(<TransfusionPage />);
  fireEvent.click((await screen.findByText('BLOOD001')).closest('tr')!);
  expect(await screen.findByText('输血申请详情 · BLOOD001')).toBeTruthy();
}

/** antd Select：按 Form.Item label 定位后 mousedown 打开，再点 option（前缀/包含匹配） */
async function pickSelect(labelText: string, optionText: string) {
  const item = [...screen.queryAllByRole('dialog').flatMap((d) => [...d.querySelectorAll('.ant-form-item')]),
    ...document.querySelectorAll('.ant-form-item')].find((el) =>
    el.querySelector('.ant-form-item-label')?.textContent?.includes(labelText));
  const selector = item?.querySelector('.ant-select-selector');
  if (!selector) throw new Error(`未找到 Select：${labelText}`);
  fireEvent.mouseDown(selector);
  fireEvent.click(await screen.findByText(
    (_content: string, el: Element | null) => {
      const node = el as HTMLElement | null;
      return (
        node?.className === 'ant-select-item-option-content' &&
        (node.textContent?.includes(optionText) ?? false)
      );
    },
    { selector: '.ant-select-item-option-content' },
  ));
}

/** 按 Form.Item label 填 Input */
function fillByLabel(labelText: string, value: string | number) {
  const item = [...document.querySelectorAll('.ant-form-item')].find((el) =>
    el.querySelector('.ant-form-item-label')?.textContent?.includes(labelText));
  const input = item?.querySelector('input');
  if (!input) throw new Error(`未找到输入框：${labelText}`);
  fireEvent.change(input, { target: { value } });
}

it('在线：健康标签 + 队列渲染多条', async () => {
  m.listTransfusions.mockResolvedValue([
    req(),
    req({ id: 't2', requestNo: 'BLOOD002', status: 'completed', component: 'plasma' }),
  ]);
  render(<TransfusionPage />);
  expect(await screen.findByTestId('transfusion-health-tag')).toHaveTextContent('BFF/DB 正常 (up)');
  expect(await screen.findByText('BLOOD001')).toBeTruthy();
  expect(screen.getByText('BLOOD002')).toBeTruthy();
});

it('新建申请：必填校验 + 提交调用 apply', async () => {
  render(<TransfusionPage />);
  fireEvent.click(await screen.findByRole('button', { name: '新建输血申请' }));
  const dlg = await screen.findByRole('dialog');
  const ok = within(dlg).getAllByRole('button', { name: /确\s*定/ })[0];

  // 空表单提交 → 校验失败，不调用
  fireEvent.click(ok);
  await waitFor(() => expect(within(dlg).getByText('请输入就诊ID')).toBeTruthy());
  expect(m.applyTransfusion).not.toHaveBeenCalled();

  within(dlg).getByPlaceholderText('住院就诊 UUID') &&
    fireEvent.change(within(dlg).getByPlaceholderText('住院就诊 UUID'), { target: { value: 'visit-1' } });
  fireEvent.change(within(dlg).getByPlaceholderText('患者 UUID'), { target: { value: 'patient-1' } });
  // 成分 / 血型 / 剂量 / 紧急度
  await pickSelect('血液成分', '红细胞');
  await pickSelect('血型', 'O型');
  fillByLabel('剂量(U)', 2);
  await pickSelect('紧急度', '常规');
  fireEvent.change(within(dlg).getByPlaceholderText('如：重度贫血 Hb 65 g/L，伴心悸乏力'), { target: { value: '重度贫血 Hb 60 g/L' } });

  fireEvent.click(ok);
  await waitFor(() => expect(m.applyTransfusion).toHaveBeenCalled(), { timeout: 5000 });
  expect(m.applyTransfusion).toHaveBeenCalledWith(
    expect.objectContaining({ visitId: 'visit-1', patientId: 'patient-1', bloodType: 'O', component: 'red_cell', unitCount: 2, indication: '重度贫血 Hb 60 g/L' }),
  );
}, 30000);

it('requested：交叉配血 → 调用 crossmatch', async () => {
  await openDetail('requested');
  fireEvent.click(screen.getByRole('button', { name: '交叉配血' }));
  const dlg = await screen.findByRole('dialog');
  fireEvent.change(within(dlg).getByPlaceholderText('如：ABO 血型相容，配血相合'), { target: { value: 'ABO 相合' } });
  fireEvent.click(within(dlg).getAllByRole('button', { name: /确\s*定/ })[0]);
  await waitFor(() => expect(m.crossmatchTransfusion).toHaveBeenCalled(), { timeout: 5000 });
  expect(m.crossmatchTransfusion).toHaveBeenCalledWith('t1', 'ABO 相合', undefined);
}, 30000);

it('crossmatched：发血（选批次）→ 调用 dispense', async () => {
  await openDetail('crossmatched');
  fireEvent.click(screen.getByRole('button', { name: '血库发血' }));
  const dlg = await screen.findByRole('dialog');
  await pickSelect('批次号', 'RC-O-2026-001');
  fireEvent.click(within(dlg).getAllByRole('button', { name: /确\s*定/ })[0]);
  await waitFor(() => expect(m.dispenseTransfusion).toHaveBeenCalled(), { timeout: 5000 });
  expect(m.dispenseTransfusion).toHaveBeenCalledWith('t1', 'RC-O-2026-001');
}, 30000);

it('dispensed：双人核对输注（核对护士≠执行护士）→ 调用 start', async () => {
  await openDetail('dispensed');
  fireEvent.click(screen.getByRole('button', { name: '开始输注（双人核对）' }));
  const dlg = await screen.findByRole('dialog');
  fireEvent.change(within(dlg).getByPlaceholderText('核对护士 UUID（≠ 当前执行护士）'), { target: { value: 'nurse_other' } });
  fireEvent.change(within(dlg).getByPlaceholderText('如：10 滴/分'), { target: { value: '20 滴/分' } });
  fireEvent.click(within(dlg).getAllByRole('button', { name: /确\s*定/ })[0]);
  await waitFor(() => expect(m.startTransfusion).toHaveBeenCalled(), { timeout: 5000 });
  expect(m.startTransfusion).toHaveBeenCalledWith('t1', 'nurse_other', '20 滴/分');
}, 30000);

it('transfusing：完成输注（Popconfirm 确认）→ 调用 complete', async () => {
  await openDetail('transfusing');
  fireEvent.click(screen.getByRole('button', { name: '完成输注' }));
  await waitFor(() => expect(screen.getByText('确认完成本次输血？')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
  await waitFor(() => expect(m.completeTransfusion).toHaveBeenCalled(), { timeout: 5000 });
  expect(m.completeTransfusion).toHaveBeenCalledWith('t1', undefined);
}, 30000);

it('completed：上报不良反应（分级/处置必选）→ 调用 reaction', async () => {
  await openDetail('completed');
  fireEvent.click(screen.getByRole('button', { name: '上报不良反应' }));
  const dlg = await screen.findByRole('dialog');
  fireEvent.change(within(dlg).getByPlaceholderText('如：发热、皮疹、寒战'), { target: { value: '发热寒战' } });
  await pickSelect('分级', '中度');
  await pickSelect('处置', '立即停输');
  fireEvent.click(within(dlg).getAllByRole('button', { name: /确\s*定/ })[0]);
  await waitFor(() => expect(m.reportReaction).toHaveBeenCalled(), { timeout: 5000 });
  expect(m.reportReaction).toHaveBeenCalledWith('t1', expect.objectContaining({ severity: 'moderate', symptom: '发热寒战', action: 'stop' }));
}, 30000);

it('断库：离线 Alert 且不渲染业务内容', async () => {
  healthMock.mockRejectedValue(new Error('数据库不可用'));
  render(<TransfusionPage />);
  expect(await screen.findByTestId('transfusion-offline-alert')).toBeTruthy();
  expect(screen.queryByText('BLOOD001')).toBeNull();
  expect(screen.queryByText('新建输血申请')).toBeNull();
});

it('在线：点击刷新重新拉取列表', async () => {
  render(<TransfusionPage />);
  await screen.findByText('BLOOD001');
  const before = m.listTransfusions.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }));
  await waitFor(() => expect(m.listTransfusions.mock.calls.length).toBeGreaterThan(before), { timeout: 5000 });
}, 30000);

it('新建申请：取消不调用 apply', async () => {
  render(<TransfusionPage />);
  fireEvent.click(await screen.findByRole('button', { name: '新建输血申请' }));
  const dlg = await screen.findByRole('dialog');
  fireEvent.click(within(dlg).getByRole('button', { name: /取\s*消/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 5000 });
  expect(m.applyTransfusion).not.toHaveBeenCalled();
}, 30000);

it('requested：取消申请（Popconfirm 确认）→ 调用 cancel', async () => {
  await openDetail('requested');
  fireEvent.click(screen.getByRole('button', { name: '取消申请' }));
  await waitFor(() => expect(screen.getByText('确认取消该输血申请？')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
  await waitFor(() => expect(m.cancelTransfusion).toHaveBeenCalled(), { timeout: 5000 });
  expect(m.cancelTransfusion).toHaveBeenCalledWith('t1', '申请方主动取消');
}, 30000);

it('transfusing：异常停输（Popconfirm 确认）→ 调用 stop', async () => {
  await openDetail('transfusing');
  fireEvent.click(screen.getByRole('button', { name: '异常停输' }));
  await waitFor(() => expect(screen.getByText('确认异常停输？')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
  await waitFor(() => expect(m.stopTransfusion).toHaveBeenCalled(), { timeout: 5000 });
  expect(m.stopTransfusion).toHaveBeenCalledWith('t1', '临床停输（原因见不良反应上报）');
}, 30000);
