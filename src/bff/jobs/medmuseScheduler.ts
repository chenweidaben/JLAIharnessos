/**
 * 健澜科技 jlmedaios - MEDMUSE 定时任务调度器
 *
 * 三个每日固定时点任务（服务器本地时区）：
 *  - 07:00 晨间交班：对全体在院住院医师逐人生成交班报告（复用 roundReportService
 *    既有查房聚合），产出结构化文本；无真实通知渠道，console.info + 内存 lastRun；
 *  - 14:00 合理用药扫描：对当前在院医嘱批量跑 drugReviewAggregator 规则引擎，
 *    critical 级问题逐条 console.error 写日志（CDS 提醒，不拦截、不改医嘱）；
 *  - 20:00 晚间待办：汇总当日未审批工单（clinical.medmuse_approvals pending）
 *    与未闭环质控 error issue（clinical.terminal_qc 当日记录）。
 *
 * 实现约束：不引任何新依赖、不用 node-cron —— 纯 setTimeout 链式驱动：
 * 启动时算出下一个 7:00/14:00/20:00 中最近一个的毫秒数，触发后再排下一次。
 *
 * 医疗安全：三个任务全部为只读聚合，任一 repo/DB 查询失败均安全降级（跳过对应
 * 医生/就诊/条目），绝不抛错、不臆造数据；DEMO_MODE 下默认不启动并日志说明。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../../db/pool.js';
import type { TerminalQcIssue } from '../../db/repositories/terminalQcRepo.js';
import { generateRoundReport } from '../agents/roundReportService';
import { listApprovals } from '../agents/medmuseRepo';
import {
  loadActiveOrders,
  scanOrders,
} from '../aggregators/drugReviewAggregator';
import type { AuthView } from '../view/userView.js';

// ---------------------------------------------------------------------------
// 纯函数：下一次触发时间计算（可单测，无 I/O）
// ---------------------------------------------------------------------------

/**
 * 计算从 now 到下一个本地时 hour:00:00.000 的毫秒数。
 * 若今天 hour:00 已过（含整点本身不重复触发），则取明天同一时刻；
 * 返回值恒为 (0, 24h]。
 */
