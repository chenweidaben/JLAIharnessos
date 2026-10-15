/**
 * 健澜科技 jlmedaios - 检验检查智能解读聚合器（M121-C）
 *
 * 纯函数：buildLabInterpretation(doctorId, patientId, labResults, prevResults)
 * 输出 abnormalMarkers（异常检测）/ trends（趋势分析）/ possibleCauses（可能原因）/
 * followUpSuggestions（随访建议）四段结果。
 *
 * 医疗安全红线：
 *  - AI 仅辅助：possibleCauses 为"可能方向"而非诊断，followUpSuggestions 为复查建议而非处置决定；
 *  - 危急值（critical）必须提示立即人工复核，不得由 AI 直接处置；
 *  - 全程不落敏感明文：返回体中患者标识一律脱敏（maskPatientId），仅保留掩码尾号。
 *
 * 数据安全与留痕要求：依据宪法第七章，本模块为只读规则引擎，不写库、不连 LLM、不发起外呼。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条检验结果（本次） */
export interface LabResultItem {
  /** 项目编码，如 WBC / HGB / GLU（趋势匹配主键） */
  markerCode: string;
  /** 项目名称，如 白细胞 */
  markerName: string;
  /** 检测值 */
  value: number;
  /** 单位，如 10^9/L */
  unit: string;
  /** 参考下限；无则 null/undefined */
  refLow?: number | null;
  /** 参考上限；无则 null/undefined */
  refHigh?: number | null;
  /** 采集时间（ISO8601，可选，仅展示用） */
  collectedAt?: string;
}

/** 异常方向标记 */
export type AbnormalFlag = 'high' | 'low' | 'critical_high' | 'critical_low';

export interface AbnormalMarker {
  markerCode: string;
  markerName: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  flag: AbnormalFlag;
  /** 偏离参考限百分比：偏高为正、偏低为负；无参考限时为 0 */
  deviationPct: number;
}

export interface MarkerTrend {
  markerCode: string;
  markerName: string;
  unit: string;
  currentValue: number;
  previousValue: number | null;
  /** 较上次变化百分比；无上次结果为 null */
  changePct: number | null;
  direction: 'up' | 'down' | 'flat' | 'new';
}

export interface MarkerCause {
  markerCode: string;
  markerName: string;
  flag: AbnormalFlag | 'normal';
  causes: string[];
}

export interface FollowUpSuggestion {
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  action: string;
}

export interface LabInterpretationResult {
  doctorId: string;
  /** 脱敏后的患者标识（依据宪法第七章个人信息保护要求） */
  patientIdMasked: string;
  abnormalMarkers: AbnormalMarker[];
  trends: MarkerTrend[];
  possibleCauses: MarkerCause[];
  followUpSuggestions: FollowUpSuggestion[];
  generatedAt: string;
  /** 医疗安全免责声明 */
  disclaimer: string;
}

/** 偏离参考限超过该比例视为危急（critical） */
const CRITICAL_DEVIATION_PCT = 50;

/** 趋势方向判定阈值：|变化| 小于该比例视为 flat */
const FLAT_CHANGE_PCT = 5;

/**
 * 患者脱敏：仅保留尾 4 位，其余打码。
 * 依据宪法第七章公民个人信息保护要求，解读结果中不得回传完整患者标识。
 */
export function maskPatientId(patientId: string): string {
  const id = (patientId ?? '').trim();
  if (id.length === 0) return '***';
  if (id.length <= 4) return '****';
  return `***${id.slice(-4)}`;
}

