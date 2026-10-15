/**
 * 健澜科技 jlmedaios - 急诊分诊智能助手聚合器（M121-A，依据宪法第七章 Doctor MUSE 医生个人智能体）
 *
 * 急诊分诊台右侧智能面板聚合四路输出：
 *   ① history         —— 与本次主诉相关的既往就诊史（相关条目置顶，仅供分诊参考）
 *   ② similarCases   —— 急诊相似病例经验推荐（按匹配分降序，结论由接诊医生确认）
 *   ③ levelSuggestion —— 基于生命体征的分级校核： assigned 级别 vs 体征提示级别
 *   ④ disposition     —— 处置去向：分区 / 等待时限 / 是否绿色通道
 *
 * 依据宪法第七章（Doctor MUSE）：
 *   - 助手只做「分级校核与经验提示」，不替代分诊护士 / 急诊医生的最终分级决策权；
 *   - 生命体征提示永远「就高不就低」：只允许建议上调，绝不建议自动下调，守住安全底线；
 *   - 患者标识一律脱敏（王*兰），doctorId / patientId 仅作溯源入参，不回显进输出；
 *   - buildEmergencyTriageAssistant 为纯函数：不读库、不发请求、不修改入参，
 *     便于单测、前端预渲染与后续接入真实 EMR / 分诊库时替换实现。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 输入类型 ------------------------------- */

/** 急诊分诊级别（1=Ⅰ级急危重症 … 5=Ⅴ级非急症，数字越小越紧急） */
export type EmergencyTriageLevel = 1 | 2 | 3 | 4 | 5;

/** 生命体征片段（来自分诊台体征采集，由上游各源系统提供） */
export interface TriageVitalsInput {
  /** 心率 bpm */
  heartRate?: number | null;
  /** 收缩压 mmHg */
  systolicBp?: number | null;
  /** 舒张压 mmHg */
  diastolicBp?: number | null;
  /** 呼吸频率 次/分 */
  respRate?: number | null;
  /** 血氧饱和度 % */
  spo2?: number | null;
  /** 格拉斯哥昏迷评分 */
  gcs?: number | null;
}

/** 急诊患者上下文片段 */
export interface EmergencyPatientInput {
  /** 患者姓名（上游可提供明文，聚合器内脱敏，如 "王秀兰" → "王*兰"） */
  name?: string;
  age?: number;
  gender?: string;
  /** 本次主诉，如 "胸痛伴大汗 2 小时" */
  chiefComplaint?: string;
  vitals?: TriageVitalsInput | null;
  /** 慢病标签 */
  chronicTags?: string[];
  /** 药物 / 食物过敏史 */
  allergies?: string[];
}

/** 既往就诊史条目 */
export interface HistoryEntryInput {
  date: string;
  dept: string;
  diagnosis: string;
  outcome?: string;
  /** 辅助标签，如 ["冠心病", "冠脉支架术后"]，参与主诉匹配 */
  tags?: string[];
}

/** 急诊相似病例经验条目（Doctor MUSE 个人沉淀） */
export interface SimilarCaseInput {
  caseId: string;
  title: string;
  diagnosis: string;
  suggestion: string;
  /** 与当前患者的匹配分（0-100），由上游推荐引擎给出，纯函数只负责排序 */
  score: number;
}

/** 助手聚合输入（四路上下文均可缺省，缺省时走空数据兜底） */
export interface EmergencyTriageInput {
  patient?: EmergencyPatientInput | null;
  history?: HistoryEntryInput[] | null;
  similarCases?: SimilarCaseInput[] | null;
}

/* ------------------------------- 输出类型 ------------------------------- */

/** 既往就诊史条目（相关条目置顶；姓名不进入本结构） */
export interface HistoryItem {
  date: string;
  dept: string;
  diagnosis: string;
  outcome: string | null;
  /** 是否与本次主诉相关（关键词命中） */
  related: boolean;
}

/** 相似病例条目（已按匹配分降序） */
export interface SimilarCaseItem {
  caseId: string;
  title: string;
  diagnosis: string;
  suggestion: string;
  score: number;
}

