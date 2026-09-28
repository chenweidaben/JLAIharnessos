/**
 * 健澜科技 jlmedaios - 本地演示 ASR 提供者（离线、确定性）
 *
 * 用于无商用语音识别密钥的本地 / 离线环境：按稳定的 demo audioRef 返回
 * 预置、确定的转写脚本，不访问任何外部服务。
 *
 * 与 MockAsrProvider（测试夹具）的区别：本提供者服务于运行中的应用，
 * 自带固定演示语料，并在结果中明确标识 asr 引擎为 local-demo，
 * 绝不以演示转写冒充真实语音识别；未知 audioRef 返回空文本并明确提示，
 * 不臆造任何医疗内容。商用识别（讯飞/阿里/腾讯/Azure/OpenAI 兼容）
 * 通过实现 AsrProvider 接入。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import type { AsrProvider, TranscriptionRequest, TranscriptionResult } from '../types.js';

interface DemoScript {
  /** 业务说明（仅用于提示，不进入病历） */
  label: string;
  segments: { text: string; confidence: number; durationMs?: number; speakerId?: string }[];
}

/**
 * 内置演示语料：刻意覆盖口语填充词、口语→书面术语纠正、
 * 用药剂量 / 频次提及（安全关键）与低置信片段，便于演示完整后处理闭环。
 */
const DEMO_SCRIPTS: Record<string, DemoScript> = {
  'demo:cardiology-followup': {
    label: '心血管复诊口述',
    segments: [
      { text: '嗯，那个患者有高血压和冠心病多年，呃，既往心梗过一次', confidence: 0.95 },
      { text: '规律口服阿司匹林100毫克每日一次，二甲双瓜0.5克每天两次', confidence: 0.92 },
      { text: '夜间偶有胸闷', confidence: 0.62 },
    ],
  },
  'demo:respiratory-consult': {
    label: '呼吸科门诊口述',
    segments: [
      { text: '患者啊，咳嗽咳痰一周，呃，有慢阻肺病史', confidence: 0.93 },
      { text: '予阿莫西林0.5克每天三次，氨溴索30毫克每日三次', confidence: 0.9 },
    ],
  },
};

export class LocalDemoAsrProvider implements AsrProvider {
  readonly name = 'local-demo';

  /** 列出可用演示引用（供提示）。 */
  static availableRefs(): string[] {
    return Object.keys(DEMO_SCRIPTS);
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const script = DEMO_SCRIPTS[request.audioRef];
    if (!script) {
      return {
        transcriptId: `local-demo-${randomUUID()}`,
        fullText: '',
        segments: [],
        language: request.locale ?? 'zh-CN',
        durationMs: 0,
        provider: this.name,
        warnings: [
          `本地演示 ASR 未预置音频「${request.audioRef}」的转写，返回空文本（不臆造医疗内容）。` +
            `可用演示引用：${LocalDemoAsrProvider.availableRefs().join('、')}。` +
            '配置 ASR_PROVIDER 与 ASR_API_KEY 可接入真实语音识别。',
        ],
      };
    }

    let cursor = 0;
    const segments = script.segments.map((s) => {
      const dur = s.durationMs ?? Math.max(900, s.text.length * 180);
      const seg = {
        speakerId: s.speakerId,
        startMs: cursor,
        endMs: cursor + dur,
        text: s.text,
        confidence: s.confidence,
      };
      cursor += dur;
      return seg;
    });

    return {
      transcriptId: `local-demo-${randomUUID()}`,
      fullText: segments.map((s) => s.text).join(''),
      segments,
      language: request.locale ?? 'zh-CN',
      durationMs: cursor,
      provider: this.name,
      warnings: [
        '当前为离线本地演示识别引擎（local-demo），转写来自预置语料而非真实语音；' +
          '正式部署请配置商用 ASR，病历内容须经医师复核签名。',
      ],
    };
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true, detail: 'local-demo provider always available offline' };
  }
}