/** 内置常见指标"可能方向"知识库（规则兜底，非诊断） */
const CAUSE_BOOK: Record<string, { high: string[]; low: string[] }> = {
  WBC: {
    high: ['细菌感染/炎症反应', '应激状态或糖皮质激素使用', '白血病等血液系统疾病待排'],
    low: ['病毒感染或某些原虫感染', '骨髓抑制（化疗/放疗后）', '自身免疫性疾病或脾功能亢进'],
  },
  NEUT: {
    high: ['急性细菌感染', '组织损伤/手术后应激'],
    low: ['骨髓造血功能抑制', '自身免疫性粒细胞减少'],
  },
  LYMPH: {
    high: ['病毒感染恢复期', '淋巴细胞增殖性疾病待排'],
    low: ['免疫缺陷状态', '化疗/激素后免疫抑制'],
  },
  HGB: {
    high: ['脱水致血液浓缩', '真性红细胞增多症待排', '慢性缺氧（如慢阻肺/高原）'],
    low: ['缺铁性贫血或慢性失血', '巨幼细胞性贫血待排', '慢性病性贫血'],
  },
  RBC: {
    high: ['血液浓缩或慢性缺氧', '红细胞增多症待排'],
    low: ['各类贫血（同血红蛋白方向）'],
  },
  PLT: {
    high: ['感染/缺铁等反应性增多', '原发性血小板增多症待排'],
    low: ['免疫性血小板减少（ITP）待排', '化疗后骨髓抑制', '脾功能亢进/DIC 待排'],
  },
  CRP: {
    high: ['细菌感染/炎症活动', '组织损伤或手术后反应', '自身免疫病活动期'],
    low: ['无明确病理意义，结合临床判断'],
  },
  PCT: {
    high: ['细菌感染/脓毒症待排', '严重组织损伤或术后早期'],
    low: ['不支持细菌感染，结合临床判断'],
  },
  ALT: {
    high: ['肝细胞损伤（病毒性肝炎/药物性肝损/脂肪肝）', '饮酒或缺血性肝损伤待排'],
    low: ['一般无临床意义，结合肌病评估'],
  },
  AST: {
    high: ['肝细胞损伤', '心肌/骨骼肌损伤待排'],
    low: ['一般无临床意义'],
  },
  TBIL: {
    high: ['黄疸待查：溶血/肝细胞性/梗阻性', 'Gilbert 综合征等良性高胆红素血症待排'],
    low: ['一般无临床意义'],
  },
  ALB: {
    high: ['脱水致血液浓缩'],
    low: ['营养不良或摄入不足', '肝硬化合成功能下降', '肾病综合征蛋白丢失'],
  },
  CREA: {
    high: ['肾功能不全待排', '脱水/肾前性因素'],
    low: ['肌肉量减少或妊娠状态'],
  },
  UREA: {
    high: ['肾功能不全', '高蛋白饮食或消化道出血', '脱水/肾前性因素'],
    low: ['严重肝病或低蛋白饮食'],
  },
  GLU: {
    high: ['糖尿病待排', '应激性高血糖', '输注葡萄糖后采血'],
    low: ['降糖药物过量', '饥饿/营养不良', '胰岛素瘤待排'],
  },
  K: {
    high: ['肾功能不全/酸中毒', '保钾药物或输注过多'],
    low: ['利尿剂使用', '呕吐/腹泻致失钾', '碱中毒'],
  },
  NA: {
    high: ['脱水/水摄入不足', '尿崩症或盐摄入过多'],
    low: ['利尿剂/抗利尿激素异常分泌', '呕吐腹泻致失钠'],
  },
  CL: {
    high: ['脱水或高氯性酸中毒'],
    low: ['呕吐/利尿致失氯'],
  },
  CK: {
    high: ['骨骼肌损伤/剧烈运动', '心肌损伤待排（结合 CK-MB/肌钙蛋白）', '药物性肌病待排'],
    low: ['一般无临床意义'],
  },
  TSH: {
    high: ['原发性甲状腺功能减退待排'],
    low: ['甲状腺功能亢进待排'],
  },
  LDL: {
    high: ['高脂血症/动脉粥样硬化风险因素'],
    low: ['营养不良或肝功能异常'],
  },
};

/** 未知指标的通用"可能方向"（保守措辞，避免误导） */
const GENERIC_HIGH = ['该指标升高，建议结合临床病史与复查确认方向'];
const GENERIC_LOW = ['该指标降低，建议结合临床病史与复查确认方向'];

function deviationPctOf(item: LabResultItem): number {
  if (item.value > (item.refHigh ?? Number.POSITIVE_INFINITY)) {
    const base = item.refHigh ?? 0;
    if (base <= 0) return 0;
    return ((item.value - base) / base) * 100;
  }
  if (item.value < (item.refLow ?? Number.NEGATIVE_INFINITY)) {
    const base = item.refLow ?? 0;
    if (base === 0) return 0;
    return ((item.value - base) / base) * 100; // 负值
  }
  return 0;
}

function flagOf(item: LabResultItem, deviationPct: number): AbnormalFlag | null {
  if (item.value > (item.refHigh ?? Number.POSITIVE_INFINITY)) {
    return deviationPct >= CRITICAL_DEVIATION_PCT ? 'critical_high' : 'high';
  }
  if (item.value < (item.refLow ?? Number.NEGATIVE_INFINITY)) {
    return deviationPct <= -CRITICAL_DEVIATION_PCT ? 'critical_low' : 'low';
  }
  return null;
}

function causesFor(markerCode: string, flag: AbnormalFlag): string[] {
  const book = CAUSE_BOOK[markerCode.toUpperCase()];
  if (!book) return flag.endsWith('high') ? GENERIC_HIGH : GENERIC_LOW;
  return flag.endsWith('high') ? book.high : book.low;
}

/**
 * 检验检查智能解读（纯函数，无 I/O、无随机、无时间副作用以外的外部依赖）。
 *
 * @param doctorId   发起解读的医师 ID（留痕用，原样回传）
 * @param patientId  患者 ID（返回时脱敏，不回传明文）
 * @param labResults 本次检验结果列表
 * @param prevResults 既往同项目结果（用于趋势；按 markerCode 匹配）
 */
