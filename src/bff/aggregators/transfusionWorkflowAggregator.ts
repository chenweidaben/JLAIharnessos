/**
 * 健澜AI原生医院操作系统OS - P1-4 输血闭环
 *
 * 状态机：application(doctor申请) → typed(血型鉴定) → crossmatched(交叉配血)
 * → issued(血库发血) → bedside_checked(床边双人核对) → transfusing(输注中)
 * → completed(完成)。非法跃迁 409；同血袋重复发血 409；配血不合 409。
 *
 * 角色：doctor 申请、blood_bank_tech 鉴定/配血/发血、nurse 双人核对/输注/不良反应。
 * 双人核对：nurseId + witnessNurseId 必填且不能相同；matched=false 拒输 409。
 * 行级 visitId-patientId 绑定复用 assertVisitPatientBinding。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { assertVisitPatientBinding } from './orderCpoeAggregator.js';

export class TransfusionWorkflowError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type TxState =
  | 'application'
  | 'typed'
  | 'crossmatched'
  | 'issued'
  | 'bedside_checked'
  | 'transfusing'
  | 'completed';

export const TX_ORDER: TxState[] = [
  'application', 'typed', 'crossmatched', 'issued', 'bedside_checked', 'transfusing', 'completed',
];

export interface TypeResult { abo: string; rh: string; antibodyScreen: string; by: string; at: number; }
export interface CrossmatchResult { donorBagNo: string; compatibility: 'compatible' | 'incompatible'; by: string; at: number; }
export interface IssueRecord { bagNo: string; expiresAt: number; by: string; at: number; }
export interface BedsideCheck { nurseId: string; witnessNurseId: string; patientId: string; bagNo: string; matched: boolean; at: number; }
export interface AdverseReaction { type: string; severity: number; description: string; by: string; at: number; }

export interface TransfusionRequest {
  reqId: string;
  visitId: string;
  patientId: string;
  bloodType: string;
  units: number;
  indication: string;
  status: TxState;
  typeResult?: TypeResult;
  crossmatchResult?: CrossmatchResult;
  issueRecord?: IssueRecord;
  bedsideCheck?: BedsideCheck;
  adverseReactions: AdverseReaction[];
  startedAt?: number;
  createdAt: number;
}

const requests = new Map<string, TransfusionRequest>();
const issuedBags = new Set<string>();
let reqSeq = 0;

function requireRole(roles: string[], allowed: string[], action: string): void {
  if (roles.includes('admin')) return;
  const ok = allowed.some((r) => roles.includes(r));
  if (!ok) throw new TransfusionWorkflowError(403, `${action} 需要角色：${allowed.join('/')}`);
}

function mustGet(reqId: string): TransfusionRequest {
  const r = requests.get(reqId);
  if (!r) throw new TransfusionWorkflowError(404, `输血申请不存在：${reqId}`);
  return r;
}

function assertState(r: TransfusionRequest, expected: TxState, action: string): void {
  if (r.status !== expected) {
    throw new TransfusionWorkflowError(409, `${action} 需状态 ${expected}，当前 ${r.status}`);
  }
}

export interface CreateInput {
  visitId: string; patientId: string; bloodType: string; units: number; indication: string;
  roles: string[];
}

export function createRequest(input: CreateInput): TransfusionRequest {
  requireRole(input.roles, ['doctor'], '输血申请');
  if (!input.visitId) throw new TransfusionWorkflowError(400, 'visitId 必填');
  if (!input.patientId) throw new TransfusionWorkflowError(400, 'patientId 必填');
  if (input.units < 1 || input.units > 10) {
    throw new TransfusionWorkflowError(400, `units ${input.units} 超出 1~10`);
  }
  assertVisitPatientBinding(input.visitId, input.patientId);

  reqSeq += 1;
  const r: TransfusionRequest = {
    reqId: `TX-${String(reqSeq).padStart(4, '0')}`,
    visitId: input.visitId,
    patientId: input.patientId,
    bloodType: input.bloodType,
    units: input.units,
    indication: input.indication,
    status: 'application',
    adverseReactions: [],
    createdAt: Date.now(),
  };
  requests.set(r.reqId, r);
  return r;
}

export interface TypeInput { reqId: string; abo: string; rh: string; antibodyScreen: string; roles: string[]; operatorId: string; }
export function typeBlood(input: TypeInput): TransfusionRequest {
  requireRole(input.roles, ['blood_bank_tech'], '血型鉴定');
  const r = mustGet(input.reqId);
  assertState(r, 'application', '血型鉴定');
  r.typeResult = { abo: input.abo, rh: input.rh, antibodyScreen: input.antibodyScreen, by: input.operatorId, at: Date.now() };
  r.status = 'typed';
  return r;
}

export interface CrossmatchInput { reqId: string; donorBagNo: string; compatibility: 'compatible' | 'incompatible'; roles: string[]; operatorId: string; }
export function crossmatch(input: CrossmatchInput): TransfusionRequest {
  requireRole(input.roles, ['blood_bank_tech'], '交叉配血');
  const r = mustGet(input.reqId);
  assertState(r, 'typed', '交叉配血');
  if (input.compatibility === 'incompatible') {
    throw new TransfusionWorkflowError(409, `交叉配血不合（donorBagNo=${input.donorBagNo}），拒发血`);
  }
  r.crossmatchResult = { donorBagNo: input.donorBagNo, compatibility: 'compatible', by: input.operatorId, at: Date.now() };
  r.status = 'crossmatched';
  return r;
}

export interface IssueInput { reqId: string; bagNo: string; expiresAt: number; roles: string[]; operatorId: string; }
export function issueBlood(input: IssueInput): TransfusionRequest {
  requireRole(input.roles, ['blood_bank_tech'], '发血');
  const r = mustGet(input.reqId);
  assertState(r, 'crossmatched', '发血');
  if (issuedBags.has(input.bagNo)) {
    throw new TransfusionWorkflowError(409, `血袋 ${input.bagNo} 已发血，禁止重复发血`);
  }
  issuedBags.add(input.bagNo);
  r.issueRecord = { bagNo: input.bagNo, expiresAt: input.expiresAt, by: input.operatorId, at: Date.now() };
  r.status = 'issued';
  return r;
}

export interface BedsideInput {
  reqId: string; nurseId: string; witnessNurseId: string; patientId: string; bagNo: string; matched: boolean;
  roles: string[];
}
export function bedsideCheck(input: BedsideInput): TransfusionRequest {
  requireRole(input.roles, ['nurse'], '床边双人核对');
  const r = mustGet(input.reqId);
  assertState(r, 'issued', '床边双人核对');
  if (!input.nurseId || !input.witnessNurseId) {
    throw new TransfusionWorkflowError(400, 'nurseId 与 witnessNurseId 均必填（双人核对）');
  }
  if (input.nurseId === input.witnessNurseId) {
    throw new TransfusionWorkflowError(400, 'nurseId 与 witnessNurseId 不能相同（须两名护士）');
  }
  if (input.patientId !== r.patientId) {
    throw new TransfusionWorkflowError(403, '床边核对患者与申请患者不匹配');
  }
  if (!input.matched) {
    throw new TransfusionWorkflowError(409, '双人核对不匹配，拒输');
  }
  r.bedsideCheck = { nurseId: input.nurseId, witnessNurseId: input.witnessNurseId, patientId: input.patientId, bagNo: input.bagNo, matched: true, at: Date.now() };
  r.status = 'bedside_checked';
  return r;
}

export function startTransfuse(reqId: string, roles: string[], operatorId: string): TransfusionRequest {
  requireRole(roles, ['nurse'], '开始输注');
  const r = mustGet(reqId);
  assertState(r, 'bedside_checked', '开始输注');
  r.status = 'transfusing';
  r.startedAt = Date.now();
  return r;
}

export function completeTransfuse(reqId: string, roles: string[]): TransfusionRequest {
  requireRole(roles, ['nurse'], '完成输注');
  const r = mustGet(reqId);
  if (r.status !== 'transfusing') throw new TransfusionWorkflowError(409, `仅输注中可完成，当前 ${r.status}`);
  r.status = 'completed';
  return r;
}

export interface ReactionInput { reqId: string; type: string; severity: number; description: string; roles: string[]; operatorId: string; }
export function recordReaction(input: ReactionInput): TransfusionRequest {
  requireRole(input.roles, ['nurse', 'doctor'], '不良反应记录');
  const r = mustGet(input.reqId);
  if (r.status !== 'transfusing' && r.status !== 'completed') {
    throw new TransfusionWorkflowError(409, `仅输注中/完成后可记录不良反应，当前 ${r.status}`);
  }
  if (input.severity < 1 || input.severity > 4) {
    throw new TransfusionWorkflowError(400, `severity ${input.severity} 超出 1~4`);
  }
  r.adverseReactions.push({ type: input.type, severity: input.severity, description: input.description, by: input.operatorId, at: Date.now() });
  return r;
}

export function listRequests(visitId?: string): TransfusionRequest[] {
  const all = Array.from(requests.values());
  const filtered = visitId ? all.filter((r) => r.visitId === visitId) : all;
  filtered.sort((a, b) => b.createdAt - a.createdAt);
  return filtered;
}

export function __resetStore(): void {
  requests.clear();
  issuedBags.clear();
  reqSeq = 0;
}
