/**
 * 健澜AI原生医院操作系统OS - P1-2 医嘱单续打/补打/重打
 *
 * 三种打印模式：
 *  - continuation（续打）：从上一次打印末尾续打，记录 nextPage
 *  - reissue（补打）：补打缺失页（range.from~to），留痕 reissuedPages
 *  - reprint（重打）：整单重打，作废前次打印记录，发新打印号
 *
 * 同一 visitId 同 printMode 重复 → 200 且 printCount+1（留痕，非 409）。
 * 权限：doctor 可开打印申请，nurse 可执行打印；其他 403。visitId-patientId 行级绑定。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { assertVisitPatientBinding } from './orderCpoeAggregator.js';

export class OrderSheetPrintError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type PrintMode = 'continuation' | 'reissue' | 'reprint';

export interface PrintRecord {
  printId: string;
  visitId: string;
  patientId: string;
  printMode: PrintMode;
  pageFrom: number;
  pageTo: number;
  nextPage: number;
  reissuedPages: number[];
  printCount: number;
  voided: boolean;
  printedBy: string;
  printedAt: number;
  operatorNote?: string;
}

const prints = new Map<string, PrintRecord>();
/** visitId -> 已打印到的页 */
const lastPage = new Map<string, number>();
/** visitId+printMode -> 同一模式累计打印次数 */
const modeCount = new Map<string, number>();
let printSeq = 0;

function requireRoles(roles: string[]): void {
  if (roles.includes('admin')) return;
  if (!roles.includes('doctor') && !roles.includes('nurse')) {
    throw new OrderSheetPrintError(403, '医嘱单打印需医生或护士角色');
  }
}

export interface PrintInput {
  visitId: string;
  patientId: string;
  printMode: string;
  range?: { from?: number; to?: number };
  operatorNote?: string;
  roles: string[];
  operatorId: string;
  now?: number;
}

/** 发起一次医嘱单打印。 */
export function printOrderSheet(input: PrintInput): PrintRecord {
  requireRoles(input.roles);
  if (!input.visitId) throw new OrderSheetPrintError(400, 'visitId 必填');
  if (!input.patientId) throw new OrderSheetPrintError(400, 'patientId 必填');
  const mode: PrintMode =
    input.printMode === 'continuation' || input.printMode === 'reissue' || input.printMode === 'reprint'
      ? input.printMode
      : (() => { throw new OrderSheetPrintError(400, 'printMode 必须为 continuation/reissue/reprint 之一'); })();

  assertVisitPatientBinding(input.visitId, input.patientId);

  const now = input.now ?? Date.now();
  const countKey = `${input.visitId}|${mode}`;
  const printCount = (modeCount.get(countKey) ?? 0) + 1;
  modeCount.set(countKey, printCount);

  printSeq += 1;
  const printId = `OSP-${String(printSeq).padStart(4, '0')}`;
  const prevLast = lastPage.get(input.visitId) ?? 0;

  let pageFrom = 0;
  let pageTo = 0;
  let nextPage = prevLast;
  const reissuedPages: number[] = [];
  let voided = false;

  if (mode === 'continuation') {
    pageFrom = prevLast + 1;
    pageTo = pageFrom; // 续打一页
    nextPage = pageTo;
  } else if (mode === 'reissue') {
    pageFrom = input.range?.from ?? 1;
    pageTo = input.range?.to ?? pageFrom;
    if (pageFrom < 1 || pageTo < pageFrom) {
      throw new OrderSheetPrintError(400, '补打 range 非法：需 from>=1 且 to>=from');
    }
    for (let p = pageFrom; p <= pageTo; p += 1) reissuedPages.push(p);
  } else {
    // reprint：整单重打，作废前次记录
    for (const rec of prints.values()) {
      if (rec.visitId === input.visitId && !rec.voided) rec.voided = true;
    }
    pageFrom = 1;
    pageTo = Math.max(prevLast, 1);
    nextPage = pageTo;
    voided = false;
  }

  lastPage.set(input.visitId, nextPage);

  const rec: PrintRecord = {
    printId,
    visitId: input.visitId,
    patientId: input.patientId,
    printMode: mode,
    pageFrom,
    pageTo,
    nextPage,
    reissuedPages,
    printCount,
    voided,
    printedBy: input.operatorId,
    printedAt: now,
    operatorNote: input.operatorNote,
  };
  prints.set(printId, rec);
  return rec;
}

/** 打印历史（可按 visitId 过滤，含已作废）。 */
export function listPrints(visitId?: string): PrintRecord[] {
  const all = Array.from(prints.values());
  const filtered = visitId ? all.filter((p) => p.visitId === visitId) : all;
  filtered.sort((a, b) => b.printedAt - a.printedAt);
  return filtered;
}

export function __resetStore(): void {
  prints.clear();
  lastPage.clear();
  modeCount.clear();
  printSeq = 0;
}
