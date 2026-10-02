/**
 * 健澜科技数智医院智能体 - 科研专病队列匹配规则引擎（M5-B）
 *
 * 纯函数、确定性、无 I/O：根据患者「研究画像」与队列纳入/排除标准，
 * 判断是否入组，并给出命中的纳入规则与排除原因（可复现、可审计）。
 *
 * 设计：
 *  - 纳入条件（include）：年龄/性别/诊断/标签/检验，全部满足才纳入；
 *  - 排除条件（exclude）：诊断/标签/检验，任一命中即排除（排除优先于纳入）；
 *  - 诊断匹配按「诊断名称或 ICD 编码」任一命中；标签按任一命中；
 *  - 检验条件按项目编码/名称定位，数值比较，全部纳入条件须满足。
 *
 * 仅用于科研队列构建，不用于诊疗决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

/** 检验条件：定位项目（编码或名称）+ 数值比较 */
export interface CohortLabCriteria {
  itemCode?: string;
  itemName?: string;
  op: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

/** 队列纳入/排除标准 */
export interface CohortCriteria {
  include: {
    minAge?: number;
    maxAge?: number;
    gender?: string;
    diagnoses?: string[]; // 诊断名称或 ICD 编码，任一命中
    tags?: string[]; // 标签任一命中
    labs?: CohortLabCriteria[]; // 检验条件，全部满足
  };
  exclude: {
    diagnoses?: string[];
    tags?: string[];
    labs?: CohortLabCriteria[];
  };
}

/** 患者研究画像（由聚合器从各表组装，年龄已计算） */
export interface ResearchProfile {
  patientId: string;
  gender: string;
  age: number | null;
  tags: string[];
  diagnoses: Array<{ name: string; code: string | null; confirmed: boolean }>;
  labResults: Array<{
    itemCode: string | null;
    itemName: string;
    numericValue: number | null;
    abnormalFlag: string | null;
  }>;
}

export interface EvaluationResult {
  eligible: boolean;
  matchedRules: string[];
  exclusionReasons: string[];
}

/** 诊断是否命中给定的名称/编码集合 */
function diagnosisMatches(
  diagnoses: ResearchProfile['diagnoses'],
  wanted: string[],
): boolean {
  const wantedSet = new Set(wanted.map((w) => w.trim()).filter(Boolean));
  if (wantedSet.size === 0) return false;
  return diagnoses.some(
    (d) =>
      (d.code && wantedSet.has(d.code)) || wantedSet.has(d.name),
  );
}

/** 标签是否命中（任一） */
function tagsMatch(tags: string[], wanted: string[]): boolean {
  const wantedSet = new Set(wanted.map((w) => w.trim()).filter(Boolean));
  if (wantedSet.size === 0) return false;
  return tags.some((t) => wantedSet.has(t));
}

/** 比较数值 */
function compare(actual: number, op: CohortLabCriteria['op'], target: number): boolean {
  switch (op) {
    case 'gt':
      return actual > target;
    case 'lt':
      return actual < target;
    case 'eq':
      return actual === target;
    case 'gte':
      return actual >= target;
    case 'lte':
      return actual <= target;
    default:
      return false;
  }
}

/** 单条检验条件是否在患者结果中命中（定位到项目且有数值、比较成立） */
function labConditionMatches(
  labs: ResearchProfile['labResults'],
  cond: CohortLabCriteria,
): boolean {
  return labs.some((l) => {
    const located =
      (cond.itemCode && l.itemCode === cond.itemCode) ||
      (cond.itemName && l.itemName === cond.itemName);
    if (!located || l.numericValue === null) return false;
    return compare(l.numericValue, cond.op, cond.value);
  });
}

/**
 * 评估患者是否符合队列标准。
 * 先评估排除（任一命中即排除），再评估纳入（全部满足）。
 */
export function evaluateCohort(
  profile: ResearchProfile,
  criteria: CohortCriteria,
): EvaluationResult {
  const matchedRules: string[] = [];
  const exclusionReasons: string[] = [];
  const inc = criteria.include ?? {
    minAge: undefined,
    maxAge: undefined,
    gender: undefined,
    diagnoses: undefined,
    tags: undefined,
    labs: undefined,
  };
  const exc = criteria.exclude ?? {
    diagnoses: undefined,
    tags: undefined,
    labs: undefined,
  };

  // ---- 排除优先（任一命中即排除）----
  if (exc.diagnoses && diagnosisMatches(profile.diagnoses, exc.diagnoses)) {
    exclusionReasons.push('排除诊断命中');
  }
  if (exc.tags && tagsMatch(profile.tags, exc.tags)) {
    exclusionReasons.push('排除标签命中');
  }
  if (exc.labs && exc.labs.some((c) => labConditionMatches(profile.labResults, c))) {
    exclusionReasons.push('排除检验条件命中');
  }
  if (exclusionReasons.length > 0) {
    return { eligible: false, matchedRules, exclusionReasons };
  }

  // ---- 纳入条件（全部满足）----
  if (inc.minAge !== undefined) {
    if (profile.age === null || profile.age < inc.minAge) {
      return { eligible: false, matchedRules, exclusionReasons };
    }
    matchedRules.push(`年龄≥${inc.minAge}`);
  }
  if (inc.maxAge !== undefined) {
    if (profile.age === null || profile.age > inc.maxAge) {
      return { eligible: false, matchedRules, exclusionReasons };
    }
    matchedRules.push(`年龄≤${inc.maxAge}`);
  }
  if (inc.gender) {
    if (profile.gender !== inc.gender) {
      return { eligible: false, matchedRules, exclusionReasons };
    }
    matchedRules.push(`性别为${inc.gender}`);
  }
  if (inc.diagnoses) {
    if (!diagnosisMatches(profile.diagnoses, inc.diagnoses)) {
      return { eligible: false, matchedRules, exclusionReasons };
    }
    matchedRules.push('诊断命中');
  }
  if (inc.tags) {
    if (!tagsMatch(profile.tags, inc.tags)) {
      return { eligible: false, matchedRules, exclusionReasons };
    }
    matchedRules.push('标签命中');
  }
  if (inc.labs && inc.labs.length > 0) {
    const allOk = inc.labs.every((c) => labConditionMatches(profile.labResults, c));
    if (!allOk) {
      return { eligible: false, matchedRules, exclusionReasons };
    }
    matchedRules.push('检验条件全部满足');
  }

  return { eligible: true, matchedRules, exclusionReasons };
}