/** 分级校核建议 */
export interface LevelSuggestion {
  /** 分诊台已给定的级别 */
  assignedLevel: EmergencyTriageLevel;
  /** 生命体征提示应处的级别（就高不就低） */
  suggestedLevel: EmergencyTriageLevel;
  /** upgrade=建议上调；maintain=维持当前分级 */
  action: 'upgrade' | 'maintain';
  /** 触发上调的体征依据 */
  reasons: string[];
  /** 一行可读文案，如 "生命体征提示需上调至 Ⅰ级（急危重症）" */
  text: string;
}

/** 处置去向 */
export interface Disposition {
  level: EmergencyTriageLevel;
  /** 目标分区，如 "抢救室" */
  zone: string;
  /** 等待时限（分钟，0 = 立即） */
  waitMinutes: number;
  /** 是否绿色通道 */
  greenChannel: boolean;
  /** 级别标签，如 "Ⅰ级 · 急危重症" */
  label: string;
  /** 一行去向文案（患者姓名已脱敏） */
  note: string;
}

/** buildEmergencyTriageAssistant 的输出（严格四元组，不含运行时元数据） */
export interface EmergencyTriageAssistantResult {
  history: HistoryItem[];
  similarCases: SimilarCaseItem[];
  levelSuggestion: LevelSuggestion;
  disposition: Disposition;
}

/* ------------------------------- 纯函数 ------------------------------- */

/**
 * 姓名脱敏（依据宪法第七章）：只保留姓氏 + "*"，如 "王秀兰" → "王*兰"；
 * 两字及以下姓名一律处理为 "姓*"。空值返回 "待确认患者"。
 */
