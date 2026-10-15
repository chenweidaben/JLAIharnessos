/**
 * 健澜科技 jlmedaios - 门诊医生智能助手聚合器（依据宪法第七章 Doctor MUSE 医生个人智能体）
 *
 * 门诊开诊时，为医生右侧轻量助手面板聚合四路上下文：
 *   ① patientSummary  —— 本次就诊患者摘要（脱敏姓名 / 慢病标签 / 最近就诊）
 *   ② doctorExperience—— 本科室相似病例经验推荐（按匹配分降序，仅供参考）
 *   ③ deptPath        —— 科室隶属路径（根 → 父 → 当前，支撑跨科转诊判断）
 *   ④ warnings        —— 医疗安全预警（过敏史 / 检验危急值 / 关键档案缺失）
 *
 * 依据宪法第七章（Doctor MUSE）：
 *   - 助手只做「经验提示」，不替代医生的诊断与处方决策权，结论由医生确认；
 *   - 患者标识一律脱敏（张*三），不输出身份证号 / 电话等直接标识符；
 *   - buildOutpatientAssistant 为纯函数：不读库、不发请求、不修改入参，
 *     便于单测、前端预渲染与后续接入真实数据源时替换实现。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 输入类型 ------------------------------- */

/** 患者上下文片段（来自 EMR / 就诊历史，由上游各源系统提供） */
export interface PatientContextInput {
  /** 患者姓名（上游已脱敏或可脱敏，如 "张三"） */
  name?: string;
  age?: number;
  gender?: string;
  /** 慢病标签，如 ["高血压", "2型糖尿病"] */
  chronicTags?: string[];
  /** 药物 / 食物过敏史 */
  allergies?: string[];
  /** 最近就诊记录，数组靠前的为最近一次 */
  recentVisits?: { dept: string; diagnosis: string; date: string }[];
  /** 异常检验项（level=critical 视为危急值） */
  abnormalLabs?: { item: string; value: string; level: 'high' | 'low' | 'critical' }[];
}

/** 相似病例经验条目（Doctor MUSE 个人沉淀） */
export interface ExperienceCase {
  caseId: string;
  /** 病例标题，如 "老年高血压合并糖尿病门诊处理" */
  title: string;
  diagnosis: string;
  suggestion: string;
  /** 与当前患者的匹配分（0-100），由上游推荐引擎给出，纯函数只负责排序 */
  score: number;
  department?: string;
}

/** 科室树节点 */
export interface DeptNode {
  code: string;
  name: string;
  parentCode?: string;
}

/** 助手聚合输入（四路上下文均可缺省，缺省时走空数据兜底） */
export interface OutpatientAssistantInput {
  patient?: PatientContextInput | null;
  experience?: ExperienceCase[] | null;
  deptTree?: DeptNode[] | null;
}

/* ------------------------------- 输出类型 ------------------------------- */

/** 患者摘要 */
export interface PatientSummary {
  /** 脱敏姓名，如 "张*三"；无档案时为 "待确认患者" */
  name: string;
  ageText: string;
  gender: string;
  chronicTags: string[];
  /** 最近就诊文案，无记录为 null */
  lastVisit: string | null;
  /** 是否有过敏史 */
  hasAllergy: boolean;
}

/** 经验推荐条目（已按匹配分降序） */
export interface DoctorExperienceItem {
  caseId: string;
  title: string;
  diagnosis: string;
  suggestion: string;
  score: number;
}

/** 科室隶属路径 */
export interface DeptPath {
  deptCode: string;
  deptName: string;
  /** 祖先科室名，从根到父级 */
  ancestors: string[];
  /** 拼成一行的路径文案，如 "内科系统 / 心血管内科" */
  pathText: string;
}

/** 安全预警 */
export interface AssistantWarning {
  level: 'critical' | 'high' | 'info';
  /** 预警类型，如 allergy / criticalLab / missingProfile */
  type: string;
  message: string;
}

/** buildOutpatientAssistant 的输出（严格四元组，不含运行时元数据） */
export interface OutpatientAssistantResult {
  patientSummary: PatientSummary;
  doctorExperience: DoctorExperienceItem[];
  deptPath: DeptPath;
  warnings: AssistantWarning[];
}

/* ------------------------------- 纯函数 ------------------------------- */

/**
 * 姓名脱敏（依据宪法第七章）：只保留姓氏 + "*"，如 "张三" → "张*三"；
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
 * sortExperience：相似病例经验推荐排序。
 *
 * 规则：匹配分 score 降序；分数相同按 caseId 升序保证结果确定（便于单测）。
 * 纯函数：返回新数组，不修改入参；入参非数组时返回空数组。
 */
