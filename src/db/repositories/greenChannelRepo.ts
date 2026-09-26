/**
 * 健澜科技 jlmedaios - 绿色通道 Repository（M1-B1）
 *
 * clinical.green_channels / clinical.green_channel_nodes 表访问：
 *  - startChannel 启动通道：取通道号、写通道头、按模板批量建时间节点、
 *    记录激活时间与通知团队（先救治后付费）；
 *  - recordNode 记录某节点实际完成时间；
 *  - closeChannel 关闭通道并落关键质控指标（DB/DCT/DNT）；
 *  - 查询：按就诊、按状态、列表（含节点）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { getDb, type DbExecutor } from '../pool.js';
import {
  computeMetrics,
  getChannelTemplate,
  type ChannelNodeTemplate,
  type GreenChannelType,
} from '@/emergency/greenChannelTemplate.js';

/* ============================== 类型 ============================== */

export interface GreenChannelNode {
  id: string;
  channelId: string;
  nodeKey: string;
  label: string;
  targetMinutes: number | null;
  actualTime: string | null;
  sortOrder: number;
  /** 读取时计算：是否超时 */
  overdue: boolean;
}

export interface GreenChannel {
  id: string;
  channelNo: string;
  visitId: string;
  patientId: string;
  type: GreenChannelType;
  subtype: string;
  status: 'active' | 'completed' | 'cancelled';
  arriveTime: string;
  activateTime: string;
  endTime: string | null;
  notifiedTeams: string[];
  dbnMinutes: number | null;
  dctMinutes: number | null;
  dntMinutes: number | null;
  outcome: string | null;
  qualityNote: string | null;
  nodes: GreenChannelNode[];
  createdAt: string;
  updatedAt: string;
}

export interface StartChannelInput {
  visitId: string;
  patientId: string;
  type: GreenChannelType;
  subtype?: string;
  arriveTime: string;
  activateTime?: string;
  notifiedTeams?: string[];
}

/* ============================= 映射 ============================== */

function mapNode(row: Record<string, unknown>, arriveIso: string, overdueMap: Record<string, boolean>): GreenChannelNode {
  return {
    id: String(row.id),
    channelId: String(row.channel_id),
    nodeKey: String(row.node_key),
    label: String(row.label),
    targetMinutes: row.target_minutes == null ? null : Number(row.target_minutes),
    actualTime: row.actual_time ? String(row.actual_time) : null,
    sortOrder: Number(row.sort_order),
    overdue: Boolean(overdueMap[String(row.node_key)]),
  };
}

