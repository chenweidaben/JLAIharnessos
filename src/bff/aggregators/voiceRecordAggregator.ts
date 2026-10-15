/**
 * 健澜科技 jlmedaios - 病历 AI 语音录入与智能补全聚合器（M152-B）
 *
 * 【AI能力深化】医生口述 → 结构化病历；输入时智能提示（常用主诉/诊断/用药）；病历模板自动填充。
 * 本模块全部为纯函数：不连数据库、不发网络请求、不依赖外部 ASR；
 * 真实语音识别（ASR）由上游语音中台完成后，把转写文本以 VoiceAudioInput 传入。
 *
 * 内置医疗术语词典：高血压 / 糖尿病 / 冠脉造影 / 冠心病 / 阿司匹林 / 二甲双胍 等，
 * 用于语音转写后的医学实体识别与智能补全召回。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

/** 病历类型 */
export type RecordType = 'admission' | 'progress' | 'consult' | 'discharge';

/**
 * 语音输入载荷。纯函数视角下不直接解析二进制音频：
 *  - string：已转写文本（直传）
 *  - { transcript }：语音中台回传的结构化结果
 *  - Blob：原始音频（无 ASR 时退化为空转写，不臆造内容）
 */
export type VoiceAudioInput = string | { transcript?: string; durationSec?: number } | Blob;

/** 结构化病历 */
export interface StructuredRecord {
  recordType: RecordType;
  rawTranscript: string;
  chiefComplaint: string;
  presentIllness: string;
  physicalExam: string;
  diagnosis: string[];
  treatment: string[];
  /** 识别出的医疗术语（医学实体） */
  recognizedTerms: string[];
  /** 结构化置信度 0-1 */
  confidence: number;
}

/** 智能补全候选项 */
export interface Completion {
  kind: 'chief_complaint' | 'diagnosis' | 'medication' | 'template';
  text: string;
  /** 命中相关度 0-1 */
  score: number;
  reason: string;
}

/** 补全上下文 */
export interface CompletionContext {
  dept?: string;
  recordType?: RecordType;
}

/* ------------------------------------------------------------------ *
 * 内置医疗术语词典（【AI能力深化】医疗术语识别）
 * category: symptom 症状 / diagnosis 诊断 / drug 药品 / procedure 操作
 * ------------------------------------------------------------------ */
export interface DictEntry {
  term: string;
  category: 'symptom' | 'diagnosis' | 'drug' | 'procedure';
  /** 标准化术语（可选） */
  standard?: string;
}

export const MEDICAL_DICTIONARY: readonly DictEntry[] = [
  // 症状
  { term: '胸痛', category: 'symptom', standard: '胸痛' },
  { term: '胸闷', category: 'symptom', standard: '胸闷' },
  { term: '心悸', category: 'symptom', standard: '心悸' },
  { term: '咳嗽', category: 'symptom', standard: '咳嗽' },
  { term: '咳痰', category: 'symptom', standard: '咳痰' },
  { term: '发热', category: 'symptom', standard: '发热' },
  { term: '头晕', category: 'symptom', standard: '头晕' },
  { term: '头痛', category: 'symptom', standard: '头痛' },
  { term: '多饮', category: 'symptom', standard: '多饮' },
  { term: '多尿', category: 'symptom', standard: '多尿' },
  // 诊断
  { term: '高血压', category: 'diagnosis', standard: '原发性高血压' },
  { term: '原发性高血压', category: 'diagnosis', standard: '原发性高血压' },
  { term: '糖尿病', category: 'diagnosis', standard: '2型糖尿病' },
  { term: '2型糖尿病', category: 'diagnosis', standard: '2型糖尿病' },
  { term: '冠心病', category: 'diagnosis', standard: '冠状动脉粥样硬化性心脏病' },
  { term: '冠状动脉粥样硬化性心脏病', category: 'diagnosis', standard: '冠状动脉粥样硬化性心脏病' },
  { term: '急性冠脉综合征', category: 'diagnosis', standard: '急性冠脉综合征' },
  { term: '社区获得性肺炎', category: 'diagnosis', standard: '社区获得性肺炎' },
  { term: '心绞痛', category: 'diagnosis', standard: '不稳定型心绞痛' },
  // 操作/检查
  { term: '冠脉造影', category: 'procedure', standard: '冠状动脉造影术' },
  { term: '冠状动脉造影', category: 'procedure', standard: '冠状动脉造影术' },
  { term: '支架植入', category: 'procedure', standard: '经皮冠状动脉支架植入术' },
  // 药品
  { term: '阿司匹林', category: 'drug', standard: '阿司匹林肠溶片' },
  { term: '硝酸甘油', category: 'drug', standard: '硝酸甘油片' },
  { term: '阿托伐他汀', category: 'drug', standard: '阿托伐他汀钙片' },
  { term: '氨氯地平', category: 'drug', standard: '苯磺酸氨氯地平片' },
  { term: '二甲双胍', category: 'drug', standard: '盐酸二甲双胍缓释片' },
  { term: '胰岛素', category: 'drug', standard: '重组人胰岛素注射液' },
  { term: '阿莫西林', category: 'drug', standard: '阿莫西林胶囊' },
  { term: '头孢呋辛', category: 'drug', standard: '头孢呋辛酯片' },
  { term: '氨溴索', category: 'drug', standard: '盐酸氨溴索口服溶液' },
] as const;

