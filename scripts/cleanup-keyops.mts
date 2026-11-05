/**
 * P5-15 运维审计文件清理脚本
 *
 * 用法：
 *   bun run scripts/cleanup-keyops.mts              # dry-run：只打印清单，不删
 *   bun run scripts/cleanup-keyops.mts --apply      # 真删
 *
 * 环境变量：
 *   WORM_STORE_DIR              默认 logs/worm-store
 *   KEY_OPS_RETENTION_DAYS      默认 180；<180 会抛错（合规下限）
 *
 * 删除按文件名里的 YYYYMMDD 判定，跨实例（含已退出进程）清理。
 * 默认 dry-run 是因为审计文件删除不可逆，必须先看清单再 apply。
 */
import { resolveRetentionDays, cleanupOldKeyOps } from '../src/bff/aggregators/keyOpsStore.js';

const apply = process.argv.includes('--apply');
const retention = resolveRetentionDays();
console.log(`[cleanup-keyops] retentionDays=${retention} apply=${apply}`);
const r = cleanupOldKeyOps({ dryRun: !apply });
console.log(`[cleanup-keyops] cutoff=${r.cutoffIso}`);
console.log(`[cleanup-keyops] candidates=${r.files.length}`);
for (const f of r.files) console.log('  -', f);
if (apply) {
  console.log(`[cleanup-keyops] removed=${r.removed}`);
} else {
  console.log('[cleanup-keyops] dry-run：未删除任何文件。带 --apply 执行真删。');
}
process.exit(0);
