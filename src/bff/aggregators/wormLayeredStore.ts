/**
 * 健澜AI原生医院操作系统OS - P5-16 分层 WORM store（remote S3 + local fs）
 *
 * - 读路径：remote 优先，remote miss 回退 local
 * - 一致性：同 segmentId 两边都有且 segmentHash 不一致 → 抛 worm-segment-divergence（不返回任何一侧）
 * - 无状态补传：发现 local 有但 remote 没有的段，sweep() 时逐个 remote.put，成功后 local.delete
 * - 不维护 pending 集合，所有推导基于每次 list/get 的当前状态
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AsyncWormStore, WormStore } from './wormStore.js';
import type { WormSegment } from './wormArchiveAggregator.js';
import type { ProbeableStore } from './wormStoreResilience.js';

export interface LayeredStoreOptions {
  /** 发现 local 有 remote 没有的段时，是否自动补传（默认 true） */
  autoRepair?: boolean;
}

export interface SweepResult {
  uploaded: number;
  failed: number;
  skipped: number;
}

export interface SegmentDivergenceError extends Error {
  code: 'worm-segment-divergence';
  segmentId: string;
  remoteHash: string;
  localHash: string;
}

function makeDivergenceError(segmentId: string, remoteHash: string, localHash: string): SegmentDivergenceError {
  const err = new Error(
    `worm-segment-divergence: segmentId=${segmentId} remoteHash=${remoteHash} localHash=${localHash}`,
  ) as SegmentDivergenceError;
  err.code = 'worm-segment-divergence';
  err.segmentId = segmentId;
  err.remoteHash = remoteHash;
  err.localHash = localHash;
  return err;
}

/**
 * 同步 WormStore 可选的 delete 方法。FileWormStore/MemoryWormStore 默认没有；
 * 分层 store 补传成功后需要从 local 删除，避免下次 sweep 重复补传。
 */
interface DeletableWormStore extends WormStore {
  delete?(segmentId: string): void;
}

/**
 * 构造分层 AsyncWormStore。
 *
 * - remote：S3（或兼容）异步后端
 * - local：本地 fs 同步兜底（断网时仍可读可写，恢复后补传）
 */
export function createLayeredWormStore(
  remote: AsyncWormStore & Partial<ProbeableStore>,
  local: DeletableWormStore,
  opts: LayeredStoreOptions = {},
): AsyncWormStore & { sweep(): Promise<SweepResult> } & Partial<ProbeableStore> {
  const autoRepair = opts.autoRepair !== false;

  /** probe 转发到 remote：resilience 装饰层在 put 超时后会调 inner.probe；
   *  组合顺序为 withResilience(layered(s3, fs))，inner 是 layered，所以必须由 layered 转发。 */
  async function probe(segmentId: string): Promise<boolean> {
    if (typeof remote.probe === 'function') return remote.probe(segmentId);
    // remote 不支持 probe（本地 mock 兜底）：用 get 判断
    const seg = await remote.get(segmentId);
    return seg !== null;
  }

  /** 比对同 id 两侧 hash；不一致直接抛错（绝不返回任何一侧） */
  function assertNoDivergence(remoteSeg: WormSegment | null, localSeg: WormSegment | null): void {
    if (remoteSeg && localSeg && remoteSeg.segmentHash !== localSeg.segmentHash) {
      console.error(
        `[worm-layered] SEGMENT DIVERGENCE segmentId=${remoteSeg.segmentId} `
        + `remoteHash=${remoteSeg.segmentHash} localHash=${localSeg.segmentHash} — 人工处置，不返回任何一侧`,
      );
      throw makeDivergenceError(remoteSeg.segmentId, remoteSeg.segmentHash, localSeg.segmentHash);
    }
  }

  async function get(segmentId: string): Promise<WormSegment | null> {
    const [r, l] = await Promise.all([
      remote.get(segmentId),
      Promise.resolve(local.get(segmentId)),
    ]);
    assertNoDivergence(r, l);
    if (r) return r;
    if (l) return l;
    return null;
  }

  async function list(): Promise<WormSegment[]> {
    const [rList, lList] = await Promise.all([
      remote.list(),
      Promise.resolve(local.list()),
    ]);
    const byId = new Map<string, WormSegment>();
    // 先放 remote（优先），再处理 local
    for (const seg of rList) byId.set(seg.segmentId, seg);
    for (const lSeg of lList) {
      const existing = byId.get(lSeg.segmentId);
      if (existing) {
        // 两侧都有，比对 hash
        if (existing.segmentHash !== lSeg.segmentHash) {
          assertNoDivergence(existing, lSeg);
        }
        // hash 一致 → 只保留一份（remote 那份）
      } else {
        // local 有 remote 没有 → 先返回（读路径不补传，sweep 时再补）
        byId.set(lSeg.segmentId, lSeg);
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.seq - b.seq);
  }

  async function put(segment: WormSegment): Promise<void> {
    // 写总是先写 remote（主），成功后写 local（兜底副本）
    await remote.put(segment);
    try {
      local.put(segment);
    } catch (err) {
      // local 写失败不阻塞主流程（remote 已成功）；下轮 sweep 会重新对齐
      console.error(`[worm-layered] local.put failed for ${segment.segmentId}:`, err instanceof Error ? err.message : String(err));
    }
  }

  async function countBySigner(keyId: string): Promise<number> {
    // 合并两侧，按 segmentId 去重后再按 signerKeyId 过滤
    const all = await list();
    return all.filter((s) => s.signerKeyId === keyId).length;
  }

  async function refresh(): Promise<void> {
    await remote.refresh();
    local.refresh?.();
  }

  async function newestSeq(): Promise<number> {
    const [r, l] = await Promise.all([
      remote.newestSeq(),
      Promise.resolve(local.list().length === 0 ? 0 : Math.max(...local.list().map((s) => s.seq))),
    ]);
    return Math.max(r, l);
  }

  /**
   * 无状态补传：扫描 local 有但 remote 没有的段，逐个 remote.put，成功后 local.delete。
   * 幂等：同 segmentId 同内容重复 put 是 S3 覆盖写，无副作用。
   */
  async function sweep(): Promise<SweepResult> {
    const result: SweepResult = { uploaded: 0, failed: 0, skipped: 0 };
    if (!autoRepair) return result;
    const [rList, lList] = await Promise.all([
      remote.list(),
      Promise.resolve(local.list()),
    ]);
    const rIds = new Set(rList.map((s) => s.segmentId));
    for (const lSeg of lList) {
      if (rIds.has(lSeg.segmentId)) {
        result.skipped++;
        continue;
      }
      try {
        await remote.put(lSeg);
        if (typeof local.delete === 'function') {
          local.delete(lSeg.segmentId);
        }
        result.uploaded++;
      } catch (err) {
        result.failed++;
        console.error(`[worm-layered] sweep upload failed for ${lSeg.segmentId}:`, err instanceof Error ? err.message : String(err));
      }
    }
    return result;
  }

  return { put, get, list, countBySigner, refresh, newestSeq, sweep, probe };
}
