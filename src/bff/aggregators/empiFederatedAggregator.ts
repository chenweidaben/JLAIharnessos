/**
 * 健澜AI原生医院操作系统OS - P5-3 EMPI 跨域患者主索引（内存版）
 *
 * 与既有 PG 版 empiAggregator（候选审核）互补：
 * 本模块把不同来源系统（HIS/LIS/PACS/体检/互联网医院）的
 * sourcePatientId 挂到同一 masterPatientId 下，支持匹配。
 *
 * 匹配规则：
 *  - idCard 精确 → confidence=exact
 *  - name + birthDate + gender 全命中 → confidence=probable
 *  - phone 命中 → confidence=probable
 *  - 否则 confidence=none
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface EmpiLink {
  masterPatientId: string;
  sourceSystem: string;       // HIS / LIS / PACS / CHECKUP / INTERNET
  sourcePatientId: string;
  idCard?: string;
  name?: string;
  birthDate?: string;
  gender?: 'M' | 'F';
  phone?: string;
  linkedAt: string;
}

interface Master {
  masterPatientId: string;
  createdAt: string;
}

const masters = new Map<string, Master>();
const links: EmpiLink[] = [];
// sourceSystem+sourcePatientId → masterPatientId 反查
const sourceIndex = new Map<string, string>();
let masterCounter = 0;

function nextMasterId(): string {
  masterCounter += 1;
  return `M-${Date.now().toString(36)}-${masterCounter}`;
}

export interface LinkInput {
  masterPatientId?: string;
  sourceSystem: string;
  sourcePatientId: string;
  idCard?: string;
  name?: string;
  birthDate?: string;
  gender?: 'M' | 'F';
  phone?: string;
}

export type LinkResult =
  | { ok: true; link: EmpiLink; createdMaster: boolean }
  | { ok: false; error: 'duplicate-link' | 'missing-source' };

export function link(input: LinkInput): LinkResult {
  if (!input.sourceSystem || !input.sourcePatientId) {
    return { ok: false, error: 'missing-source' };
  }
  const key = `${input.sourceSystem}::${input.sourcePatientId}`;
  if (sourceIndex.has(key)) return { ok: false, error: 'duplicate-link' };

  let masterId = input.masterPatientId;
  let createdMaster = false;
  if (!masterId) {
    masterId = nextMasterId();
    masters.set(masterId, { masterPatientId: masterId, createdAt: new Date().toISOString() });
    createdMaster = true;
  } else if (!masters.has(masterId)) {
    masters.set(masterId, { masterPatientId: masterId, createdAt: new Date().toISOString() });
  }

  const linkRec: EmpiLink = {
    masterPatientId: masterId,
    sourceSystem: input.sourceSystem,
    sourcePatientId: input.sourcePatientId,
    idCard: input.idCard,
    name: input.name,
    birthDate: input.birthDate,
    gender: input.gender,
    phone: input.phone,
    linkedAt: new Date().toISOString(),
  };
  links.push(linkRec);
  sourceIndex.set(key, masterId);
  return { ok: true, link: linkRec, createdMaster };
}

export function getMaster(masterPatientId: string): { master: Master; links: EmpiLink[] } | null {
  const m = masters.get(masterPatientId);
  if (!m) return null;
  return { master: m, links: links.filter((l) => l.masterPatientId === masterPatientId) };
}

export function resolve(sourceSystem: string, sourcePatientId: string): string | null {
  return sourceIndex.get(`${sourceSystem}::${sourcePatientId}`) ?? null;
}

export interface MatchResult {
  matched: boolean;
  masterPatientId?: string;
  confidence: 'exact' | 'probable' | 'none';
  candidates: Array<{ masterPatientId: string; reason: string; score: number }>;
}

export function match(q: { idCard?: string; name?: string; birthDate?: string; gender?: 'M' | 'F'; phone?: string }): MatchResult {
  // 1) idCard 精确
  if (q.idCard) {
    const hit = links.find((l) => l.idCard && l.idCard === q.idCard);
    if (hit) {
      return {
        matched: true, masterPatientId: hit.masterPatientId, confidence: 'exact',
        candidates: [{ masterPatientId: hit.masterPatientId, reason: 'idCard 精确', score: 1 }],
      };
    }
  }
  // 2) name+birthDate+gender 全命中
  if (q.name && q.birthDate && q.gender) {
    const hit = links.find(
      (l) => l.name === q.name && l.birthDate === q.birthDate && l.gender === q.gender,
    );
    if (hit) {
      return {
        matched: true, masterPatientId: hit.masterPatientId, confidence: 'probable',
        candidates: [{ masterPatientId: hit.masterPatientId, reason: '姓名+生日+性别', score: 0.8 }],
      };
    }
  }
  // 3) phone
  if (q.phone) {
    const hit = links.find((l) => l.phone === q.phone);
    if (hit) {
      return {
        matched: true, masterPatientId: hit.masterPatientId, confidence: 'probable',
        candidates: [{ masterPatientId: hit.masterPatientId, reason: '手机号', score: 0.7 }],
      };
    }
  }
  return { matched: false, confidence: 'none', candidates: [] };
}

export function listMasters(limit = 50, offset = 0): { rows: Master[]; total: number } {
  const all = Array.from(masters.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { rows: all.slice(offset, offset + limit), total: all.length };
}

export function validateIdCard(idCard: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(idCard)) return false;
  return true;
}

export function __resetStore(): void {
  masters.clear();
  links.length = 0;
  sourceIndex.clear();
  masterCounter = 0;
}