function mapHead(row: Record<string, unknown>): Omit<GreenChannel, 'nodes'> {
  return {
    id: String(row.id),
    channelNo: String(row.channel_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    type: String(row.type) as GreenChannelType,
    subtype: String(row.subtype ?? ''),
    status: String(row.status) as GreenChannel['status'],
    arriveTime: String(row.arrive_time),
    activateTime: String(row.activate_time),
    endTime: row.end_time ? String(row.end_time) : null,
    notifiedTeams: (row.notified_teams as string[]) ?? [],
    dbnMinutes: row.dbn_minutes == null ? null : Number(row.dbn_minutes),
    dctMinutes: row.dct_minutes == null ? null : Number(row.dct_minutes),
    dntMinutes: row.dnt_minutes == null ? null : Number(row.dnt_minutes),
    outcome: row.outcome ? String(row.outcome) : null,
    qualityNote: row.quality_note ? String(row.quality_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ============================ 启动 ============================== */

/**
 * 启动绿色通道：写通道头 + 按模板批量建节点。
 * 通道号取分诊序列值（GC 前缀），保证唯一。
 */
export async function startChannel(input: StartChannelInput, executor?: DbExecutor): Promise<GreenChannel> {
  return withExecutor(executor, async (sql) => {
    // 同一就诊不允许重复开启活动通道
    const dup = await sql`
      SELECT id FROM clinical.green_channels
      WHERE visit_id = ${input.visitId} AND status = 'active'
    `;
    if (dup.length) throw new GreenChannelConflictError('该患者已有进行中的绿色通道');

    const template = getChannelTemplate(input.type);
    const seqRows = await sql`SELECT nextval('clinical.emergency_triage_no_seq')::bigint AS seq`;
    const channelNo = `GC${String(seqRows[0].seq)}`;
    const activate = input.activateTime ?? new Date().toISOString();
    const teams = input.notifiedTeams ?? template.notifyTeams;

    const headRows = await sql`
      INSERT INTO clinical.green_channels (
        channel_no, visit_id, patient_id, type, subtype,
        status, arrive_time, activate_time, notified_teams
      ) VALUES (
        ${channelNo}, ${input.visitId}, ${input.patientId},
        ${input.type}, ${input.subtype ?? template.subtypes[0] ?? ''},
        'active', ${input.arriveTime}, ${activate}, ${teams as never}
      )
      RETURNING *
    `;
    const head = mapHead(headRows[0]);

    // 批量建节点（arrive / activate 节点直接落实际时间）
    for (const n of template.nodes) {
      const actual =
        n.nodeKey === 'arrive'
          ? input.arriveTime
          : n.nodeKey === 'activate'
            ? activate
            : null;
      await sql`
        INSERT INTO clinical.green_channel_nodes (
          channel_id, node_key, label, target_minutes, actual_time, sort_order
        ) VALUES (
          ${head.id}, ${n.nodeKey}, ${n.label}, ${n.targetMinutes}, ${actual}, ${n.sortOrder}
        )
      `;
    }

    return (await getChannelById(head.id, sql))!;
  });
}

/* ============================ 节点 ============================== */

/** 记录节点实际完成时间；返回更新后的完整通道 */
export async function recordNode(
  channelId: string,
  nodeKey: string,
  actualTime?: string,
  executor?: DbExecutor,
): Promise<GreenChannel> {
  return withExecutor(executor, async (sql) => {
    const at = actualTime ?? new Date().toISOString();
    const rows = await sql`
      UPDATE clinical.green_channel_nodes SET actual_time = ${at}
      WHERE channel_id = ${channelId} AND node_key = ${nodeKey}
      RETURNING id
    `;
    if (!rows.length) throw new GreenChannelNodeError(`绿色通道节点不存在: ${nodeKey}`);
    return (await getChannelById(channelId, sql))!;
  });
}

/* ============================ 关闭 ============================== */

/** 关闭通道：计算质控指标、写转归与质量评估 */
export async function closeChannel(
  channelId: string,
  data: { outcome: string; qualityNote?: string | null; endTime?: string; status?: 'completed' | 'cancelled' },
  executor?: DbExecutor,
): Promise<GreenChannel> {
  return withExecutor(executor, async (sql) => {
    const current = await getChannelById(channelId, sql);
    if (!current) throw new GreenChannelNodeError('绿色通道不存在');
    if (current.status !== 'active') throw new GreenChannelConflictError('通道已关闭，不能重复关闭');

    const metrics = computeMetrics(
      current.type,
      current.arriveTime,
      current.nodes.map((n) => ({ nodeKey: n.nodeKey, targetMinutes: n.targetMinutes, actualTime: n.actualTime })),
    );
    const end = data.endTime ?? new Date().toISOString();
    const rows = await sql`
      UPDATE clinical.green_channels SET
        status = ${data.status ?? 'completed'},
        end_time = ${end},
        dbn_minutes = ${metrics.dbnMinutes},
        dct_minutes = ${metrics.dctMinutes},
        dnt_minutes = ${metrics.dntMinutes},
        outcome = ${data.outcome},
        quality_note = ${data.qualityNote ?? null}
      WHERE id = ${channelId}
      RETURNING *
    `;
    return (await hydrate(rows[0], sql))!;
  });
}

/* ============================ 查询 ============================== */

export async function getChannelById(id: string, executor?: DbExecutor): Promise<GreenChannel | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`SELECT * FROM clinical.green_channels WHERE id = ${id}`;
    return rows.length ? hydrate(rows[0], sql) : null;
  });
}

export async function getActiveChannelByVisit(visitId: string, executor?: DbExecutor): Promise<GreenChannel | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`
      SELECT * FROM clinical.green_channels
      WHERE visit_id = ${visitId} AND status = 'active'
      ORDER BY activate_time DESC LIMIT 1
    `;
    return rows.length ? hydrate(rows[0], sql) : null;
  });
}

export async function listChannels(
  filter: { status?: GreenChannel['status']; type?: GreenChannelType; activeOnly?: boolean } = {},
  executor?: DbExecutor,
): Promise<GreenChannel[]> {
  return withExecutor(executor, async (sql) => {
    let rows: Record<string, unknown>[];
    if (filter.activeOnly) {
      rows = await sql`SELECT * FROM clinical.green_channels WHERE status = 'active' ORDER BY activate_time DESC`;
    } else if (filter.status) {
      rows = await sql`SELECT * FROM clinical.green_channels WHERE status = ${filter.status} ORDER BY activate_time DESC`;
    } else if (filter.type) {
      rows = await sql`SELECT * FROM clinical.green_channels WHERE type = ${filter.type} ORDER BY activate_time DESC`;
    } else {
      rows = await sql`SELECT * FROM clinical.green_channels ORDER BY activate_time DESC`;
    }
    const out: GreenChannel[] = [];
    for (const r of rows) out.push((await hydrate(r, sql))!);
    return out;
  });
}

/* =========================== 组装 ============================== */

async function hydrate(headRow: Record<string, unknown>, sql: DbExecutor): Promise<GreenChannel> {
  const head = mapHead(headRow);
  const nodeRows = await sql`
    SELECT * FROM clinical.green_channel_nodes
    WHERE channel_id = ${head.id} ORDER BY sort_order ASC
  `;
  const metrics = computeMetrics(
    head.type,
    head.arriveTime,
    nodeRows.map((r) => ({
      nodeKey: String(r.node_key),
      targetMinutes: r.target_minutes == null ? null : Number(r.target_minutes),
      actualTime: r.actual_time ? String(r.actual_time) : null,
    })),
  );
  const nodes = nodeRows.map((r) => mapNode(r, head.arriveTime, metrics.overdue));
  return { ...head, nodes };
}

/* =========================== 错误 ============================== */

export class GreenChannelConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreenChannelConflictError';
  }
}

export class GreenChannelNodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GreenChannelNodeError';
  }
}

async function withExecutor<T>(executor: DbExecutor | undefined, fn: (sql: DbExecutor) => Promise<T>): Promise<T> {
  return executor ? fn(executor) : fn(getDb());
}