export function buildLabInterpretation(
  doctorId: string,
  patientId: string,
  labResults: LabResultItem[],
  prevResults: LabResultItem[] = [],
): LabInterpretationResult {
  const current = Array.isArray(labResults) ? labResults : [];
  const previous = Array.isArray(prevResults) ? prevResults : [];
  const prevMap = new Map<string, LabResultItem>();
  for (const p of previous) {
    if (p?.markerCode) prevMap.set(p.markerCode.toUpperCase(), p);
  }

  // 1) 异常检测
  const abnormalMarkers: AbnormalMarker[] = [];
  for (const item of current) {
    if (!item || typeof item.value !== 'number' || Number.isNaN(item.value)) continue;
    const dev = deviationPctOf(item);
    const flag = flagOf(item, dev);
    if (flag) {
      abnormalMarkers.push({
        markerCode: item.markerCode,
        markerName: item.markerName,
        value: item.value,
        unit: item.unit,
        refLow: item.refLow ?? null,
        refHigh: item.refHigh ?? null,
        flag,
        deviationPct: Math.round(dev * 10) / 10,
      });
    }
  }

  // 2) 趋势分析（本次全部指标 vs 既往同项目）
  const trends: MarkerTrend[] = [];
  for (const item of current) {
    if (!item || typeof item.value !== 'number' || Number.isNaN(item.value)) continue;
    const prev = prevMap.get(item.markerCode.toUpperCase());
    if (!prev || typeof prev.value !== 'number') {
      trends.push({
        markerCode: item.markerCode,
        markerName: item.markerName,
        unit: item.unit,
        currentValue: item.value,
        previousValue: null,
        changePct: null,
        direction: 'new',
      });
      continue;
    }
    const base = prev.value;
    const changePct = base === 0 ? null : ((item.value - base) / Math.abs(base)) * 100;
    const direction: MarkerTrend['direction'] =
      changePct === null
        ? 'flat'
        : Math.abs(changePct) < FLAT_CHANGE_PCT
          ? 'flat'
          : changePct > 0
            ? 'up'
            : 'down';
    trends.push({
      markerCode: item.markerCode,
      markerName: item.markerName,
      unit: item.unit,
      currentValue: item.value,
      previousValue: base,
      changePct: changePct === null ? null : Math.round(changePct * 10) / 10,
      direction,
    });
  }

  // 3) 可能原因（仅针对异常指标）
  const possibleCauses: MarkerCause[] = abnormalMarkers.map((m) => ({
    markerCode: m.markerCode,
    markerName: m.markerName,
    flag: m.flag,
    causes: causesFor(m.markerCode, m.flag),
  }));

  // 4) 随访建议
  const followUpSuggestions: FollowUpSuggestion[] = [];
  const criticals = abnormalMarkers.filter((m) => m.flag.startsWith('critical'));
  if (criticals.length > 0) {
    followUpSuggestions.push({
      priority: 'high',
      title: `检出 ${criticals.length} 项危急值`,
      detail: criticals.map((m) => `${m.markerName}(${m.value}${m.unit})`).join('、'),
      action: '立即复核标本并通知管床医师/急诊评估，按危急值制度闭环登记',
    });
  }
  const drifting = trends.filter(
    (t) =>
      (t.direction === 'up' || t.direction === 'down') &&
      abnormalMarkers.some((a) => a.markerCode === t.markerCode),
  );
  if (drifting.length > 0) {
    followUpSuggestions.push({
      priority: 'medium',
      title: `${drifting.length} 项异常指标呈进行性变化`,
      detail: drifting.map((t) => `${t.markerName} ${t.direction === 'up' ? '↑' : '↓'} ${t.changePct ?? 0}%`).join('、'),
      action: '建议 24-72 小时内复查该项目，观察趋势是否持续',
    });
  }
  if (abnormalMarkers.length > 0 && drifting.length === 0 && criticals.length === 0) {
    followUpSuggestions.push({
      priority: 'medium',
      title: `${abnormalMarkers.length} 项指标轻度异常`,
      detail: '偏离参考范围但未达危急值，且无既往趋势对照',
      action: '建议 1 周内复查，结合临床表现综合判断',
    });
  }
  if (abnormalMarkers.length === 0) {
    followUpSuggestions.push({
      priority: 'low',
      title: '本次检验未见明显异常',
      detail: `${current.length} 项指标均在参考范围内`,
      action: '按常规随访即可，如有症状变化及时就诊',
    });
  }

  return {
    doctorId,
    patientIdMasked: maskPatientId(patientId),
    abnormalMarkers,
    trends,
    possibleCauses,
    followUpSuggestions,
    generatedAt: new Date().toISOString(),
    disclaimer: 'AI 辅助解读，不构成诊断；异常结果须经执业医师复核确认后方可处置。',
  };
}