export function msUntilNextAt(now: Date, hour: number): number {
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

// ---------------------------------------------------------------------------
// 任务定义
// ---------------------------------------------------------------------------

export type MedmuseJobName = 'morningShift' | 'drugReviewScan' | 'eveningTodos';

export interface MedmuseJobRun {
  job: MedmuseJobName;
  at: string;
  /** 结构化摘要文本（console 输出与通知渠道复用同一份） */
  summary: string;
}

interface JobDef {
  hour: number;
  name: MedmuseJobName;
  label: string;
  run: () => Promise<string>;
}

/** 最近一次运行记录（内存，无持久化；服务重启即清空） */
const lastRuns: Partial<Record<MedmuseJobName, MedmuseJobRun>> = {};

export function getLastRuns(): Readonly<Partial<Record<MedmuseJobName, MedmuseJobRun>>> {
  return lastRuns;
}

// ---------------------------------------------------------------------------
// 数据装载（全部 best-effort，失败返回空表/空串，绝不抛错）
// ---------------------------------------------------------------------------

function db(): Sql {
  return getDb();
}

/** 当前在院（ongoing）住院就诊 ID 列表；查询失败返回空表 */
async function listOngoingInpatientVisitIds(): Promise<string[]> {
  try {
    const rows = await db()<Array<{ id: string }>>`
      SELECT id FROM clinical.visits
      WHERE status = 'ongoing' AND visit_type = 'inpatient'
    `;
    return rows.map((r) => String(r.id));
  } catch {
    return [];
  }
}

/** 当前有在院住院患者的医师 ID 去重列表；查询失败返回空表 */
async function listOngoingDoctorIds(): Promise<string[]> {
  try {
    const rows = await db()<Array<{ attending_doctor_id: string }>>`
      SELECT DISTINCT attending_doctor_id FROM clinical.visits
      WHERE status = 'ongoing' AND visit_type = 'inpatient'
        AND attending_doctor_id IS NOT NULL
    `;
    return [...new Set(rows.map((r) => String(r.attending_doctor_id)))];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 07:00 晨间交班
// ---------------------------------------------------------------------------

async function runMorningShift(): Promise<string> {
  const doctors = await listOngoingDoctorIds();
  const lines: string[] = [];
  let ok = 0;
  let failed = 0;

  for (const doctorId of doctors) {
    try {
      const report = await generateRoundReport(doctorId);
      ok += 1;
      lines.push(`- [${doctorId}] 在管 ${report.patientCount} 人：${report.summary}`);
    } catch {
      // 单医生生成失败不影响其他人
      failed += 1;
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const head =
    `晨间交班报告（${date}）：覆盖在院医师 ${ok}/${doctors.length} 人` +
    (failed > 0 ? `，${failed} 人生成失败已跳过` : '');
  return lines.length > 0 ? `${head}\n${lines.join('\n')}` : head;
}

// ---------------------------------------------------------------------------
// 14:00 合理用药扫描
// ---------------------------------------------------------------------------

async function runDrugReviewScan(): Promise<string> {
  const visitIds = await listOngoingInpatientVisitIds();
  let scannedOrders = 0;
  let criticalCount = 0;
  const criticalLines: string[] = [];

  for (const visitId of visitIds) {
    try {
      // loadActiveOrders 的 view 参数内部未使用（医嘱装载与权限无关），传空占位
      const orders = await loadActiveOrders({} as AuthView, visitId);
      scannedOrders += orders.length;
      const issues = scanOrders(orders);
      for (const issue of issues) {
        if (issue.level === 'critical') {
          criticalCount += 1;
          criticalLines.push(
            `[${visitId}] ${issue.category}：${issue.drug} — ${issue.suggestion}`,
          );
        }
      }
    } catch {
      // 单就诊装载失败按空表降级，继续下一个
    }
  }

  // critical 级逐条写 error 日志（等真实通知渠道接入后复用同一份文本）
  for (const line of criticalLines) {
    // eslint-disable-next-line no-console
    console.error(`[medmuse-job:drug-review][CRITICAL] ${line}`);
  }

  return (
    `合理用药扫描：在院就诊 ${visitIds.length} 个、在院药品医嘱 ${scannedOrders} 条，` +
    `critical 配伍/联用禁忌 ${criticalCount} 条已写日志`
  );
}

// ---------------------------------------------------------------------------
// 20:00 晚间待办
// ---------------------------------------------------------------------------

async function runEveningTodos(): Promise<string> {
  // 未审批工单
  let pendingApprovals = 0;
  try {
    const rows = await listApprovals({ status: 'pending', limit: 100 });
    pendingApprovals = rows.length;
  } catch {
    pendingApprovals = 0;
  }

  // 当日未闭环质控 error issue
  let qcErrorCount = 0;
  let qcRecordCount = 0;
  try {
    const rows = await db()<Array<{ issues: TerminalQcIssue[] }>>`
      SELECT issues FROM clinical.terminal_qc
      WHERE created_at >= current_date
    `;
    qcRecordCount = rows.length;
    for (const row of rows) {
      for (const issue of row.issues ?? []) {
        if (issue.severity === 'error') qcErrorCount += 1;
      }
    }
  } catch {
    qcRecordCount = 0;
  }

  return (
    `晚间待办汇总：未审批工单 ${pendingApprovals} 条；` +
    `当日终末质控记录 ${qcRecordCount} 份，未闭环 error issue ${qcErrorCount} 条`
  );
}

// ---------------------------------------------------------------------------
// 调度主循环
// ---------------------------------------------------------------------------

const JOBS: JobDef[] = [
  { hour: 7, name: 'morningShift', label: '晨间交班', run: runMorningShift },
  { hour: 14, name: 'drugReviewScan', label: '合理用药扫描', run: runDrugReviewScan },
  { hour: 20, name: 'eveningTodos', label: '晚间待办', run: runEveningTodos },
];

let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** 选出距 now 最近的一个触发时点对应的任务 */
function pickNextJob(now: Date): { def: JobDef; delayMs: number } {
  let best: { def: JobDef; delayMs: number } | null = null;
  for (const def of JOBS) {
    const delayMs = msUntilNextAt(now, def.hour);
    if (!best || delayMs < best.delayMs) best = { def, delayMs };
  }
  return best as { def: JobDef; delayMs: number };
}

function scheduleNext(): void {
  const { def, delayMs } = pickNextJob(new Date());
  timer = setTimeout(() => {
    timer = null;
    // 先排下一轮，再跑任务：任务耗时（DB 扫描）不挤占下一触发点
    scheduleNext();
    void runJob(def);
  }, delayMs);
  // eslint-disable-next-line no-console
  console.info(
    `[medmuse-job] 已排定「${def.label}」任务（${def.hour}:00），将于 ${Math.round(delayMs / 60000)} 分钟后触发`,
  );
}

async function runJob(def: JobDef): Promise<void> {
  const at = new Date().toISOString();
  try {
    const summary = await def.run();
    lastRuns[def.name] = { job: def.name, at, summary };
    // eslint-disable-next-line no-console
    console.info(`[medmuse-job:${def.name}] ${summary}`);
  } catch (err) {
    // 任务级兜底：任何未预期异常都不允许冒泡打断调度循环
    // eslint-disable-next-line no-console
    console.error(`[medmuse-job:${def.name}] 执行异常：`, err);
  }
}

/**
 * 启动 MEDMUSE 定时任务（幂等）。
 * DEMO_MODE 下默认不启动，仅日志说明（演示模式无 DB，任务会全部空跑）。
 */
export function startMedmuseScheduler(): void {
  if (started) return;
  started = true;
  if (isDemoMode()) {
    // eslint-disable-next-line no-console
    console.warn('[medmuse-job] DEMO_MODE=1：MEDMUSE 定时任务默认不启动');
    return;
  }
  scheduleNext();
}

/** 停止调度器并清空未触发的定时器 */
export function stopMedmuseScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  started = false;
}
