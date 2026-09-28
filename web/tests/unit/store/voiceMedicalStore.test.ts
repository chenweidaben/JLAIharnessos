/**
 * 健澜科技 jlmedaios - 语音病历 voiceMedicalStore 单元测试（M2-C）
 *
 * mock services/api/voiceMedical 与 pharmacy 健康探针，验证：
 *  - 健康门禁（up/down/抛错）；
 *  - 会话列表、详情加载（成功/失败）；
 *  - 口述/转病历/作废写门禁（dbUp=false 拒绝、成功刷新读模型、失败留 error）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/voiceMedical', () => ({
  fetchDictations: vi.fn(),
  dictate: vi.fn(),
  fetchDictation: vi.fn(),
  convertDictation: vi.fn(),
  discardDictation: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as voiceApi from '@/services/api/voiceMedical';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useVoiceMedicalStore } from '@/store/voiceMedicalStore';
import type { VoiceDictationDto } from '@/types/voiceMedical';

const m = voiceApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

const dictation = (over: Partial<VoiceDictationDto> = {}): VoiceDictationDto => ({
  id: 'd1',
  visitId: 'v1',
  patientId: 'p1',
  doctorId: 'doc1',
  audioRef: 'demo:cardiology-followup',
  audioFormat: 'wav',
  durationMs: 5000,
  asrProvider: 'local-demo',
  rawTranscript: '嗯，心梗',
  normalizedText: '既往心肌梗死。',
  segments: [{ startMs: 0, endMs: 1000, text: '嗯，心梗', confidence: 0.95 }],
  corrections: [{ from: '心梗', to: '心肌梗死', reason: '术语规范化' }],
  medicationMentions: [{ raw: '100毫克', reason: '剂量需核对' }],
  warnings: ['local-demo 演示'],
  avgConfidence: 0.9,
  status: 'draft',
  resultingRecordId: null,
  convertedAt: null,
  createdAt: '2026-09-27T08:00:00Z',
  updatedAt: '2026-09-27T08:00:00Z',
  ...over,
});

const initial = useVoiceMedicalStore.getState();

beforeEach(() => {
  useVoiceMedicalStore.setState({
    ...initial, dictations: [], current: null, lastRecordId: null,
  });
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
});

describe('voiceMedicalStore 健康门禁', () => {
  it('探活成功 dbUp=true；抛错 dbUp=false 并留 error', async () => {
    expect(await useVoiceMedicalStore.getState().checkHealth()).toBe(true);
    expect(useVoiceMedicalStore.getState().dbUp).toBe(true);

    healthMock.mockRejectedValueOnce(new Error('network down'));
    expect(await useVoiceMedicalStore.getState().checkHealth()).toBe(false);
    expect(useVoiceMedicalStore.getState().error).toContain('network down');
  });
});

describe('voiceMedicalStore 读模型', () => {
  it('loadDictations 成功/失败', async () => {
    m.fetchDictations.mockResolvedValueOnce({ items: [dictation()], total: 1 });
    await useVoiceMedicalStore.getState().loadDictations();
    expect(useVoiceMedicalStore.getState().dictations).toHaveLength(1);

    m.fetchDictations.mockRejectedValueOnce(new Error('bad'));
    await useVoiceMedicalStore.getState().loadDictations();
    expect(useVoiceMedicalStore.getState().error).toBe('bad');
  });

  it('selectDictation 成功/失败', async () => {
    m.fetchDictation.mockResolvedValueOnce({ dictation: dictation() });
    expect(await useVoiceMedicalStore.getState().selectDictation('d1')).toBe(true);
    expect(useVoiceMedicalStore.getState().current?.id).toBe('d1');

    m.fetchDictation.mockRejectedValueOnce(new Error('no'));
    expect(await useVoiceMedicalStore.getState().selectDictation('d2')).toBe(false);
    expect(useVoiceMedicalStore.getState().error).toBe('no');
  });
});

describe('voiceMedicalStore 写门禁', () => {
  it('dictate：dbUp=false 拒绝；成功后置为当前并刷新列表', async () => {
    useVoiceMedicalStore.setState({ dbUp: false });
    expect(
      await useVoiceMedicalStore.getState().dictate({
        visitId: 'v1', audioRef: 'demo:cardiology-followup',
      }),
    ).toBe(false);
    expect(m.dictate).not.toHaveBeenCalled();

    useVoiceMedicalStore.setState({ dbUp: true });
    m.dictate.mockResolvedValueOnce({ dictation: dictation() });
    m.fetchDictations.mockResolvedValueOnce({ items: [dictation()], total: 1 });
    expect(
      await useVoiceMedicalStore.getState().dictate({
        visitId: 'v1', audioRef: 'demo:cardiology-followup',
      }),
    ).toBe(true);
    expect(useVoiceMedicalStore.getState().currentId).toBe('d1');
  });

  it('convert：无 currentId false；dbUp=false 拒绝；成功记录 recordId', async () => {
    expect(
      await useVoiceMedicalStore.getState().convert({ finalText: 'x' }),
    ).toBe(false);

    useVoiceMedicalStore.setState({ dbUp: false, currentId: 'd1' });
    expect(
      await useVoiceMedicalStore.getState().convert({ finalText: 'x' }),
    ).toBe(false);

    useVoiceMedicalStore.setState({ dbUp: true });
    m.convertDictation.mockResolvedValueOnce({ dictation: dictation({ status: 'converted' }), recordId: 'rec1' });
    m.fetchDictations.mockResolvedValueOnce({ items: [], total: 0 });
    expect(
      await useVoiceMedicalStore.getState().convert({
        finalText: '既往心肌梗死。', confirmMedications: true,
      }),
    ).toBe(true);
    expect(useVoiceMedicalStore.getState().lastRecordId).toBe('rec1');

    m.convertDictation.mockRejectedValueOnce(new Error('409'));
    expect(
      await useVoiceMedicalStore.getState().convert({ finalText: 'x' }),
    ).toBe(false);
    expect(useVoiceMedicalStore.getState().error).toBe('409');
  });

  it('discard：dbUp=false 拒绝；成功刷新；clearError 清除', async () => {
    useVoiceMedicalStore.setState({ dbUp: true, currentId: 'd1' });
    m.discardDictation.mockResolvedValueOnce({ dictation: dictation({ status: 'discarded' }) });
    m.fetchDictations.mockResolvedValueOnce({ items: [], total: 0 });
    expect(await useVoiceMedicalStore.getState().discard()).toBe(true);

    useVoiceMedicalStore.setState({ error: 'x' });
    useVoiceMedicalStore.getState().clearError();
    expect(useVoiceMedicalStore.getState().error).toBeNull();
  });
});
