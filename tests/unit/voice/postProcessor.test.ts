/**
 * 健澜科技杠OS - 医疗语音后处理器单元测试
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, it, expect } from 'bun:test';
import { MedicalSpeechPostProcessor } from '@/voice/MedicalSpeechPostProcessor.js';
import { MockAsrProvider } from '@/voice/providers/MockAsrProvider.js';
import { AsrService } from '@/voice/AsrService.js';

describe('医疗语音后处理器', () => {
  const pp = new MedicalSpeechPostProcessor();

  it('去除口语填充词', () => {
    const r = pp.process('嗯，患者啊，那个主诉头晕');
    expect(r.text).not.toContain('嗯');
    expect(r.text).not.toContain('那个');
    expect(r.removedFillerCount).toBeGreaterThan(0);
    expect(r.text).toContain('患者');
    expect(r.text).toContain('头晕');
  });

  it('口语术语规范化（脑梗→脑梗死、二甲双瓜→二甲双胍）', () => {
    const r = pp.process('初步考虑脑梗，既往糖尿病，口服二甲双瓜');
    expect(r.text).toContain('脑梗死');
    expect(r.text).toContain('二甲双胍');
    expect(r.corrections.some((c) => c.from === '二甲双瓜' && c.to === '二甲双胍')).toBe(true);
  });

  it('检测剂量与单位并强制提示核对（不自动改写数值）', () => {
    const r = pp.process('予二甲双胍 0.5克 每日两次餐后服用');
    expect(r.medicationMentions.some((m) => m.raw.includes('0.5'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('用药') || w.includes('剂量'))).toBe(true);
    // 数值保持原样，不被"纠正"
    expect(r.text).toContain('0.5');
  });

  it('检测用药频次', () => {
    const r = pp.process('阿司匹林每日一次睡前口服');
    expect(r.medicationMentions.some((m) => m.raw.includes('每日一次'))).toBe(true);
  });

  it('低置信片段进入待确认提示', () => {
    const r = pp.process([
      { startMs: 0, endMs: 1000, text: '患者血压正常', confidence: 0.5 },
    ]);
    expect(r.warnings.some((w) => w.includes('置信度偏低'))).toBe(true);
  });
});

describe('AsrService 与 Mock 提供者', () => {
  it('注册夹具后转写并后处理', async () => {
    const provider = new MockAsrProvider().registerFixture('audio-1', {
      fullText: '嗯，患者头晕三天',
      segments: [{ text: '嗯，患者头晕三天', confidence: 0.97 }],
    });
    const service = new AsrService(provider);
    const out = await service.transcribe({ audioRef: 'audio-1' });
    expect(out.transcription.fullText).toContain('头晕');
    expect(out.postProcessed.text).not.toContain('嗯');
  });

  it('未注册夹具返回空文本与提示，不臆造内容', async () => {
    const service = new AsrService(new MockAsrProvider());
    const out = await service.transcribe({ audioRef: 'missing' });
    expect(out.transcription.fullText).toBe('');
    expect(out.transcription.warnings.length).toBeGreaterThan(0);
  });
});