export function sortExperience(cases?: ExperienceCase[] | null): DoctorExperienceItem[] {
  if (!Array.isArray(cases)) return [];
  return cases
    .map((c) => ({
      caseId: c.caseId ?? '',
      title: c.title ?? '',
      diagnosis: c.diagnosis ?? '',
      suggestion: c.suggestion ?? '',
      score: typeof c.score === 'number' && Number.isFinite(c.score) ? c.score : 0,
    }))
    .sort((a, b) => (b.score - a.score !== 0 ? b.score - a.score : a.caseId.localeCompare(b.caseId, 'zh')));
}

/**
 * buildDeptPath：沿 parentCode 向上回溯，拼出科室隶属路径。
 *
 * 纯函数：循环链路上限 8 层，防止脏数据自环导致死循环；
 * deptCode 缺失或科室树无此节点时返回兜底路径（deptName = deptCode 或 "未知科室"）。
 */
export function buildDeptPath(deptCode: string, deptTree?: DeptNode[] | null): DeptPath {
  const code = (deptCode ?? '').trim();
  if (!Array.isArray(deptTree) || deptTree.length === 0 || !code) {
    return { deptCode: code, deptName: code || '未知科室', ancestors: [], pathText: code || '未知科室' };
  }
  const byCode = new Map(deptTree.map((n) => [n.code, n]));
  const node = byCode.get(code);
  if (!node) {
    return { deptCode: code, deptName: code, ancestors: [], pathText: code };
  }
  const ancestorNames: string[] = [];
  let cursor = byCode.get(node.parentCode ?? '');
  let guard = 0;
  while (cursor && guard < 8) {
    ancestorNames.unshift(cursor.name);
    cursor = byCode.get(cursor.parentCode ?? '');
    guard += 1;
  }
  const pathText = [...ancestorNames, node.name].join(' / ');
  return { deptCode: node.code, deptName: node.name, ancestors: ancestorNames, pathText };
}

/**
 * deriveWarnings：从患者上下文推导医疗安全预警（依据宪法第七章：预警只提示，不拦截）。
 *
 * 规则：
 *  - 过敏史非空      → high 预警，开方前必须核对；
 *  - 检验 level=critical → critical 危急值预警；
 *  - 年龄 >= 65      → info 老年患者用药剂量提醒；
 *  - 患者档案缺失    → info 提示先确认患者身份。
 * 纯函数：不修改入参。
 */
export function deriveWarnings(patient?: PatientContextInput | null): AssistantWarning[] {
  const warnings: AssistantWarning[] = [];
  if (!patient) {
    warnings.push({ level: 'info', type: 'missingProfile', message: '未读取到本次就诊患者档案，请先确认患者身份' });
    return warnings;
  }
  if (Array.isArray(patient.allergies) && patient.allergies.length > 0) {
    warnings.push({
      level: 'high',
      type: 'allergy',
      message: `过敏史：${patient.allergies.join('、')}（开方前务必核对）`,
    });
  }
  if (Array.isArray(patient.abnormalLabs)) {
    for (const lab of patient.abnormalLabs) {
      if (lab.level === 'critical') {
        warnings.push({
          level: 'critical',
          type: 'criticalLab',
          message: `检验危急值：${lab.item} ${lab.value}，请优先处置`,
        });
      }
    }
  }
  if (typeof patient.age === 'number' && patient.age >= 65) {
    warnings.push({
      level: 'info',
      type: 'elderly',
      message: '老年患者，注意药物剂量与多重用药风险',
    });
  }
  return warnings;
}

/**
 * buildPatientSummary：患者摘要聚合（脱敏口径见 maskPatientName）。
 */
export function buildPatientSummary(patient?: PatientContextInput | null): PatientSummary {
  if (!patient) {
    return { name: '待确认患者', ageText: '年龄未知', gender: '未知', chronicTags: [], lastVisit: null, hasAllergy: false };
  }
  const last = Array.isArray(patient.recentVisits) && patient.recentVisits.length > 0 ? patient.recentVisits[0] : null;
  return {
    name: maskPatientName(patient.name),
    ageText: typeof patient.age === 'number' ? `${patient.age}岁` : '年龄未知',
    gender: patient.gender?.trim() || '未知',
    chronicTags: Array.isArray(patient.chronicTags) ? [...patient.chronicTags] : [],
    lastVisit: last ? `${last.date} ${last.dept} · ${last.diagnosis}` : null,
    hasAllergy: Array.isArray(patient.allergies) && patient.allergies.length > 0,
  };
}

