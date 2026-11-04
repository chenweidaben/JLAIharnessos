/**
 * 健澜AI原生医院操作系统OS - P3-4 报告推送 + 满意度闭环工单
 *
 * - EngagementReport：issued→published→pushed→read，异常加推 sms
 * - SupportTicket：open→investigating→resolved→closed，患者/admin 评论
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class EngagementError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type ReportType = 'lab' | 'imaging' | 'prescription';
export type ReportStatus = 'issued' | 'published' | 'pushed' | 'read';
export type TicketSource = 'low-satisfaction' | 'complaint' | 'inquiry';
export type TicketStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface EngagementReport {
  reportId: string;
  patientId: string;
  visitId: string;
  type: ReportType;
  title: string;
  result: string;
  isAbnormal: boolean;
  status: ReportStatus;
  pushChannels: Array<'in-app' | 'sms'>;
  issuedAt: string;
  pushedAt?: string;
  readAt?: string;
}

export interface TicketComment {
  commentId: string;
  authorId: string;
  authorRole: string;
  content: string;
  commentedAt: string;
}

export interface SupportTicket {
  ticketId: string;
  patientId: string;
  source: TicketSource;
  relatedSurveyId?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  comments: TicketComment[];
}

const REPORT_TYPES: readonly ReportType[] = ['lab', 'imaging', 'prescription'];
const TICKET_SOURCES: readonly TicketSource[] = ['low-satisfaction', 'complaint', 'inquiry'];
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['investigating'],
  investigating: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

const reports: EngagementReport[] = [];
const tickets: SupportTicket[] = [];
let seq = 0;

function pick<T extends string>(v: unknown, allowed: readonly T[], label: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) throw new EngagementError(400, `${label} 非法：${String(v)}`);
  return v as T;
}

// ---------- Reports ----------
export function publishReport(input: {
  patientId: string; visitId: string; type: unknown; title: string; result: string; isAbnormal: boolean;
}): EngagementReport {
  if (!input.patientId || !input.visitId) throw new EngagementError(400, 'patientId/visitId 必填');
  if (!input.title) throw new EngagementError(400, 'title 必填');
  const type = pick(input.type, REPORT_TYPES, 'type');
  seq += 1;
  const now = new Date().toISOString();
  const r: EngagementReport = {
    reportId: `ER-${String(seq).padStart(5, '0')}`,
    patientId: input.patientId, visitId: input.visitId, type,
    title: input.title, result: input.result ?? '', isAbnormal: !!input.isAbnormal,
    status: 'pushed',
    pushChannels: input.isAbnormal ? ['in-app', 'sms'] : ['in-app'],
    issuedAt: now, pushedAt: now,
  };
  reports.push(r);
  return r;
}

export function listReports(patientId: string): EngagementReport[] {
  return reports.filter((r) => r.patientId === patientId).sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
}

export function markReportRead(patientId: string, reportId: string): EngagementReport {
  const r = reports.find((x) => x.reportId === reportId);
  if (!r) throw new EngagementError(404, `报告不存在：${reportId}`);
  if (r.patientId !== patientId) throw new EngagementError(403, '只能读自己的报告');
  if (r.status !== 'read') {
    r.status = 'read';
    r.readAt = new Date().toISOString();
  }
  return r;
}

// ---------- Tickets ----------
export function createTicket(input: {
  patientId: string; source?: unknown; relatedSurveyId?: string; subject: string; description: string;
}): SupportTicket {
  if (!input.patientId) throw new EngagementError(400, 'patientId 必填');
  if (!input.subject) throw new EngagementError(400, 'subject 必填');
  if (input.subject.length > 200) throw new EngagementError(400, 'subject 不能超过 200 字');
  const source = input.source === undefined ? 'complaint' : pick(input.source, TICKET_SOURCES, 'source');
  seq += 1;
  const now = new Date().toISOString();
  const t: SupportTicket = {
    ticketId: `TK-${String(seq).padStart(5, '0')}`,
    patientId: input.patientId, source, relatedSurveyId: input.relatedSurveyId,
    subject: input.subject, description: input.description ?? '',
    status: 'open', createdAt: now, updatedAt: now, comments: [],
  };
  tickets.push(t);
  return t;
}

export function autoCreateLowSatisfactionTicket(patientId: string, surveyId: string, comment: string): SupportTicket {
  return createTicket({
    patientId, source: 'low-satisfaction', relatedSurveyId: surveyId,
    subject: '满意度低分跟进', description: comment,
  });
}

export function listTickets(patientId: string): SupportTicket[] {
  return tickets.filter((t) => t.patientId === patientId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function getTicket(ticketId: string): SupportTicket {
  const t = tickets.find((x) => x.ticketId === ticketId);
  if (!t) throw new EngagementError(404, `工单不存在：${ticketId}`);
  return t;
}

export function addComment(ticketId: string, authorId: string, authorRole: string, content: string): SupportTicket {
  const t = getTicket(ticketId);
  if (t.status === 'closed') throw new EngagementError(409, '工单已 closed，不能再评论');
  if (!content) throw new EngagementError(400, 'content 必填');
  seq += 1;
  t.comments.push({
    commentId: `CM-${String(seq).padStart(5, '0')}`,
    authorId, authorRole, content, commentedAt: new Date().toISOString(),
  });
  t.updatedAt = new Date().toISOString();
  return t;
}

export function updateTicketStatus(ticketId: string, newStatus: string, comment?: string): SupportTicket {
  const t = getTicket(ticketId);
  const ns = pick(newStatus, ['open', 'investigating', 'resolved', 'closed'] as const, 'status');
  if (ns === t.status) return t;
  if (!VALID_TRANSITIONS[t.status].includes(ns)) {
    throw new EngagementError(409, `非法状态跃迁：${t.status} -> ${ns}`);
  }
  if (ns === 'closed' && !comment) throw new EngagementError(400, '关单必须填 comment');
  t.status = ns;
  t.updatedAt = new Date().toISOString();
  if (ns === 'closed') t.resolvedAt = new Date().toISOString();
  if (comment) {
    seq += 1;
    t.comments.push({
      commentId: `CM-${String(seq).padStart(5, '0')}`,
      authorId: 'admin', authorRole: 'admin', content: comment, commentedAt: new Date().toISOString(),
    });
  }
  return t;
}

export function __resetStore(): void { reports.length = 0; tickets.length = 0; seq = 0; }
