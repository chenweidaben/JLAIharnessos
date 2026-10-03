/**
 * 健澜科技数智医院智能体 - 事务性发件箱中继（Outbox Relay）
 *
 * 轮询 clinical.event_outbox 中未发布事件，至少一次投递（at-least-once）到事件
 * 发布器（WebSocket broadcast；未来可替换为 Kafka producer），实现「业务落库即必发」。
 *
 * 流程（状态机 pending -> processing -> published）：
 *   1. 事务内认领一批 pending（FOR UPDATE SKIP LOCKED，标记 processing），提交；
 *   2. 提交后逐条 publish（此时业务数据已可见，无时序竞态）；
 *   3. 成功的标记 published；失败的回滚为 pending（attempts+1），下轮重试；
 *   4. 认领后崩溃（processing 超时）的事件由 reclaimStale 回收为 pending。
 *
 * 语义说明：
 *   - 事件在 outbox 表中持久化，重启不丢、可审计、可重放；
 *   - 至少一次投递可能重复（如 publish 成功但标记前崩溃），消费端按稳定 event_id
 *     幂等（前端 useAlert 已按 id 去重，M7-B）；
 *   - 多实例部署时 SKIP LOCKED 保证事件只被一个 Relay 认领。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx } from '../db/pool.js';
import { bffMetrics } from './observability/metrics.js';
import {
  claimBatch,
  markPublished,
  markDead,
  resetToPending,
  reclaimStale,
  countByStatus,
  oldestPendingAgeSeconds,
  type OutboxEvent,
} from '../db/repositories/outboxRepo.js';

/** 事件发布器：把一条 outbox 事件投递到具体通道（WS / Kafka）。
 *  第三个参数为事件元数据（数字主键 seq 与稳定 event_id），供通道在帧中携带，
 *  客户端据此做重连补拉（gap recovery）。 */
export type OutboxPublisher = (
  eventType: string,
  payload: unknown,
  meta: { seq: number; eventId: string },
) => Promise<void> | void;

export interface OutboxRelayOptions {
  /** 每轮最多认领事件数 */
  batchSize?: number;
  /** 无事件时的轮询间隔（毫秒） */
  pollIntervalMs?: number;
  /** processing 状态超过该时长视为认领后崩溃，回收为 pending（毫秒） */
  staleMs?: number;
  /** 发布失败达到该次数后进入死信（dead），不再自动重试（默认 5） */
  maxAttempts?: number;
  /** 发布失败时的回调（可接日志/监控） */
  onPublishError?: (event: OutboxEvent, error: unknown) => void;
  /** 事件进入死信时的回调（可接告警） */
  onDeadLetter?: (event: OutboxEvent, error: unknown) => void;
}

export class OutboxRelay {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pumping = false;
  private started = false;

  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly staleMs: number;
  private readonly maxAttempts: number;
  private readonly onPublishError?: (event: OutboxEvent, error: unknown) => void;
  private readonly onDeadLetter?: (event: OutboxEvent, error: unknown) => void;

  constructor(
    private readonly publisher: OutboxPublisher,
    options: OutboxRelayOptions = {},
  ) {
    this.batchSize = options.batchSize ?? 50;
    this.pollIntervalMs = options.pollIntervalMs ?? 500;
    this.staleMs = options.staleMs ?? 60_000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.onPublishError = options.onPublishError;
    this.onDeadLetter = options.onDeadLetter;
  }

  /** 启动中继（立即跑一轮，之后按间隔轮询）。幂等，重复调用安全。 */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.schedule(0);
  }

  /** 停止中继（等待当前轮结束，不再调度）。 */
  stop(): void {
    this.started = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(delay: number): void {
    if (!this.started) return;
    this.timer = setTimeout(() => {
      void this.runOnce();
    }, delay);
  }

  /**
   * 执行一轮：回收僵尸认领 -> 认领 pending -> 发布 -> 标记/回滚。
   * 公共方法，便于启动时立即跑一轮与测试手动驱动；start() 后由定时器周期调用。
   */
  async runOnce(): Promise<void> {
    if (this.pumping) {
      this.schedule(this.pollIntervalMs);
      return;
    }
    this.pumping = true;
    let hadEvents = false;
    try {
      // 先回收上一轮认领后崩溃的事件
      await reclaimStale(this.staleMs);

      // 阶段1：事务内认领 pending（-> processing），提交
      let events: OutboxEvent[] = [];
      await withTx(async (tx) => {
        events = await claimBatch(this.batchSize, tx);
      });
      if (events.length === 0) {
        hadEvents = false;
        this.schedule(this.pollIntervalMs);
        return;
      }
      hadEvents = true;

      // 阶段2：提交后逐条 publish（数据已可见），分别收集成功/失败
      const successIds: number[] = [];
      const retryIds: number[] = [];
      const dead: { id: number; error: string }[] = [];
      for (const event of events) {
        try {
          await this.publisher(event.eventType, event.payload, {
            seq: event.id,
            eventId: event.eventId,
          });
          successIds.push(event.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // 认领时 event.attempts 是此前失败次数；本次失败后总失败 = attempts+1
          if (event.attempts + 1 >= this.maxAttempts) {
            dead.push({ id: event.id, error: msg });
            this.onDeadLetter?.(event, err);
          } else {
            retryIds.push(event.id);
            this.onPublishError?.(event, err);
          }
        }
      }

      // 阶段3：成功标记 published；可重试失败回滚 pending；超限失败进入死信
      await markPublished(successIds);
      await resetToPending(retryIds);
      // 死信逐条记录各自的最后错误（数量通常极少）
      for (const d of dead) {
        await markDead([d.id], d.error);
      }
    } catch {
      // 断库等：本轮跳过，稍后重试
    } finally {
      this.pumping = false;
      // 无论有无事件都刷新指标（断库时内部吞错，保留上次值），避免指标陈旧/归零失败
      await this.updateMetrics();
      // 有事件时尽快再拉（可能还有积压），无事件时按间隔轮询
      if (this.started) this.schedule(hadEvents ? 0 : this.pollIntervalMs);
    }
  }

  /**
   * 更新 outbox 指标：各状态事件数（gauge，label status）与最老 pending 年龄。
   * 每轮（含无事件轮）调用；断库时查询抛错被本地捕获，不影响 Relay、保留上次值。
   */
  async updateMetrics(): Promise<void> {
    try {
      const counts = await countByStatus();
      for (const [status, n] of Object.entries(counts)) {
        bffMetrics.outboxEvents.set({ status }, n);
      }
      bffMetrics.outboxOldestPendingAge.set({}, await oldestPendingAgeSeconds());
    } catch {
      // 断库/查询失败：保留上一次指标值，不中断 Relay
    }
  }
}