export function maskPatientName(raw?: string): string {
  const name = (raw ?? '').trim();
  if (!name) return '待确认患者';
  if (name.length <= 1) return `${name}*`;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}*${name.slice(-1)}`;
}

/**
 * 级别归一化：接受 1-5 数字 / 数字字符串 / 罗马数字（I-V）；
 * 越界或无法识别时兜底为 3（Ⅲ级·急症），保证纯函数不抛异常。
 */
export function normalizeTriageLevel(input: unknown): EmergencyTriageLevel {
  if (typeof input === 'number' && Number.isFinite(input)) {
    const n = Math.trunc(input);
    if (n >= 1 && n <= 5) return n as EmergencyTriageLevel;
  }
  if (typeof input === 'string') {
    const s = input.trim();
    const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
    if (/^[1-5]$/.test(s)) return Number(s) as EmergencyTriageLevel;
    const up = s.toUpperCase();
    if (roman[up] != null) return roman[up] as EmergencyTriageLevel;
  }
  return 3;
}

/** 级别序号 → 中文标签（依据宪法第七章：文案面向分诊护士，不缩写含糊） */
const LEVEL_LABEL: Record<EmergencyTriageLevel, string> = {
  1: 'Ⅰ级 · 急危重症',
  2: 'Ⅱ级 · 急重',
  3: 'Ⅲ级 · 急症',
  4: 'Ⅳ级 · 亚急症',
  5: 'Ⅴ级 · 非急症',
};

/**
 * suggestLevelFromVitals：从生命体征推导「就高不就低」的最低紧急级别。
 *
 * 规则（与 M35-A 急诊预检五级口径对齐）：
 *   - 收缩压 < 90 / SpO2 < 90 / GCS < 9          → 1 级（立即抢救）
 *   - 心率 > 120 / 呼吸 > 30                    → 2 级（10 分钟内处置）
 *   - 其余体征未触发红线                        → null（不提高级别）
 * 纯函数：不修改入参，任一缺省字段按「未触发」处理。
 */
export function suggestLevelFromVitals(
  vitals?: TriageVitalsInput | null,
): { level: EmergencyTriageLevel | null; reasons: string[] } {
  const reasons: string[] = [];
  if (!vitals) return { level: null, reasons };

  if (typeof vitals.systolicBp === 'number' && vitals.systolicBp < 90) {
    reasons.push(`收缩压 ${vitals.systolicBp} mmHg（<90，休克倾向）`);
  }
  if (typeof vitals.spo2 === 'number' && vitals.spo2 < 90) {
    reasons.push(`SpO2 ${vitals.spo2}%（<90，低氧血症）`);
  }
  if (typeof vitals.gcs === 'number' && vitals.gcs < 9) {
    reasons.push(`GCS ${vitals.gcs}（<9，意识障碍）`);
  }
  if (reasons.length > 0) return { level: 1, reasons };

  if (typeof vitals.heartRate === 'number' && vitals.heartRate > 120) {
    reasons.push(`心率 ${vitals.heartRate} bpm（>120）`);
  }
  if (typeof vitals.respRate === 'number' && vitals.respRate > 30) {
    reasons.push(`呼吸 ${vitals.respRate} 次/分（>30）`);
  }
  if (reasons.length > 0) return { level: 2, reasons };

  return { level: null, reasons };
}

/**
 * buildLevelSuggestion：分级校核主逻辑（依据宪法第七章：只许上调，不许自动下调）。
 *
 * @param assigned 分诊台已给定级别（已归一化）
 * @param vitals   本次采集的生命体征
 */
export function buildLevelSuggestion(
  assigned: EmergencyTriageLevel,
  vitals?: TriageVitalsInput | null,
): LevelSuggestion {
  const { level: signLevel, reasons } = suggestLevelFromVitals(vitals);
  if (signLevel == null || signLevel >= assigned) {
    // 体征无红线，或体征提示级别不比已给级别更紧急 → 维持
    return {
      assignedLevel: assigned,
      suggestedLevel: assigned,
      action: 'maintain',
      reasons: [],
      text: `维持当前 ${LEVEL_LABEL[assigned]}，体征未见升级红线`,
    };
  }
  return {
    assignedLevel: assigned,
    suggestedLevel: signLevel,
    action: 'upgrade',
    reasons,
    text: `生命体征提示需上调至 ${LEVEL_LABEL[signLevel]}，请立即复评分级`,
  };
}

/** 分级 → 处置去向表（依据宪法第七章：绿色通道与等待时限为硬提示，由医生确认执行） */
const DISPOSITION_TABLE: Record<
  EmergencyTriageLevel,
  { zone: string; waitMinutes: number; greenChannel: boolean; label: string }
> = {
  1: { zone: '抢救室', waitMinutes: 0, greenChannel: true, label: LEVEL_LABEL[1] },
  2: { zone: '急诊抢救区', waitMinutes: 10, greenChannel: true, label: LEVEL_LABEL[2] },
  3: { zone: '急诊诊室', waitMinutes: 30, greenChannel: false, label: LEVEL_LABEL[3] },
  4: { zone: '急诊候诊区', waitMinutes: 60, greenChannel: false, label: LEVEL_LABEL[4] },
  5: { zone: '普通候诊区', waitMinutes: 120, greenChannel: false, label: LEVEL_LABEL[5] },
};

/**
 * buildDisposition：按「最终应处级别」（建议上调后的级别）生成处置去向。
 *
 * 依据宪法第七章：去向就高不就低——若体征建议上调，分区 / 时限 / 绿色通道
 * 均按更紧急的级别给出，避免患者在候诊区延误。
 */
export function buildDisposition(
  finalLevel: EmergencyTriageLevel,
  patientName?: string,
): Disposition {
  const row = DISPOSITION_TABLE[finalLevel];
  const masked = maskPatientName(patientName);
  const waitText = row.waitMinutes === 0 ? '立即' : `${row.waitMinutes} 分钟内`;
  return {
    level: finalLevel,
    zone: row.zone,
    waitMinutes: row.waitMinutes,
    greenChannel: row.greenChannel,
    label: row.label,
    note: `${masked} → ${row.zone}，${waitText}接诊${row.greenChannel ? '，启动绿色通道' : ''}`,
  };
}

/**
 * tokenizeChiefComplaint：把主诉切成可匹配的短词（按标点 / 空白切分，过滤单字）。
 * 纯函数：不修改入参。
 */
export function tokenizeChiefComplaint(chiefComplaint?: string | null): string[] {
  const text = (chiefComplaint ?? '').trim();
  if (!text) return [];
  return text
    .split(/[,，、;；\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * isHistoryRelated：判断一条既往史是否与本次主诉相关。
 *
 * 规则：主诉任一关键词与 diagnosis / tags 存在双向包含即命中（中文短词无词形变化，
 * 双向包含足以覆盖「冠脉支架术后」vs「胸痛/冠心病」这类表达差异）。
 * 参数只消费 diagnosis / tags，因此放宽为结构类型，便于单测直接喂片段。
 * 纯函数。
 */
export function isHistoryRelated(
  entry: { diagnosis?: string; tags?: string[] },
  tokens: string[],
): boolean {
  if (tokens.length === 0) return false;
  const haystacks = [entry.diagnosis ?? '', ...(Array.isArray(entry.tags) ? entry.tags : [])];
  for (const token of tokens) {
    for (const h of haystacks) {
      if (h && (h.includes(token) || token.includes(h))) return true;
    }
  }
  return false;
}

/**
 * buildHistory：既往史聚合——相关条目置顶，其余按日期倒序；姓名不进入输出。
 *
 * 纯函数：返回新数组，不修改入参；入参非数组时返回空数组。
 */
export function buildHistory(
  history: HistoryEntryInput[] | null | undefined,
  chiefComplaint?: string | null,
): HistoryItem[] {
  if (!Array.isArray(history)) return [];
  const tokens = tokenizeChiefComplaint(chiefComplaint);
  const items: HistoryItem[] = history.map((h) => ({
    date: h.date ?? '',
    dept: h.dept ?? '',
    diagnosis: h.diagnosis ?? '',
    outcome: h.outcome ?? null,
    related: isHistoryRelated(h, tokens),
  }));
  const byDateDesc = (a: HistoryItem, b: HistoryItem): number =>
    (b.date || '').localeCompare(a.date || '', 'zh');
  items.sort((a, b) => {
    if (a.related !== b.related) return a.related ? -1 : 1;
    return byDateDesc(a, b);
  });
  return items;
}

/**
 * sortSimilarCases：相似病例经验排序。
 *
 * 规则：匹配分 score 降序并裁剪到 0-100；分数相同按 caseId 升序保证结果确定（便于单测）。
 * 纯函数：返回新数组，不修改入参；入参非数组时返回空数组。
 */
export function sortSimilarCases(cases?: SimilarCaseInput[] | null): SimilarCaseItem[] {
  if (!Array.isArray(cases)) return [];
  return cases
    .map((c) => {
      const raw = typeof c.score === 'number' && Number.isFinite(c.score) ? c.score : 0;
      return {
        caseId: c.caseId ?? '',
        title: c.title ?? '',
        diagnosis: c.diagnosis ?? '',
        suggestion: c.suggestion ?? '',
        score: Math.max(0, Math.min(100, Math.round(raw))),
      };
    })
    .sort((a, b) => (b.score - a.score !== 0 ? b.score - a.score : a.caseId.localeCompare(b.caseId, 'zh')));
}

/**
 * buildEmergencyTriageAssistant：急诊分诊智能助手上下文聚合主入口（纯函数）。
 *
 * 依据宪法第七章：doctorId / patientId 仅作调用方溯源入参，
 * 不回显进输出（患者标识最小化）；data 任一分支缺省都走空数据兜底，不抛异常。
 *
 * @param doctorId     分诊医生 / 护士 ID（取当前登录人）
 * @param patientId    本次就诊患者 ID
 * @param triageLevel  分诊台已给定级别（1-5 或罗马数字，内部归一化）
 * @param data         三路上下文（患者 / 既往史 / 相似病例），可为 null
 */
export function buildEmergencyTriageAssistant(
  doctorId: string,
  patientId: string,
  triageLevel: EmergencyTriageLevel | number | string,
  data: EmergencyTriageInput | null | undefined,
): EmergencyTriageAssistantResult {
  // 显式保留入参语义：doctorId/patientId 供审计溯源，输出不含明文标识
  void doctorId;
  void patientId;
  const assigned = normalizeTriageLevel(triageLevel);
  const input = data ?? {};
  const patient = input.patient ?? null;

  const levelSuggestion = buildLevelSuggestion(assigned, patient?.vitals);
  const finalLevel = levelSuggestion.suggestedLevel;

  return {
    history: buildHistory(input.history, patient?.chiefComplaint),
    similarCases: sortSimilarCases(input.similarCases),
    levelSuggestion,
    disposition: buildDisposition(finalLevel, patient?.name),
  };
}

/* ----------------------------- 演示兜底 ------------------------------ */

function demoPatient(): EmergencyPatientInput {
  return {
    name: '王秀兰',
    age: 68,
    gender: '女',
    chiefComplaint: '胸痛伴大汗，冠心病史 2 小时',
    vitals: { systolicBp: 88, diastolicBp: 56, heartRate: 128, respRate: 24, spo2: 93, gcs: 15 },
    chronicTags: ['冠心病', '原发性高血压'],
    allergies: ['阿司匹林'],
  };
}

function demoHistory(): HistoryEntryInput[] {
  return [
    {
      date: '2026-06-12',
      dept: '心血管内科',
      diagnosis: '冠心病，冠脉支架术后 2 年',
      outcome: '病情稳定出院',
      tags: ['冠心病', '冠脉支架术后'],
    },
    {
      date: '2025-11-03',
      dept: '内分泌科',
      diagnosis: '2型糖尿病随访',
      outcome: '门诊调整用药',
      tags: ['2型糖尿病'],
    },
    {
      date: '2024-09-20',
      dept: '急诊内科',
      diagnosis: '急性胃肠炎',
      outcome: '留观 6 小时缓解',
      tags: ['急性胃肠炎'],
    },
  ];
}

function demoSimilarCases(): SimilarCaseInput[] {
  return [
    {
      caseId: 'ED-2026-0889',
      title: '老年女性胸痛伴大汗急诊处置路径',
      diagnosis: '急性冠脉综合征待排',
      suggestion: '立即十二导联心电图 + 肌钙蛋白，监护下按 ACS 绿色通道处置，嚼服阿司匹林前核对过敏史。',
      score: 96,
    },
    {
      caseId: 'ED-2026-0731',
      title: '收缩压 <90 的胸痛患者复评分级要点',
      diagnosis: '心源性休克倾向',
      suggestion: '体征提示应直接上调至Ⅰ级，避免在候诊区延误；建立静脉通路后转诊抢救室。',
      score: 91,
    },
    {
      caseId: 'ED-2026-0502',
      title: '支架术后胸痛复发的鉴别清单',
      diagnosis: '支架内血栓待排',
      suggestion: '优先排除支架内血栓与新发梗死，同步关注出血风险与抗血小板用药依从性。',
      score: 78,
    },
  ];
}

export interface EmergencyTriageAssistantView extends EmergencyTriageAssistantResult {
  /** true 表示当前为演示数据 */
  demo: boolean;
  updatedAt: string;
}

/**
 * listView：路由层调用入口。
 *
 * 当前为演示态：统一走 buildEmergencyTriageAssistant 纯函数聚合内置演示数据集，
 * 保证空库可演示、不抛 5xx；后续接入真实 EMR / 分诊库 / 医生经验库时，
 * 在此处 try 查询并回退到本演示函数，纯函数与单测无需改动。
 */
export async function listView(
  doctorId: string,
  patientId: string,
  triageLevel: EmergencyTriageLevel | number | string,
): Promise<EmergencyTriageAssistantView> {
  const base = buildEmergencyTriageAssistant(doctorId, patientId, triageLevel, {
    patient: demoPatient(),
    history: demoHistory(),
    similarCases: demoSimilarCases(),
  });
  return { ...base, demo: true, updatedAt: new Date().toISOString() };
}
