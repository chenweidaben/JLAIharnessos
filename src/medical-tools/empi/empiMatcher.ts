/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引匹配引擎（纯函数）
 *
 * 确定性、可复现：对两个患者记录及其标识登记进行评分，不做任何 I/O。
 * 评分越高越可能是同一人；超过阈值的候选进入人工审核队列，不自动合并。
 *
 * 评分规则（取命中的最高分项，不叠加，避免重复计分）：
 *   - 身份证哈希一致           100  强匹配
 *   - 手机/医保/微信标识一致    95/95/90
 *   - 姓名(脱敏)+性别+出生日期  80
 *   - 性别+出生日期（姓名不同） 55
 *   - 姓名+性别+出生年         45
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

export interface EmpiPatient {
  id: string;
  mrn: string;
  nameMasked: string;
  gender: string;
  birthDate: string | null;
  idCardHash: string | null;
}

export interface EmpiIdentifier {
  patientId: string;
  domain: 'mrn' | 'id_card' | 'insurance' | 'phone' | 'wechat' | 'outer';
  identifierHash: string;
}

export interface PairMatch {
  patientAId: string;
  patientBId: string;
  score: number;
  reasons: string[];
}

/** 进入候选队列的最低评分；低于此值不生成候选。 */
export const CANDIDATE_THRESHOLD = 70;

/** 视为强匹配（建议优先审核）的评分线。 */
export const STRONG_MATCH_SCORE = 90;

function birthYear(birthDate: string | null): string | null {
  if (!birthDate) return null;
  return birthDate.slice(0, 4);
}

/** 找出两个患者在同一标识域下哈希一致的标识。 */
function sharedIdentifier(
  identsA: EmpiIdentifier[],
  identsB: EmpiIdentifier[],
): { domain: EmpiIdentifier['domain'] } | null {
  // 优先级：手机、医保、微信
  const priority: EmpiIdentifier['domain'][] = ['phone', 'insurance', 'wechat'];
  for (const domain of priority) {
    const ha = identsA.find((i) => i.domain === domain)?.identifierHash;
    const hb = identsB.find((i) => i.domain === domain)?.identifierHash;
    if (ha && hb && ha === hb) return { domain };
  }
  return null;
}

/**
 * 对两个患者评分。返回评分与理由；score=0 表示无证据、不应生成候选。
 */
export function scorePair(
  a: EmpiPatient,
  b: EmpiPatient,
  identsA: EmpiIdentifier[] = [],
  identsB: EmpiIdentifier[] = [],
): PairMatch {
  const reasons: string[] = [];
  let score = 0;

  // 1. 身份证哈希一致（强匹配）
  if (a.idCardHash && b.idCardHash && a.idCardHash === b.idCardHash) {
    score = 100;
    reasons.push('身份证标识一致');
  }

  // 2. 其他标识一致
  if (score < STRONG_MATCH_SCORE) {
    const shared = sharedIdentifier(identsA, identsB);
    if (shared) {
      const label: Record<string, string> = {
        phone: '手机标识一致',
        insurance: '医保标识一致',
        wechat: '微信标识一致',
      };
      const s = shared.domain === 'wechat' ? 90 : 95;
      if (s > score) {
        score = s;
        reasons.push(label[shared.domain] ?? '外部标识一致');
      }
    }
  }

  const sameGender = Boolean(a.gender) && a.gender === b.gender;
  const sameBirth = Boolean(a.birthDate) && a.birthDate === b.birthDate;
  const sameName = Boolean(a.nameMasked) && a.nameMasked === b.nameMasked;

  // 3. 姓名(脱敏)+性别+出生日期
  if (score < 80 && sameName && sameGender && sameBirth) {
    score = 80;
    reasons.push('姓名、性别、出生日期一致');
  }

  // 4. 性别+出生日期（姓名不同）
  if (score < 55 && sameGender && sameBirth) {
    score = 55;
    reasons.push('性别、出生日期一致');
  }

  // 5. 姓名+性别+出生年
  const ya = birthYear(a.birthDate);
  const yb = birthYear(b.birthDate);
  if (score < 45 && sameName && sameGender && ya && ya === yb) {
    score = 45;
    reasons.push('姓名、性别、出生年份一致');
  }

  return {
    patientAId: a.id,
    patientBId: b.id,
    score,
    reasons,
  };
}

/** 是否达到候选阈值。 */
export function isCandidate(match: PairMatch): boolean {
  return match.score >= CANDIDATE_THRESHOLD;
}

/**
 * 对一批患者做两两扫描，返回全部达到阈值的候选（确定性：按输入顺序、
 * i<j 组合，每对只扫描一次；落库时再由仓储层对患者 id 归一）。
 */
export function scanCandidates(
  patients: EmpiPatient[],
  identifiers: EmpiIdentifier[] = [],
): PairMatch[] {
  const identsByPatient = new Map<string, EmpiIdentifier[]>();
  for (const ident of identifiers) {
    const list = identsByPatient.get(ident.patientId) ?? [];
    list.push(ident);
    identsByPatient.set(ident.patientId, list);
  }

  const out: PairMatch[] = [];
  for (let i = 0; i < patients.length; i += 1) {
    for (let j = i + 1; j < patients.length; j += 1) {
      const a = patients[i];
      const b = patients[j];
      const match = scorePair(
        a,
        b,
        identsByPatient.get(a.id) ?? [],
        identsByPatient.get(b.id) ?? [],
      );
      if (isCandidate(match)) out.push(match);
    }
  }
  // 评分降序，便于审核者优先处理强匹配
  out.sort((m1, m2) => m2.score - m1.score);
  return out;
}
