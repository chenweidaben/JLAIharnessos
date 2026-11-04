/**
 * 健澜AI原生医院操作系统OS - P5-3 XDS 风格文档共享（内存版）
 *
 * 文档注册/检索/取回；SHA256 内容哈希；LOINC 风格类型码表。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash, randomUUID } from 'node:crypto';

export interface XdsDocument {
  documentId: string;
  patientId: string;
  masterPatientId?: string;
  documentType: string;     // LOINC 风格码
  title: string;
  authorId: string;
  authorOrg: string;
  contentType: string;
  content: string;
  contentHash: string;      // SHA256(content)
  createdAt: string;
}

export const DOCUMENT_TYPES: Array<{ code: string; display: string }> = [
  { code: '34133-9', display: 'Summary（患者摘要）' },
  { code: '11506-3', display: 'History and physical note（病程记录）' },
  { code: '18748-4', display: 'Radiology study report（影像报告）' },
  { code: '11502-2', display: 'Referral note（转诊单）' },
  { code: '18842-5', display: 'Discharge summary（出院小结）' },
  { code: '60591-5', display: 'Laboratory report（检验报告）' },
  { code: '11504-8', display: 'Operative note（手术记录）' },
  { code: '28570-0', display: 'Evaluation and management note（门诊病历）' },
];

const docs = new Map<string, XdsDocument>();

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export interface RegisterInput {
  patientId: string;
  masterPatientId?: string;
  documentType: string;
  title: string;
  authorId: string;
  authorOrg: string;
  content: string;
  contentType?: string;
}

export type RegisterResult =
  | { ok: true; doc: XdsDocument }
  | { ok: false; error: 'invalid-type' | 'empty-content' | 'duplicate' };

export function register(input: RegisterInput): RegisterResult {
  if (!DOCUMENT_TYPES.some((t) => t.code === input.documentType)) {
    return { ok: false, error: 'invalid-type' };
  }
  if (!input.content || input.content.trim().length === 0) {
    return { ok: false, error: 'empty-content' };
  }
  const contentHash = sha256(input.content);
  // 幂等去重：同 patientId + documentType + contentHash
  for (const d of docs.values()) {
    if (d.patientId === input.patientId && d.documentType === input.documentType && d.contentHash === contentHash) {
      return { ok: false, error: 'duplicate' };
    }
  }
  const doc: XdsDocument = {
    documentId: `XDS-${randomUUID()}`,
    patientId: input.patientId,
    masterPatientId: input.masterPatientId,
    documentType: input.documentType,
    title: input.title,
    authorId: input.authorId,
    authorOrg: input.authorOrg,
    contentType: input.contentType ?? 'text/plain',
    content: input.content,
    contentHash,
    createdAt: new Date().toISOString(),
  };
  docs.set(doc.documentId, doc);
  return { ok: true, doc };
}

export interface QueryInput {
  patientId?: string;
  documentType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export function query(q: QueryInput): { rows: Array<Omit<XdsDocument, 'content'>>; total: number } {
  let arr = Array.from(docs.values());
  if (q.patientId) arr = arr.filter((d) => d.patientId === q.patientId);
  if (q.documentType) arr = arr.filter((d) => d.documentType === q.documentType);
  if (q.from) arr = arr.filter((d) => d.createdAt >= (q.from as string));
  if (q.to) arr = arr.filter((d) => d.createdAt <= (q.to as string));
  arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = arr.length;
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const offset = Math.max(q.offset ?? 0, 0);
  // 不返 content
  const rows = arr.slice(offset, offset + limit).map((d) => {
    const { content: _c, ...rest } = d; void _c;
    return rest;
  });
  return { rows, total };
}

export function getMeta(documentId: string): Omit<XdsDocument, 'content'> | null {
  const d = docs.get(documentId);
  if (!d) return null;
  const { content: _c, ...rest } = d; void _c;
  return rest;
}

export function getContent(documentId: string): { content: string; contentHash: string; hashValid: boolean } | null {
  const d = docs.get(documentId);
  if (!d) return null;
  const recomputed = sha256(d.content);
  return { content: d.content, contentHash: d.contentHash, hashValid: recomputed === d.contentHash };
}

export function listTypes(): Array<{ code: string; display: string }> {
  return DOCUMENT_TYPES.slice();
}

export function seed(): number {
  const sampleTypes = DOCUMENT_TYPES.slice(0, 3);
  let n = 0;
  for (const t of sampleTypes) {
    register({
      patientId: `P-SEED-${t.code}`,
      documentType: t.code,
      title: `种子文档 ${t.display}`,
      authorId: 'admin', authorOrg: '健澜科技',
      content: `seed content for ${t.code}`,
    });
    n += 1;
  }
  return n;
}

export function __resetStore(): void {
  docs.clear();
}
