/**
 * 健澜科技 jlmedaios - 医院内部即时通讯聚合器（M138-C）
 *
 * 【新业务场景】医护内部点对点 IM：医生 / 护士 / 药师 / 行政之间的院内协同消息。
 *   - 与 60-chat.sql（医患互联网对话）、clinical.notifications（站内铃铛）互补；
 *   - 消息体 AES-256-GCM 加密存储（复用 FieldCipher），即使拖库亦为密文；
 *   - 四类消息：text 文字 / image 图片 / file 文件 / system 系统通知。
 *
 * 设计要点（与全仓聚合器约定一致）：
 *  - sendMessage / getConversation / getUnreadCount 均为「纯业务函数」：
 *    不打外部库、不修改入参；状态收敛在本模块的内存加密存储中，便于单测与前端复用；
 *  - 构造（加密）与读取（解密）分离：落内存即密文，对外视图才解密回明文；
 *  - 越权防护在路由层强制 senderId = 当前登录用户，本层不做鉴权。
 *
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { decryptField, encryptField } from '../../security/encryption/FieldCipher.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 消息类型枚举（与 clinical.im_messages.type CHECK 约束一致） */
export type ImMessageType = 'text' | 'image' | 'file' | 'system';

/** 对外视图：一条会话消息（content 为解密后的明文） */
export interface ImMessage {
  /** 消息唯一标识 */
  id: string;
  /** 发送人 staff_id（= iam.users.id）；system 消息可指向系统账号 */
  senderId: string;
  /** 接收人 staff_id（= iam.users.id） */
  receiverId: string;
  /** 消息类型 */
  type: ImMessageType;
  /** 明文内容（文字正文 / 图片或文件地址 / 系统通知文案） */
  content: string;
  /** 图片/文件附加元信息（文件名、大小、下载地址等）；text 消息为空对象 */
  meta: Record<string, unknown>;
  /** 已读时间 ISO 串；null = 未读 */
  readAt: string | null;
  /** 创建时间 ISO 串 */
  createdAt: string;
}

/** 内存中的落库形态：content 始终为密文，绝不明文常驻 */
interface StoredImMessage {
  id: string;
  senderId: string;
  receiverId: string;
  type: ImMessageType;
  contentCipher: string;
  meta: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  /** 内存内单调递增序号，用于毫秒级时间戳相同时的稳定排序 */
  seq: number;
}

/* ------------------------------------------------------------------ */
/* 内存加密存储（纯业务层状态；不打外部 DB）                              */
/* ------------------------------------------------------------------ */

let store: StoredImMessage[] = [];
let seqCounter = 0;

/** 测试用：清空内存存储，保证用例间隔离 */
export function __resetImStore(): void {
  store = [];
  seqCounter = 0;
}

/* ------------------------------------------------------------------ */
/* 纯函数：类型收敛 / 构造消息（加密）/ 会话分页 / 未读统计               */
/* ------------------------------------------------------------------ */

/** 合法消息类型全集 */
export const IM_MESSAGE_TYPES: readonly ImMessageType[] = [
  'text',
  'image',
  'file',
  'system',
];

/** 任意值收敛为合法消息类型，越界回退 text（安全默认：可见、不静默丢） */
function asImType(v: unknown): ImMessageType {
  return IM_MESSAGE_TYPES.includes(v as ImMessageType)
    ? (v as ImMessageType)
    : 'text';
}

/** 任意值 trim 为字符串，null/undefined 回退空串 */
function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 任意值收敛为正整数；非法回退默认值 */
function asPosInt(v: unknown, fallback: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(Math.floor(v), max);
}

/** 密文行 -> 对外视图（解密 content） */
function rowToMessage(r: StoredImMessage): ImMessage {
  let content = '';
  try {
    content = decryptField(r.contentCipher);
  } catch (e) {
    // 密文被篡改 / 密钥错误：不抛断整条会话，回退占位串并告警
    console.warn('[im] 消息解密失败，已回退占位串:', e instanceof Error ? e.message : e);
    content = '[消息解密失败]';
  }
  return {
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    type: r.type,
    content,
    meta: r.meta ?? {},
    readAt: r.readAt,
    createdAt: r.createdAt,
  };
}

/**
 * sendMessage：构造并入库一条消息（纯业务函数，内存加密存储）。
 *
 * 规则：
 *  - senderId / receiverId 去空白后必填，缺失直接抛错（调用方编程错误）；
 *  - 不能给自己发消息（senderId === receiverId），抛错；
 *  - type 越界回退 text；content 缺省空串；
 *  - content 经 AES-256-GCM 加密后才写入内存存储，对外返回解密后的明文视图；
 *  - id 由 crypto.randomUUID() 生成；readAt 恒为 null（新消息必未读）。
 *
 * @throws {Error} senderId / receiverId 为空或二者相同时抛出
 */
export function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  type: string,
): ImMessage {
  const sid = asStr(senderId);
  const rid = asStr(receiverId);
  if (!sid) throw new Error('sendMessage: senderId 不能为空');
  if (!rid) throw new Error('sendMessage: receiverId 不能为空');
  if (sid === rid) throw new Error('sendMessage: 不能给自己发消息');

  const msgType = asImType(type);
  const plaintext = asStr(content);

  // 消息加密存储：明文只在本函数栈内出现，落内存即密文
  const contentCipher = encryptField(plaintext);

  const row: StoredImMessage = {
    id: crypto.randomUUID(),
    senderId: sid,
    receiverId: rid,
    type: msgType,
    contentCipher,
    meta: {},
    readAt: null,
    createdAt: new Date().toISOString(),
    seq: ++seqCounter,
  };
  store.push(row);

  return rowToMessage(row);
}

/**
 * getConversation：拉取两人会话的一页消息（按时间正序，纯业务函数）。
 *
 * 匹配双人对：(userId→otherUserId) 或 (otherUserId→userId) 的双向消息均纳入；
 * page 从 1 起，pageSize 默认 20、上限 100；返回当前页解密后的明文消息列表。
 */
export function getConversation(
  userId: string,
  otherUserId: string,
  page?: number,
  pageSize?: number,
): ImMessage[] {
  const me = asStr(userId);
  const other = asStr(otherUserId);
  if (!me || !other) return [];

  const size = asPosInt(pageSize, 20, 100);
  const p = asPosInt(page, 1, Number.MAX_SAFE_INTEGER);

  // 双向匹配两人会话
  const pair = store
    .filter(
      (r) =>
        (r.senderId === me && r.receiverId === other) ||
        (r.senderId === other && r.receiverId === me),
    )
    // 时间正序（旧→新），同毫秒以入库序号兜底，保证分页稳定
    .sort((a, b) =>
      a.createdAt === b.createdAt ? a.seq - b.seq : a.createdAt < b.createdAt ? -1 : 1,
    );

  const start = (p - 1) * size;
  return pair.slice(start, start + size).map(rowToMessage);
}

/**
 * getUnreadCount：统计某人的未读消息总数（纯业务函数）。
 * 口径：receiverId = 本人 且 readAt IS NULL；自己发出的消息不计入。
 */
export function getUnreadCount(userId: string): number {
  const me = asStr(userId);
  if (!me) return 0;
  return store.reduce(
    (acc, r) => (r.receiverId === me && r.readAt == null ? acc + 1 : acc),
    0,
  );
}
