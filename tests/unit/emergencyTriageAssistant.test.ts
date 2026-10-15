/**
 * 健澜科技 jlmedaios - 急诊分诊智能助手聚合器纯函数单测（M121-A，依据宪法第七章 Doctor MUSE）。
 *
 * 不依赖数据库：覆盖三条主线——
 *   ① 分诊建议（生命体征红线 → 只许上调、不许自动下调）
 *   ② 历史匹配（主诉关键词命中的既往史置顶，其余按日期倒序）
 *   ③ 风险分级（体征 → 最低紧急级别、级别归一化、处置去向 / 绿色通道）
 * 另含相似病例排序、患者脱敏与空数据兜底。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildEmergencyTriageAssistant,
  buildLevelSuggestion,
  buildDisposition,
  buildHistory,
  isHistoryRelated,
  maskPatientName,
  normalizeTriageLevel,
  sortSimilarCases,
  suggestLevelFromVitals,
  tokenizeChiefComplaint,
  type EmergencyTriageInput,
  type HistoryEntryInput,
  type SimilarCaseInput,
} from '@/bff/aggregators/emergencyTriageAssistantAggregator';

const history: HistoryEntryInput[] = [
  {
    date: '2026-06-12',
    dept: '心血管内科',
    diagnosis: '冠心病，冠脉支架术后',
    outcome: '稳定出院',
    tags: ['冠心病', '冠脉支架术后'],
  },
  {
    date: '2025-11-03',
    dept: '内分泌科',
    diagnosis: '2型糖尿病随访',
    tags: ['2型糖尿病'],
  },
  {
    date: '2024-09-20',
    dept: '急诊内科',
    diagnosis: '急性胃肠炎',
    tags: ['急性胃肠炎'],
  },
];

const similarCases: SimilarCaseInput[] = [
  { caseId: 'ED-B', title: '支架术后胸痛鉴别', diagnosis: '支架内血栓待排', suggestion: '鉴别清单', score: 78 },
  { caseId: 'ED-A', title: '老年胸痛伴大汗路径', diagnosis: 'ACS 待排', suggestion: '绿色通道', score: 96 },
  { caseId: 'ED-C', title: '同分享例', diagnosis: '胸痛', suggestion: '经验 C', score: 96 },
];

/* ------------------------------ ① 分诊建议 ------------------------------ */

describe('buildLevelSuggestion · 分诊建议', () => {
  it('体征触发红线且高于已给级别 → action=upgrade，并给出依据', () => {
    // 已给 3 级，收缩压 88（<90）→ 应上调至 1 级
    const s = buildLevelSuggestion(3, { systolicBp: 88, heartRate: 128 });
    expect(s.action).toBe('upgrade');
    expect(s.suggestedLevel).toBe(1);
    expect(s.reasons.length).toBeGreaterThan(0);
    expect(s.reasons.join('|')).toContain('收缩压');
    expect(s.text).toContain('Ⅰ级');
  });

  it('心率 / 呼吸红线 → 上调至 2 级而非 1 级', () => {
    const s = buildLevelSuggestion(3, { heartRate: 130, respRate: 32 });
    expect(s.action).toBe('upgrade');
    expect(s.suggestedLevel).toBe(2);
    expect(s.reasons.join('|')).toContain('心率');
    expect(s.reasons.join('|')).toContain('呼吸');
  });

  it('体征无红线 → 维持当前分级，reasons 为空', () => {
    const s = buildLevelSuggestion(3, { heartRate: 80, systolicBp: 120, spo2: 98 });
    expect(s.action).toBe('maintain');
    expect(s.suggestedLevel).toBe(3);
    expect(s.reasons).toEqual([]);
    expect(s.text).toContain('维持');
  });

  it('就高不就低：体征提示 2 级而已给 1 级时维持，绝不自动下调', () => {
    const s = buildLevelSuggestion(1, { heartRate: 130 });
    expect(s.action).toBe('maintain');
    expect(s.suggestedLevel).toBe(1);
  });

  it('无体征入参时维持已给级别', () => {
    expect(buildLevelSuggestion(2, null).action).toBe('maintain');
    expect(buildLevelSuggestion(2, undefined).action).toBe('maintain');
  });
});

