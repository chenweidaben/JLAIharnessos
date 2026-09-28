/**
 * 健澜科技 jlmedaios - 语音电子病历页面测试（M2-C）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：填写就诊 + 选择音频 → 转写；复核区用药未确认时转病历禁用，
 *    勾选确认后转病历并本人签名；作废流程；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库 / 转写另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import VoiceMedicalPage from '@/pages/voiceMedical';
import type { VoiceDictationDto } from '@/types/voiceMedical';

vi.mock('@/services/api/voiceMedical', () => ({
  fetchDictations: vi.fn(),
  dictate: vi.fn(),
  fetchDictation: vi.fn(),
  convertDictation: vi.fn(),
  discardDictation: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/voiceMedical';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function draft(over: Partial<VoiceDictationDto> = {}): VoiceDictationDto {
  return {
    id: 'd1', visitId: 'v1', patientId: 'p1', doctorId: 'doc1',
    audioRef: 'demo:cardiology-followup', audioFormat: 'wav', durationMs: 5000,
    asrProvider: 'local-demo',
    rawTranscript: '嗯，心梗，阿司匹林100毫克',
    normalizedText: '既往心肌梗死。口服阿司匹林100毫克每日一次。',
    segments: [{ startMs: 0, endMs: 1000, text: 'x', confidence: 0.95 }],
    corrections: [{ from: '心梗', to: '心肌梗死', reason: '术语规范化' }],
    medicationMentions: [
      { raw: '100毫克', reason: '剂量需核对' },
      { raw: '每日一次', reason: '频次需核对' },
    ],
    warnings: ['local-demo 演示引擎'],
    avgConfidence: 0.9, status: 'draft', resultingRecordId: null, convertedAt: null,
    createdAt: '2026-09-27T08:00:00Z', updatedAt: '2026-09-27T08:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
  m.fetchDictations.mockResolvedValue({ items: [], total: 0 });
  m.dictate.mockResolvedValue({ dictation: draft() });
  m.fetchDictation.mockResolvedValue({ dictation: draft() });
  m.convertDictation.mockResolvedValue({
    dictation: draft({ status: 'converted', resultingRecordId: 'rec1' }), recordId: 'rec1',
  });
  m.discardDictation.mockResolvedValue({ dictation: draft({ status: 'discarded' }) });
});

it('在线：填写就诊+音频 → 转写，复核区渲染', async () => {
  render(<VoiceMedicalPage />);
  expect(await screen.findByTestId('dictation-panel')).toBeInTheDocument();

  // 初始转写按钮禁用（缺就诊 / 音频）
  expect(screen.getByTestId('dictation-submit')).toBeDisabled();

  fireEvent.change(screen.getByTestId('dictation-visit-input'), {
    target: { value: 'v1' },
  });
  fireEvent.click(screen.getAllByTestId('dictation-demo-ref')[0]);
  expect(screen.getByTestId('dictation-submit')).toBeEnabled();

  fireEvent.click(screen.getByTestId('dictation-submit'));
  await waitFor(() => expect(m.dictate).toHaveBeenCalledTimes(1));
  expect(m.dictate.mock.calls[0][0]).toMatchObject({
    visitId: 'v1', audioRef: 'demo:cardiology-followup',
  });

  // 复核区显示原始转写、术语纠正、用药提及
  expect(await screen.findByTestId('transcript-raw')).toBeInTheDocument();
  expect(screen.getByTestId('transcript-corrections')).toBeInTheDocument();
  expect(screen.getByTestId('transcript-medications')).toBeInTheDocument();
  expect(screen.getByTestId('transcript-engine-tag')).toHaveTextContent('local-demo');
});

it('用药安全门禁：未勾选确认时转病历禁用；勾选后本人签名转病历', async () => {
  render(<VoiceMedicalPage />);
  expect(await screen.findByTestId('dictation-panel')).toBeInTheDocument();

  fireEvent.change(screen.getByTestId('dictation-visit-input'), {
    target: { value: 'v1' },
  });
  fireEvent.click(screen.getAllByTestId('dictation-demo-ref')[0]);
  fireEvent.click(screen.getByTestId('dictation-submit'));
  expect(await screen.findByTestId('transcript-final-input')).toBeInTheDocument();

  // 存在用药提及，未勾选确认 → 转病历禁用
  const convertBtn = screen.getByTestId('transcript-convert');
  expect(convertBtn).toBeDisabled();

  fireEvent.click(screen.getByTestId('transcript-confirm-meds'));
  expect(convertBtn).toBeEnabled();
  fireEvent.click(convertBtn);
  await waitFor(() => expect(m.convertDictation).toHaveBeenCalledTimes(1));
  const payload = m.convertDictation.mock.calls[0][1];
  expect(payload.finalText).toContain('心肌梗死');
  expect(payload.confirmMedications).toBe(true);
});

it('作废流程：确认 Popconfirm 后作废', async () => {
  render(<VoiceMedicalPage />);
  expect(await screen.findByTestId('dictation-panel')).toBeInTheDocument();
  fireEvent.change(screen.getByTestId('dictation-visit-input'), {
    target: { value: 'v1' },
  });
  fireEvent.click(screen.getAllByTestId('dictation-demo-ref')[0]);
  fireEvent.click(screen.getByTestId('dictation-submit'));
  await screen.findByTestId('transcript-final-input');

  fireEvent.click(screen.getByTestId('transcript-discard'));
  // antd Popconfirm（基于 Popover）确认按钮
  await waitFor(() =>
    expect(document.querySelector('.ant-popconfirm .ant-btn-primary')).not.toBeNull(),
  );
  fireEvent.click(document.querySelector('.ant-popconfirm .ant-btn-primary')!);
  await waitFor(() => expect(m.discardDictation).toHaveBeenCalledTimes(1));
});

it('会话列表：多状态渲染，点击已转换/已作废查看终态', async () => {
  const items = [
    draft({ id: 'd-draft', status: 'draft' }),
    draft({ id: 'd-conv', status: 'converted', resultingRecordId: 'rec9' }),
    draft({ id: 'd-disc', status: 'discarded' }),
  ];
  m.fetchDictations.mockResolvedValue({ items, total: 3 });
  m.fetchDictation.mockImplementation(async (id: string) => ({
    dictation:
      id === 'd-conv'
        ? draft({ id, status: 'converted', resultingRecordId: 'rec9' })
        : id === 'd-disc'
          ? draft({ id, status: 'discarded' })
          : draft({ id }),
  }));

  render(<VoiceMedicalPage />);
  expect(await screen.findByTestId('dictation-list')).toBeInTheDocument();
  expect(screen.getAllByTestId('dictation-item')).toHaveLength(3);
  expect(screen.getByText('待复核')).toBeInTheDocument();
  expect(screen.getByText('已转病历')).toBeInTheDocument();
  expect(screen.getByText('已作废')).toBeInTheDocument();

  // 点击已转换 → 终态成功提示（含病历 ID）
  const listItems = screen.getAllByTestId('dictation-item');
  fireEvent.click(listItems[1]);
  expect(await screen.findByTestId('transcript-finalized')).toHaveTextContent('rec9');

  // 点击已作废 → 终态作废提示
  fireEvent.click(screen.getAllByTestId('dictation-item')[2]);
  expect(await screen.findByText('该会话已作废')).toBeInTheDocument();
});

it('无用药提及：选格式→转写→手动编辑文本直接转病历（confirmMedications=false）', async () => {
  m.dictate.mockResolvedValueOnce({
    dictation: draft({
      audioRef: 'unknown-ref-xyz', normalizedText: '', medicationMentions: [],
      warnings: ['未预置该引用的演示语料'],
    }),
  });

  render(<VoiceMedicalPage />);
  expect(await screen.findByTestId('dictation-panel')).toBeInTheDocument();

  // 切换音频格式（覆盖格式选择）
  fireEvent.mouseDown(screen.getByTestId('dictation-format-select').querySelector('.ant-select-selector')!);
  fireEvent.click(await screen.findByText('mp3', { selector: '.ant-select-item-option-content' }));

  fireEvent.change(screen.getByTestId('dictation-visit-input'), { target: { value: 'v1' } });
  fireEvent.change(screen.getByTestId('dictation-ref-input'), { target: { value: 'unknown-ref-xyz' } });
  fireEvent.click(screen.getByTestId('dictation-submit'));

  const finalInput = await screen.findByTestId('transcript-final-input');
  expect(screen.queryByTestId('transcript-confirm-meds')).toBeNull();
  // 手动录入最终病历文本
  fireEvent.change(finalInput, { target: { value: '患者今日复诊，病情稳定。' } });
  const convertBtn = screen.getByTestId('transcript-convert');
  expect(convertBtn).toBeEnabled();
  fireEvent.click(convertBtn);
  await waitFor(() => expect(m.convertDictation).toHaveBeenCalledTimes(1));
  expect(m.convertDictation.mock.calls[0][1].confirmMedications).toBe(false);
});

it('断库恢复：点击刷新重新探活后恢复业务内容', async () => {
  healthMock
    .mockResolvedValueOnce({ status: 'ok', version: '0.3.0', demoMode: false, db: 'down' })
    .mockResolvedValue({ status: 'ok', version: '0.3.0', demoMode: false, db: 'up' });

  render(<VoiceMedicalPage />);
  const offline = await screen.findByTestId('voice-offline-alert');
  expect(offline).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '刷 新' }));
  expect(await screen.findByTestId('voice-content')).toBeInTheDocument();
  expect(healthMock).toHaveBeenCalledTimes(2);
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'down',
  });
  render(<VoiceMedicalPage />);
  expect(await screen.findByTestId('voice-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('voice-content')).toBeNull();
  expect(screen.getByTestId('voice-health-tag')).toHaveTextContent('BFF/DB 不可用');
});
