/**
 * 健澜科技杠OS - 医疗语音后处理器
 *
 * 将 ASR 原始口语转写转换为规范书面病历语言：
 *   - 去除口语填充词（嗯、啊、那个…）；
 *   - 口语→书面医学术语纠正（同音/近音纠错词典，可按科室扩展）；
 *   - 用药与剂量提及检测（安全关键：数字+单位必须由医生确认，不自动改写数值）；
 *   - 低置信片段风险提示。
 *
 * 安全原则：剂量、频次、给药途径等关键信息**只标记、不臆改**，杜绝语音误识别致用药错误。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { MedicalSpeechPostProcessResult, TranscriptSegment } from './types.js';

/** 口语填充词（停顿词、语气词） */
const FILLER_WORDS = ['嗯', '呃', '啊', '哦', '那个', '这个', '就是说', '然后呢', '对吧', '是吧', '唉'];

/** 常见口语→书面医学术语纠正词典（可由医院按科室热词扩展） */
const DEFAULT_TERM_CORRECTIONS: Record<string, string> = {
  高血压: '高血压',
  糖尿病: '糖尿病',
  冠心病: '冠心病',
  脑梗: '脑梗死',
  心梗: '心肌梗死',
  甲肝: '甲型病毒性肝炎',
  乙肝: '乙型病毒性肝炎',
  甲亢: '甲状腺功能亢进症',
  甲减: '甲状腺功能减退症',
  上感: '上呼吸道感染',
  慢阻肺: '慢性阻塞性肺疾病',
  血常规: '血常规',
  尿常规: '尿常规',
  空腹血糖: '空腹血糖',
  糖化: '糖化血红蛋白',
  二甲双瓜: '二甲双胍',
  阿西匹林: '阿司匹林',
  阿莫西林: '阿莫西林',
  消心痛: '硝酸异山梨酯',
};

/** 剂量/用药关键单位（出现数字+这些单位时强制提示医生核对） */
const DOSAGE_UNIT_PATTERN =
  /(\d+(?:\.\d+)?)\s*(毫克|mg|克|g|微克|μg|ug|毫升|ml|片|粒|支|袋|单位|IU|滴|%)/g;
/** 频次关键模式 */
const FREQUENCY_PATTERN =
  /(每日\s*[\d一二三四五六七八九十两]+\s*次|每天\s*[\d一二三四五六七八九十两]+\s*次|一日\s*[\d一二三四五六七八九十两]+\s*次|tid|bid|qd|q\d+h|prn|必要时|睡前|餐前|餐后)/gi;

export interface PostProcessorOptions {
  termCorrections?: Record<string, string>;
  /** 低于该置信度的片段加入待确认提示 */
  confidenceThreshold?: number;
}

export class MedicalSpeechPostProcessor {
  private readonly termCorrections: Record<string, string>;
  private readonly confidenceThreshold: number;

  constructor(options: PostProcessorOptions = {}) {
    this.termCorrections = { ...DEFAULT_TERM_CORRECTIONS, ...(options.termCorrections ?? {}) };
    this.confidenceThreshold = options.confidenceThreshold ?? 0.85;
  }

  /** 处理整段转写（可含多个分段） */
  process(segments: TranscriptSegment[] | string): MedicalSpeechPostProcessResult {
    const rawSegments: TranscriptSegment[] =
      typeof segments === 'string'
        ? [{ startMs: 0, endMs: 0, text: segments, confidence: 1 }]
        : segments;

    const corrections: MedicalSpeechPostProcessResult['corrections'] = [];
    const medicationMentions: MedicalSpeechPostProcessResult['medicationMentions'] = [];
    const warnings: string[] = [];
    let removedFillerCount = 0;

    const processedTexts: string[] = [];

    for (const seg of rawSegments) {
      let text = seg.text;

      // 1. 去填充词
      for (const filler of FILLER_WORDS) {
        const matches = text.match(new RegExp(filler, 'g'));
        if (matches) removedFillerCount += matches.length;
        text = text.split(filler).join('');
      }

      // 2. 术语纠正
      for (const [from, to] of Object.entries(this.termCorrections)) {
        if (from !== to && text.includes(from)) {
          text = text.split(from).join(to);
          corrections.push({ from, to, reason: '口语/同音词规范化为标准医学术语' });
        }
      }

      // 3. 剂量检测（只标记，不改写数值）
      let m: RegExpExecArray | null;
      const dosageRe = new RegExp(DOSAGE_UNIT_PATTERN.source, 'g');
      while ((m = dosageRe.exec(text)) !== null) {
        medicationMentions.push({ raw: m[0], reason: '检测到剂量/单位，语音转写数字需医生核对' });
      }
      const freqRe = new RegExp(FREQUENCY_PATTERN.source, 'gi');
      while ((m = freqRe.exec(text)) !== null) {
        medicationMentions.push({ raw: m[0], reason: '检测到用药频次，需医生核对' });
      }

      // 4. 低置信提示
      if (seg.confidence > 0 && seg.confidence < this.confidenceThreshold) {
        warnings.push(`片段 ${seg.startMs}-${seg.endMs}ms 置信度偏低(${(seg.confidence * 100).toFixed(0)}%)，请核对：「${seg.text}」`);
      }

      processedTexts.push(text.trim());
    }

    if (medicationMentions.length > 0) {
      warnings.push(`共检测到 ${medicationMentions.length} 处用药/剂量/频次提及，依据安全规范未自动改写，请逐项核对后再入病历。`);
    }

    const text = processedTexts
      .filter(Boolean)
      .join('。')
      .replace(/。{2,}/g, '。')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return {
      text: text ? (text.endsWith('。') ? text : `${text}。`) : text,
      corrections,
      medicationMentions,
      removedFillerCount,
      warnings,
    };
  }
}
