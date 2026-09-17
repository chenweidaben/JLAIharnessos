/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import type { MedicalSession as MedicalSessionData, MedicalSessionType } from '@/types';

import { type CreateSessionInput, MedicalSessionModel } from './MedicalSession';

/**
 * 会话管理器
 *
 * 负责医疗会话的创建、恢复、归档、持久化与检索。
 * 开发环境使用 JSON 文件存储（每会话一个文件），不依赖真实数据库。
 *
 * 会话类型覆盖门诊/查房/会诊/质控/教学等医疗场景；
 * 支持按患者、日期、类型搜索，消息分页由 MedicalSessionModel 提供。
 */
export class SessionManager {
  /** 会话存储目录 */
  private readonly storageDir: string;

  /** 内存中的会话索引（sessionId → model） */
  private readonly sessions = new Map<string, MedicalSessionModel>();

  /**
   * @param options.storageDir - JSON 存储目录（默认 ./.sessions）
   */
  constructor(options: { storageDir?: string } = {}) {
    this.storageDir = options.storageDir ?? path.resolve(process.cwd(), '.sessions');
  }

  /**
   * 创建会话
   *
   * @param input - 创建输入
   * @returns 新建会话模型
   */
  public async createSession(input: CreateSessionInput): Promise<MedicalSessionModel> {
    const session = new MedicalSessionModel(input);
    this.sessions.set(session.sessionId, session);
    await this.persist(session);
    return session;
  }

  /**
   * 按 ID 获取会话（内存优先，未命中则尝试从磁盘恢复）
   *
   * @param sessionId - 会话ID
   * @returns 会话模型，不存在返回 undefined
   */
  public async getSession(sessionId: string): Promise<MedicalSessionModel | undefined> {
    const cached = this.sessions.get(sessionId);
    if (cached) return cached;

    try {
      const file = this.sessionFile(sessionId);
      const raw = await fs.readFile(file, 'utf-8');
      const data = JSON.parse(raw) as MedicalSessionData;
      const model = MedicalSessionModel.fromData(data);
      this.sessions.set(sessionId, model);
      return model;
    } catch {
      return undefined;
    }
  }

  /**
   * 必须存在的会话
   *
   * @param sessionId - 会话ID
   * @returns 会话模型
   * @throws {MedicalAgentError} 会话不存在
   */
  public async requireSession(sessionId: string): Promise<MedicalSessionModel> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new MedicalAgentError(ErrorCodes.VALIDATION_ERROR, `Session '${sessionId}' not found`, {
        sessionId,
      });
    }
    return session;
  }

  /**
   * 保存会话（写回 JSON 文件）
   *
   * @param session - 会话模型
   */
  public async save(session: MedicalSessionModel): Promise<void> {
    this.sessions.set(session.sessionId, session);
    await this.persist(session);
  }

  /**
   * 完成会话
   *
   * @param sessionId - 会话ID
   */
  public async completeSession(sessionId: string): Promise<void> {
    const session = await this.requireSession(sessionId);
    session.complete();
    await this.persist(session);
  }

  /**
   * 归档会话
   *
   * @param sessionId - 会话ID
   */
  public async archiveSession(sessionId: string): Promise<void> {
    const session = await this.requireSession(sessionId);
    session.archive();
    await this.persist(session);
  }

  /**
   * 搜索会话
   *
   * @param filter - 过滤条件
   * @param filter.patientId - 按患者过滤
   * @param filter.type - 按会话类型过滤
   * @param filter.from - 起始时间戳
   * @param filter.to - 截止时间戳
   * @param filter.limit - 最多返回条数
   * @returns 会话数据列表（按更新时间倒序）
   */
  public async search(
    filter: {
      patientId?: string;
      type?: MedicalSessionType;
      from?: number;
      to?: number;
      limit?: number;
    } = {},
  ): Promise<MedicalSessionData[]> {
    await this.ensureLoaded();

    let results = Array.from(this.sessions.values());

    if (filter.patientId) {
      results = results.filter((s) => s.patientId === filter.patientId);
    }
    if (filter.type) {
      results = results.filter((s) => s.sessionType === filter.type);
    }
    if (filter.from != null) {
      results = results.filter((s) => s.updatedAt >= filter.from!);
    }
    if (filter.to != null) {
      results = results.filter((s) => s.updatedAt <= filter.to!);
    }

    results.sort((a, b) => b.updatedAt - a.updatedAt);

    const limited = filter.limit ? results.slice(0, filter.limit) : results;
    return limited.map((s) => s.toData());
  }

  /**
   * 列出某用户全部会话
   *
   * @param userId - 用户ID
   * @returns 会话数据列表
   */
  public async listByUser(userId: string): Promise<MedicalSessionData[]> {
    await this.ensureLoaded();
    return Array.from(this.sessions.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((s) => s.toData());
  }

  /**
   * 持久化会话到 JSON 文件
   *
   * @param session - 会话模型
   */
  private async persist(session: MedicalSessionModel): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
    const file = this.sessionFile(session.sessionId);
    await fs.writeFile(file, JSON.stringify(session.toData(), null, 2), 'utf-8');
  }

  /**
   * 惰性加载磁盘上的全部会话索引
   */
  private async ensureLoaded(): Promise<void> {
    if (this.sessions.size > 0) return;
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await fs.readFile(path.join(this.storageDir, file), 'utf-8');
          const data = JSON.parse(raw) as MedicalSessionData;
          this.sessions.set(data.sessionId, MedicalSessionModel.fromData(data));
        } catch {
          // 忽略损坏的会话文件
        }
      }
    } catch {
      // 目录不存在时静默处理
    }
  }

  /**
   * 会话文件路径
   */
  private sessionFile(sessionId: string): string {
    return path.join(this.storageDir, `${sessionId}.json`);
  }
}