/**
 * buildOutpatientAssistant：门诊医生智能助手上下文聚合主入口（纯函数）。
 *
 * 依据宪法第七章：doctorId / patientId 仅作调用方溯源入参，
 * 不回显进输出（患者标识最小化）；data 任一分支缺省都走空数据兜底，不抛异常。
 *
 * @param doctorId  出诊医生 ID（取当前登录医生）
 * @param patientId 本次就诊患者 ID
 * @param deptCode  出诊科室编码
 * @param data      四路上下文（患者 / 经验 / 科室树），可为 null
 */
export function buildOutpatientAssistant(
  doctorId: string,
  patientId: string,
  deptCode: string,
  data: OutpatientAssistantInput | null | undefined,
): OutpatientAssistantResult {
  // 显式保留入参语义：doctorId/patientId 供审计溯源，输出不含明文标识
  void doctorId;
  void patientId;
  const input = data ?? {};
  return {
    patientSummary: buildPatientSummary(input.patient),
    doctorExperience: sortExperience(input.experience),
    deptPath: buildDeptPath(deptCode, input.deptTree),
    warnings: deriveWarnings(input.patient),
  };
}

/* ----------------------------- 演示兜底 ------------------------------ */

function demoPatient(): PatientContextInput {
  return {
    name: '张建国',
    age: 67,
    gender: '男',
    chronicTags: ['原发性高血压', '2型糖尿病', '冠心病术后'],
    allergies: ['青霉素类'],
    recentVisits: [
      { dept: '心血管内科', diagnosis: '原发性高血压复诊', date: '2026-09-22' },
      { dept: '内分泌科', diagnosis: '2型糖尿病随访', date: '2026-08-30' },
    ],
    abnormalLabs: [
      { item: '血钾', value: '5.9 mmol/L', level: 'critical' },
      { item: '低密度脂蛋白', value: '3.6 mmol/L', level: 'high' },
    ],
  };
}

function demoExperience(): ExperienceCase[] {
  return [
    {
      caseId: 'CASE-2026-0817',
      title: '老年高血压合并糖尿病门诊降压方案',
      diagnosis: '原发性高血压',
      suggestion: 'ARB 类起始小剂量，联用二甲双胍时监测血钾；目标血压 130/80 mmHg。',
      score: 88,
      department: '心血管内科',
    },
    {
      caseId: 'CASE-2026-0652',
      title: '服用 ACEI 患者血钾偏高的处理路径',
      diagnosis: '高钾血症',
      suggestion: '血钾 >5.5 mmol/L 暂停补钾与保钾利尿剂，复查心电图，必要时急诊评估。',
      score: 95,
      department: '心血管内科',
    },
    {
      caseId: 'CASE-2026-0431',
      title: '冠心病术后门诊抗血小板随访要点',
      diagnosis: '冠心病术后',
      suggestion: '双联抗血小板满 12 个月后评估单药维持，同步关注出血风险与消化道症状。',
      score: 76,
      department: '心血管内科',
    },
  ];
}

function demoDeptTree(): DeptNode[] {
  return [
    { code: 'DEPT-HOSP', name: '临床医疗系统' },
    { code: 'DEPT-INT', name: '内科系统', parentCode: 'DEPT-HOSP' },
    { code: 'DEPT-CARD', name: '心血管内科', parentCode: 'DEPT-INT' },
    { code: 'DEPT-ENDO', name: '内分泌科', parentCode: 'DEPT-INT' },
  ];
}

export interface OutpatientAssistantView extends OutpatientAssistantResult {
  /** true 表示当前为演示数据 */
  demo: boolean;
  updatedAt: string;
}

/**
 * listView：路由层调用入口。
 *
 * 当前为演示态：统一走 buildOutpatientAssistant 纯函数聚合内置演示数据集，
 * 保证空库可演示、不抛 5xx；后续接入真实 EMR / 医生经验库时，
 * 在此处 try 查询并回退到本演示函数，纯函数与单测无需改动。
 */
export async function listView(
  doctorId: string,
  patientId: string,
  deptCode?: string,
): Promise<OutpatientAssistantView> {
  const base = buildOutpatientAssistant(doctorId, patientId, deptCode ?? 'DEPT-CARD', {
    patient: demoPatient(),
    experience: demoExperience(),
    deptTree: demoDeptTree(),
  });
  return { ...base, demo: true, updatedAt: new Date().toISOString() };
}