/* ------------------------------ ② 历史匹配 ------------------------------ */

describe('buildHistory · 历史匹配', () => {
  it('主诉关键词命中的既往史置顶，其余按日期倒序', () => {
    const items = buildHistory(history, '胸痛伴大汗，冠心病史 2 小时');
    expect(items[0].related).toBe(true);
    expect(items[0].diagnosis).toContain('冠心病');
    // 非相关两条按日期倒序：2025-11-03 在 2024-09-20 之前
    expect(items[1].related).toBe(false);
    expect(items[1].date).toBe('2025-11-03');
    expect(items[2].related).toBe(false);
    expect(items[2].date).toBe('2024-09-20');
  });

  it('输出不携带姓名等直接标识', () => {
    const items = buildHistory(history, '胸痛');
    expect(JSON.stringify(items)).not.toMatch(/王|张三/);
  });

  it('入参为 null / 非数组时返回空数组', () => {
    expect(buildHistory(null, '胸痛')).toEqual([]);
    expect(buildHistory(undefined, '胸痛')).toEqual([]);
  });
});

describe('isHistoryRelated / tokenizeChiefComplaint · 匹配规则', () => {
  it('主诉短词与 diagnosis / tags 双向包含即命中', () => {
    expect(tokenizeChiefComplaint('胸痛伴大汗')).toEqual(['胸痛伴大汗']);
    expect(tokenizeChiefComplaint('胸痛,大汗、呼吸困难')).toEqual(['胸痛', '大汗', '呼吸困难']);
    expect(
      isHistoryRelated({ diagnosis: '冠心病', tags: ['冠脉支架术后'] }, ['胸痛', '冠心病']),
    ).toBe(true);
  });

  it('无关键词命中时 related=false', () => {
    expect(isHistoryRelated({ diagnosis: '急性胃肠炎' }, ['胸痛'])).toBe(false);
  });

  it('主诉为空时全部不相关', () => {
    expect(buildHistory(history, '')[0].related).toBe(false);
  });
});

/* ------------------------------ ③ 风险分级 ------------------------------ */

describe('suggestLevelFromVitals · 风险分级', () => {
  it('收缩压<90 / SpO2<90 / GCS<9 任一触发 → 1 级', () => {
    expect(suggestLevelFromVitals({ systolicBp: 85 }).level).toBe(1);
    expect(suggestLevelFromVitals({ spo2: 88 }).level).toBe(1);
    expect(suggestLevelFromVitals({ gcs: 8 }).level).toBe(1);
  });

  it('仅心率>120 / 呼吸>30 → 2 级', () => {
    expect(suggestLevelFromVitals({ heartRate: 130 }).level).toBe(2);
    expect(suggestLevelFromVitals({ respRate: 31 }).level).toBe(2);
  });

  it('体征正常 / 无体征 → null（不提高级别）', () => {
    expect(suggestLevelFromVitals({ heartRate: 75, systolicBp: 118 }).level).toBeNull();
    expect(suggestLevelFromVitals(null)).toEqual({ level: null, reasons: [] });
  });
});

describe('normalizeTriageLevel · 级别归一化', () => {
  it('接受 1-5 数字与数字字符串', () => {
    expect(normalizeTriageLevel(1)).toBe(1);
    expect(normalizeTriageLevel('5')).toBe(5);
  });
  it('接受罗马数字 I-V', () => {
    expect(normalizeTriageLevel('I')).toBe(1);
    expect(normalizeTriageLevel('iv')).toBe(4);
  });
  it('越界 / 非法值兜底为 3 级', () => {
    expect(normalizeTriageLevel(9)).toBe(3);
    expect(normalizeTriageLevel('abc')).toBe(3);
    expect(normalizeTriageLevel(null)).toBe(3);
  });
});