/** 从语音载荷中抽取转写文本（纯函数，无副作用） */
export function extractTranscript(audio: VoiceAudioInput): string {
  if (typeof audio === 'string') return audio.trim();
  if (audio && typeof audio === 'object' && 'transcript' in audio) {
    return String((audio as { transcript?: unknown }).transcript ?? '').trim();
  }
  // Blob / 其他：无可用转写文本，返回空，不臆造
  return '';
}

/** 医疗术语识别：返回文本中命中的标准化术语（按出现顺序去重） */
export function recognizeMedicalTerms(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const entry of MEDICAL_DICTIONARY) {
    if (text.includes(entry.term)) {
      const std = entry.standard ?? entry.term;
      if (!found.includes(std)) found.push(std);
    }
  }
  return found;
}

/** 按类别筛选命中术语 */
function termsByCategory(text: string, category: DictEntry['category']): string[] {
  const out: string[] = [];
  for (const entry of MEDICAL_DICTIONARY) {
    if (entry.category !== category) continue;
    if (text.includes(entry.term)) {
      const std = entry.standard ?? entry.term;
      if (!out.includes(std)) out.push(std);
    }
  }
  return out;
}

/** 取首句作为主诉（按中文句读切分） */
function firstClause(text: string): string {
  const m = text.split(/[，。；,.\n]/).map((s) => s.trim()).filter(Boolean);
  return m[0] ?? '';
}

/**
 * 【AI能力深化】纯函数：医生口述音频 → 结构化病历。
 * @param audio 语音载荷（转写文本/结构化结果/Blob）
 * @param recordType 病历类型 admission/progress/consult/discharge
 */
export function voiceToMedicalRecord(audio: VoiceAudioInput, recordType: RecordType = 'progress'): StructuredRecord {
  const rawTranscript = extractTranscript(audio);
  const recognizedTerms = recognizeMedicalTerms(rawTranscript);
  const diagnosis = termsByCategory(rawTranscript, 'diagnosis');
  const treatment = termsByCategory(rawTranscript, 'drug');

  // 主诉：优先取命中的症状，否则取口述首句
  const symptoms = termsByCategory(rawTranscript, 'symptom');
  const chiefComplaint = symptoms[0] || firstClause(rawTranscript);

  // 置信度：术语命中密度（0-1），无任何术语时给一个低置信度
  const density = rawTranscript.length > 0 ? recognizedTerms.length / Math.max(4, rawTranscript.length / 6) : 0;
  const confidence = Math.min(1, Math.round((0.35 + density) * 100) / 100);

  return {
    recordType,
    rawTranscript,
    chiefComplaint,
    presentIllness: rawTranscript,
    physicalExam: '',
    diagnosis,
    treatment,
    recognizedTerms,
    confidence: rawTranscript ? confidence : 0,
  };
}

/**
 * 【AI能力深化】纯函数：输入时智能补全（常用主诉/诊断/用药/模板）。
 * @param currentText 当前已输入文本
 * @param context 科室/病历类型上下文
 */
