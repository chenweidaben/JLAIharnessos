/**
 * 健澜科技 jlmedaios - 医学知识智能问答纯函数单测（M126-C，AI 能力升级）
 *
 * 覆盖三类断言：
 *  1. 问题理解：tokenizeQuestion 切词、detectIntent 意图识别；
 *  2. 知识检索：关键词命中、科室加权、上下文加权、无命中兜底；
 *  3. 答案生成：四段式结构、免责声明、溯源来源、置信度区间。
 * 全部 mock / 内置种子数据，不依赖数据库，不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  askMedicalKnowledge,
  buildDefaultMedicalKnowledge,
  detectIntent,
  tokenizeQuestion,
  type MedicalKnowledgeEntry,
} from '../../src/bff/aggregators/medicalKnowledgeAggregator';

/** 构造测试条目（最小字段） */
function makeEntry(partial: Partial<MedicalKnowledgeEntry> = {}): MedicalKnowledgeEntry {
  return {
    id: 'x',
    topic: '高血压 血压',
    title: '原发性高血压',
    category: 'disease',
    deptCodes: ['cardio'],
    definition: '以体循环动脉血压持续升高为主要表现。',
    diagnosis: '非同日三次 ≥140/90 mmHg 诊断。',
    treatment: '生活方式干预 + 药物。',
    prevention: '限盐控重规律运动。',
    caution: '避免血压骤降。',
    keyPoints: ['非同日三次 ≥140/90', '生活方式贯穿全程'],
    sources: [{ name: '中国高血压防治指南', publisher: '中国高血压联盟' }],
    evidenceLevel: 0.9,
    ...partial,
  };
}

/* ============================== 问题理解 ============================== */

describe('问题理解 - tokenizeQuestion', () => {
  it('去除疑问词「诊断标准是什么」后切成关键词', () => {
    expect(tokenizeQuestion('高血压诊断标准是什么')).toEqual(['高血压']);
  });

  it('「术前禁食多久」去除疑问词后保留核心词', () => {
    expect(tokenizeQuestion('术前禁食多久')).toEqual(['术前禁食']);
  });

  it('空 / 纯空白输入返回空数组', () => {
    expect(tokenizeQuestion('')).toEqual([]);
    expect(tokenizeQuestion('   ')).toEqual([]);
  });
});

describe('问题理解 - detectIntent', () => {
  it('含「诊断标准」识别为 diagnosis', () => {
    expect(detectIntent('高血压诊断标准是什么')).toBe('diagnosis');
  });
  it('含「治疗 / 用药」识别为 treatment', () => {
    expect(detectIntent('高血压用什么药治疗')).toBe('treatment');
  });
  it('含「预防 / 护理」识别为 prevention', () => {
    expect(detectIntent('如何预防跌倒')).toBe('prevention');
  });
  it('含「注意 / 禁忌」识别为 caution', () => {
    expect(detectIntent('青霉素皮试注意事项')).toBe('caution');
  });
  it('含「是什么 / 定义」识别为 definition', () => {
    expect(detectIntent('高血压是什么')).toBe('definition');
  });
  it('空问句返回 general', () => {
    expect(detectIntent('')).toBe('general');
  });
});

/* ============================== 知识检索 ============================== */