describe('buildDisposition · 处置去向', () => {
  it('1-2 级走绿色通道，等待时限随级别放宽', () => {
    expect(buildDisposition(1, '王秀兰').greenChannel).toBe(true);
    expect(buildDisposition(1, '王秀兰').waitMinutes).toBe(0);
    expect(buildDisposition(2, '王秀兰').waitMinutes).toBe(10);
    expect(buildDisposition(3, '王秀兰').greenChannel).toBe(false);
    expect(buildDisposition(5, '王秀兰').waitMinutes).toBe(120);
  });

  it('去向文案中的患者姓名已脱敏', () => {
    expect(buildDisposition(1, '王秀兰').note).toContain('王*兰');
    expect(buildDisposition(1, '王秀兰').note).not.toContain('王秀兰');
  });
});

/* ------------------------------ ④ 相似病例排序 ------------------------------ */

describe('sortSimilarCases · 经验推荐排序', () => {
  it('按匹配分降序，同分按 caseId 升序', () => {
    expect(sortSimilarCases(similarCases).map((s) => s.caseId)).toEqual(['ED-A', 'ED-C', 'ED-B']);
  });
  it('分数裁剪到 0-100 且不修改入参', () => {
    const snapshot = similarCases.map((c) => ({ ...c }));
    expect(sortSimilarCases([{ caseId: 'X', title: 't', diagnosis: 'd', suggestion: 's', score: 150 }])[0].score).toBe(100);
    expect(similarCases).toEqual(snapshot);
  });
  it('入参为 null / 非数组时返回空数组', () => {
    expect(sortSimilarCases(null)).toEqual([]);
    expect(sortSimilarCases(undefined)).toEqual([]);
  });
});

/* ------------------------------ ⑤ 聚合主入口 / 脱敏 / 兜底 ------------------------------ */

describe('buildEmergencyTriageAssistant · 主入口', () => {
  it('聚合四元组：history / similarCases / levelSuggestion / disposition', () => {
    const view = buildEmergencyTriageAssistant('doc-1', 'pt-1', 3, {
      patient: { name: '王秀兰', chiefComplaint: '胸痛', vitals: { systolicBp: 88 } },
      history,
      similarCases,
    } as EmergencyTriageInput);
    expect(Object.keys(view).sort()).toEqual(
      ['disposition', 'history', 'levelSuggestion', 'similarCases'].sort(),
    );
    // 体征触发上调 → disposition 按建议级别（1 级抢救室）
    expect(view.levelSuggestion.action).toBe('upgrade');
    expect(view.disposition.zone).toBe('抢救室');
    expect(view.disposition.greenChannel).toBe(true);
  });

  it('输出不回显 doctorId / patientId（标识最小化）', () => {
    const view = buildEmergencyTriageAssistant('doc-secret', 'pt-secret', 3, {
      patient: { name: '王秀兰', vitals: { systolicBp: 88 } },
    } as EmergencyTriageInput);
    expect(JSON.stringify(view)).not.toContain('doc-secret');
    expect(JSON.stringify(view)).not.toContain('pt-secret');
  });

  it('data 为 null 时全部走兜底，不抛异常', () => {
    const view = buildEmergencyTriageAssistant('doc-1', 'pt-1', 'II', null);
    expect(view.history).toEqual([]);
    expect(view.similarCases).toEqual([]);
    expect(view.levelSuggestion.assignedLevel).toBe(2);
    expect(view.levelSuggestion.action).toBe('maintain');
    expect(view.disposition.zone).toBe('急诊抢救区');
    expect(view.disposition.note).toContain('待确认患者');
  });
});

/* ------------------------------ 其他纯函数 ------------------------------ */

describe('maskPatientName · 脱敏', () => {
  it('三字名保留首尾', () => {
    expect(maskPatientName('王秀兰')).toBe('王*兰');
  });
  it('两字名处理为「姓*」', () => {
    expect(maskPatientName('李四')).toBe('李*');
  });
  it('空值兜底', () => {
    expect(maskPatientName('')).toBe('待确认患者');
    expect(maskPatientName(undefined)).toBe('待确认患者');
  });
});