export function smartCompleteMedicalRecord(currentText: string, context: CompletionContext = {}): Completion[] {
  const text = (currentText ?? '').trim();
  if (!text) return []; // 无输入不凭空提示
  const dept = (context.dept ?? '').trim();
  const completions: Completion[] = [];
  const push = (kind: Completion['kind'], item: Omit<Completion, 'kind'>) => {
    // 已在输入中的不重复提示
    if (item.text && text && text.includes(item.text)) return;
    completions.push({ kind, ...item });
  };

  const cardio = /心内|心血管|胸痛|胸闷|冠脉|冠心病|高血压|心悸/.test(text) || /心内|心血管|cardio/i.test(dept);
  const endocrine = /内分泌|血糖|糖尿病|多饮|多尿/.test(text) || /内分泌|endocrine/i.test(dept);
  const respiratory = /呼吸|咳嗽|咳痰|发热|肺炎|肺/.test(text) || /呼吸|respiratory/i.test(dept);

  // 诊断提示
  if (cardio) {
    push('diagnosis', { text: '冠状动脉粥样硬化性心脏病', score: 0.92, reason: '关联胸痛/胸闷与心血管科室' });
    push('diagnosis', { text: '急性冠脉综合征', score: 0.88, reason: '急性胸痛鉴别诊断' });
    push('diagnosis', { text: '原发性高血压', score: 0.8, reason: '心血管合并症常见诊断' });
    push('medication', { text: '阿司匹林肠溶片 100mg qd', score: 0.9, reason: '冠心病双联抗血小板基础用药' });
    push('medication', { text: '阿托伐他汀钙片 20mg qn', score: 0.86, reason: '调脂稳定斑块' });
    push('medication', { text: '硝酸甘油片 0.5mg 舌下含服 prn', score: 0.82, reason: '心绞痛急救用药' });
    push('chief_complaint', { text: '反复胸闷胸痛3天，加重2小时', score: 0.85, reason: '心血管科常用主诉模板' });
  }
  if (endocrine) {
    push('diagnosis', { text: '2型糖尿病', score: 0.93, reason: '多饮多尿典型症状/内分泌科室' });
    push('medication', { text: '盐酸二甲双胍缓释片 0.5g bid', score: 0.9, reason: '2型糖尿病一线用药' });
    push('medication', { text: '重组人胰岛素注射液 皮下注射', score: 0.78, reason: '血糖控制不佳时强化方案' });
    push('chief_complaint', { text: '发现血糖升高5年，控制不佳1周', score: 0.84, reason: '内分泌科常用主诉模板' });
  }
  if (respiratory) {
    push('diagnosis', { text: '社区获得性肺炎', score: 0.9, reason: '咳嗽咳痰发热典型组合' });
    push('medication', { text: '头孢呋辛酯片 0.5g bid', score: 0.85, reason: '社区获得性肺炎经验性抗感染' });
    push('medication', { text: '盐酸氨溴索口服溶液 10ml tid', score: 0.8, reason: '化痰对症治疗' });
    push('chief_complaint', { text: '咳嗽咳痰伴发热3天', score: 0.83, reason: '呼吸科常用主诉模板' });
  }

  // 兜底：无上下文时给通用诊断/用药建议
  if (!cardio && !endocrine && !respiratory) {
    push('diagnosis', { text: '原发性高血压', score: 0.6, reason: '全科常见诊断' });
    push('diagnosis', { text: '2型糖尿病', score: 0.55, reason: '全科常见慢性病诊断' });
  }

  // 模板填充提示（按病历类型）
  const tpl = RECORD_TEMPLATES[context.recordType ?? 'progress'];
  if (tpl) {
    push('template', {
      text: `套用「${tpl.name}」模板自动填充结构化骨架`,
      score: 0.7,
      reason: `按 ${context.recordType ?? 'progress'} 病历类型推荐模板`,
    });
  }

  return completions.sort((a, b) => b.score - a.score).slice(0, 8);
}

/* ------------------------------------------------------------------ *
 * 病历模板自动填充（【AI能力深化】）
 * ------------------------------------------------------------------ */
export interface RecordTemplate {
  name: string;
  sections: string[];
}

export const RECORD_TEMPLATES: Record<RecordType, RecordTemplate> = {
  admission: {
    name: '入院记录',
    sections: ['主诉', '现病史', '既往史', '体格检查', '辅助检查', '初步诊断', '诊疗计划'],
  },
  progress: {
    name: '病程记录',
    sections: ['今日查房', '主诉', '现病史', '体格检查', '辅助检查', '诊断', '处理意见'],
  },
  consult: {
    name: '会诊记录',
    sections: '申请科室|会诊事由|病史摘要|查体|会诊意见|建议'.split('|'),
  },
  discharge: {
    name: '出院小结',
    sections: ['入院诊断', '出院诊断', '诊疗经过', '出院情况', '出院医嘱'],
  },
};

/**
 * 【AI能力深化】纯函数：按病历类型把结构化结果填充为病历模板文本。
 */
export function fillMedicalTemplate(recordType: RecordType, rec: StructuredRecord): string {
  const tpl = RECORD_TEMPLATES[recordType] ?? RECORD_TEMPLATES.progress;
  const diagnosis = rec.diagnosis.length ? rec.diagnosis.join('、') : '待查';
  const treatment = rec.treatment.length ? rec.treatment.join('、') : '对症支持治疗，待相关检查回报后调整方案';
  // 按病历类型补充专属收尾行
  const tail =
    recordType === 'discharge'
      ? '\n出院医嘱：定期门诊复查，注意休息，不适随诊'
      : recordType === 'consult'
        ? '\n会诊建议：请相关科室协助诊疗，密切随访'
        : recordType === 'admission'
          ? '\n诊疗计划：完善相关检查，明确诊断后制定个体化治疗方案'
          : '\n处理意见续：密切观察病情变化，必要时复查相关指标';
  const lines = [
    `【${tpl.name}】（AI 语音辅助生成，需经主治医师审核确认）`,
    `主诉：${rec.chiefComplaint || '待补充'}`,
    `现病史：${rec.presentIllness || '待补充'}`,
    rec.physicalExam ? `体格检查：${rec.physicalExam}` : '体格检查：生命体征平稳，心肺腹查体未见明显异常（待复核）',
    `诊断：${diagnosis}`,
    `处理意见：${treatment}`,
  ];
  return lines.join('\n') + tail;
}