describe('知识检索 - 关键词命中', () => {
  it('命中条目返回可读答案、来源与置信度', () => {
    const corpus = [
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b', topic: '糖尿病 血糖', title: '2 型糖尿病', deptCodes: ['endo'] }),
    ];
    const r = askMedicalKnowledge('高血压诊断标准', undefined, undefined, corpus);
    expect(r.matched).toBe(true);
    expect(r.sources.length).toBeGreaterThanOrEqual(1);
    expect(r.sources[0].id).toBe('a');
    expect(r.answer).toContain('原发性高血压');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('无任何命中时兜底：matched=false、置信度为 0、来源为空', () => {
    const corpus = [makeEntry({ id: 'a' })];
    const r = askMedicalKnowledge('量子计算机原理', undefined, undefined, corpus);
    expect(r.matched).toBe(false);
    expect(r.sources).toEqual([]);
    expect(r.confidence).toBe(0);
    expect(r.answer).toContain('暂未检索到');
  });

  it('空问句返回引导语而非臆造', () => {
    const r = askMedicalKnowledge('', undefined, undefined, [makeEntry()]);
    expect(r.matched).toBe(false);
    expect(r.confidence).toBe(0);
  });
});

describe('知识检索 - 科室 / 上下文加权', () => {
  it('同科室条目因 deptBoost 置信度更高', () => {
    const corpus = [
      makeEntry({ id: 'cardio-entry', topic: '高血压 血压', deptCodes: ['cardio'] }),
      makeEntry({ id: 'endo-entry', topic: '高血压 血压', deptCodes: ['endo'] }),
    ];
    // 心内科提问：cardio-entry 应因科室加权置信度更高
    const asCardio = askMedicalKnowledge('高血压', 'cardio', undefined, corpus);
    const asEndo = askMedicalKnowledge('高血压', 'endo', undefined, corpus);
    expect(asCardio.sources[0].id).toBe('cardio-entry');
    expect(asEndo.sources[0].id).toBe('endo-entry');
  });

  it('上下文 symptoms 命中正文时 contextBoost 提升置信度', () => {
    const corpus = [makeEntry({ id: 'a', topic: '高血压 血压' })];
    const plain = askMedicalKnowledge('高血压', undefined, undefined, corpus);
    const withCtx = askMedicalKnowledge(
      '高血压',
      undefined,
      { symptoms: ['血压'] },
      corpus,
    );
    expect(withCtx.confidence).toBeGreaterThan(plain.confidence);
  });

  it('非法科室值不参与加权、不抛错', () => {
    const corpus = [makeEntry({ id: 'a' })];
    const r = askMedicalKnowledge('高血压', 'wizard', undefined, corpus);
    expect(r.matched).toBe(true);
    expect(r.confidence).toBeGreaterThan(0);
  });
});

describe('知识检索 - 内置种子库端到端', () => {
  it('「术前禁食多久」命中术前禁食条目', () => {
    const r = askMedicalKnowledge('术前禁食多久');
    expect(r.matched).toBe(true);
    expect(r.sources[0].id).toBe('mk-preop-fasting');
    expect(r.intent).toBe('general'); // 无强意图词，走通用
  });

  it('「VTE 如何预防」命中 VTE 条目并识别 prevention 意图', () => {
    const r = askMedicalKnowledge('VTE 如何预防');
    expect(r.matched).toBe(true);
    expect(r.sources[0].id).toBe('mk-vte-prophylaxis');
    expect(r.intent).toBe('prevention');
  });

  it('「高血压诊断标准」命中高血压条目并识别 diagnosis 意图', () => {
    const r = askMedicalKnowledge('高血压诊断标准');
    expect(r.matched).toBe(true);
    expect(r.sources[0].id).toBe('mk-hypertension');
    expect(r.intent).toBe('diagnosis');
  });
});

/* ============================== 答案生成 ============================== */

describe('答案生成 - 结构与免责', () => {
  const corpus = [makeEntry({ id: 'a' })];

  it('答案包含四段式结构标签', () => {
    const r = askMedicalKnowledge('高血压是什么', undefined, undefined, corpus);
    expect(r.answer).toContain('核心定义');
    expect(r.answer).toContain('【关键要点】');
    expect(r.answer).toContain('【适用边界】');
    expect(r.answer).toContain('【证据来源】');
  });

  it('答案末尾固定追加免责声明「不构成医疗建议」', () => {
    const r = askMedicalKnowledge('高血压是什么', undefined, undefined, corpus);
    expect(r.answer).toContain('仅供参考，不构成医疗建议');
  });

  it('诊断意图时答案侧重诊断段落', () => {
    const r = askMedicalKnowledge('高血压诊断标准', undefined, undefined, corpus);
    expect(r.answer).toContain('诊断要点');
    expect(r.answer).toContain('非同日三次');
  });

  it('置信度始终落在 0~1 闭区间', () => {
    const r = askMedicalKnowledge('高血压', 'cardio', undefined, corpus);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it('来源条目包含 id / title / guideline', () => {
    const r = askMedicalKnowledge('高血压', undefined, undefined, corpus);
    expect(r.sources[0].id).toBe('a');
    expect(r.sources[0].title).toBe('原发性高血压');
    expect(r.sources[0].guideline).toContain('高血压防治指南');
  });

  it('证据强度越高，置信度越高', () => {
    const high = [makeEntry({ id: 'h', evidenceLevel: 0.95 })];
    const low = [makeEntry({ id: 'l', evidenceLevel: 0.3 })];
    const rHigh = askMedicalKnowledge('高血压', undefined, undefined, high);
    const rLow = askMedicalKnowledge('高血压', undefined, undefined, low);
    expect(rHigh.confidence).toBeGreaterThan(rLow.confidence);
  });
});
