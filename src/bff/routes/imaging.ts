/**
 * 健澜科技数智医院智能体 - BFF 影像 AI（DAMO-RADAR）路由
 *
 * 契约：docs/RADAR_FUSION_CONTRACT.md §4
 *  - GET  /api/v1/imaging/ai/catalog                 静态目录（18 器官/146 发现）
 *  - POST /api/v1/imaging/ai/jobs                     提交分析任务
 *  - GET  /api/v1/imaging/ai/jobs?patient_id=xxx      患者历史 AI 报告列表
 *  - GET  /api/v1/imaging/ai/jobs/:id                任务状态 + result + review
 *  - POST /api/v1/imaging/ai/jobs/:id/review          医师复核签名（写审计留痕）
 *
 * 权限：查看 imaging:view / 提交 imaging:ai:analyze / 审核 imaging:ai:review
 * 危急值：tier=critical 阳性发现经现有 /ws/chat critical:alert 通道推送。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  RadarAdapter,
  type RadarResult,
} from '../../integration/adapters/radar';
import { emitCriticalRadarAlert } from '../alertBus';
import { requirePermissionCode } from '../middleware/auth';
import { IMAGING_PERMISSIONS } from '../permissions';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/* ------------------------------------------------------------------ */
/* 任务持久化（内存为真，尽力持久化到 data/imaging-ai-jobs.json）        */
/* ------------------------------------------------------------------ */

const STORE_FILE = path.resolve(process.cwd(), 'data/imaging-ai-jobs.json');

type JobStatus = 'queued' | 'running' | 'completed' | 'failed';
type ReviewVerdict = 'approve' | 'modify' | 'reject';

interface ImagingAiReview {
  verdict: ReviewVerdict;
  comment?: string;
  report_text?: string;
  signer_id: string;
  signer_name: string;
  ca_signature?: string;
  reviewed_at: string;
  audit_id: string;
}

interface ImagingAiJobRecord {
  job_id: string;
  patient_id: string | null;
  study_uid: string;
  source: string;
  file_ref: string | null;
  status: JobStatus;
  mode: 'demo' | 'production';
  progress: number;
  created_at: string;
  updated_at: string;
  result: RadarResult | null;
  error: { code: string; message: string } | null;
  review: ImagingAiReview | null;
  alertEmitted: boolean;
}

const jobs = new Map<string, ImagingAiJobRecord>();
let storeLoaded = false;

function loadStore(): void {
  if (storeLoaded) return;
  storeLoaded = true;
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const arr = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')) as ImagingAiJobRecord[];
    for (const rec of arr) jobs.set(rec.job_id, rec);
  } catch {
    /* 持久化损坏不影响内存态 */
  }
}

function persist(): void {
  try {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(Array.from(jobs.values()), null, 2), 'utf-8');
  } catch {
    /* 持久化失败不阻断主流程 */
  }
}

function newJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function newAuditId(): string {
  return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 单例适配器（真实上游 + 失败自动降级） */
const radar = new RadarAdapter();

/** critical 阳性发现 → 复用现有 critical:alert 通道推送危急值 */
function maybeEmitCritical(rec: ImagingAiJobRecord): void {
  if (rec.alertEmitted || !rec.result) return;
  const { critical_count, critical_findings } = rec.result.summary;
  if (!critical_count || critical_count <= 0) return;
  rec.alertEmitted = true;
  emitCriticalRadarAlert({
    id: `al_radar_${rec.job_id}`,
    type: 'critical-value',
    level: 'critical',
    title: `影像 AI 危急值：${rec.result.model}`,
    content:
      `Study ${rec.study_uid} 检测到 ${critical_count} 项 critical 发现（${critical_findings.join('、')}），` +
      `请立即按危急值流程复核并安排放射科医师签名确认。`,
    patientId: rec.patient_id ?? undefined,
    patientName: rec.patient_id ? `患者 ${rec.patient_id}` : undefined,
    studyUid: rec.study_uid,
    jobId: rec.job_id,
    findings: critical_findings,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  });
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const imagingRoutes: RouteDef[] = [
  // GET /api/v1/imaging/ai/catalog
  {
    method: 'GET',
    path: '/api/v1/imaging/ai/catalog',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, IMAGING_PERMISSIONS.VIEW);
      if (denied) return denied;
      const { catalog, degraded } = await radar.getCatalog();
      return json(ok({ ...catalog, degraded }));
    },
  },

  // POST /api/v1/imaging/ai/jobs
  {
    method: 'POST',
    path: '/api/v1/imaging/ai/jobs',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, IMAGING_PERMISSIONS.ANALYZE);
      if (denied) return denied;
      loadStore();

      const body = await c.body<{
        study_uid?: string;
        source?: 'pacs' | 'upload' | 'demo';
        file_ref?: string;
        patient_id?: string;
      }>();

      const jobId = newJobId();
      const now = new Date().toISOString();
      const record: ImagingAiJobRecord = {
        job_id: jobId,
        patient_id: body.patient_id ?? null,
        study_uid: body.study_uid ?? `STUDY_${jobId}`,
        source: body.source ?? 'demo',
        file_ref: body.file_ref ?? null,
        status: 'queued',
        mode: 'demo',
        progress: 0,
        created_at: now,
        updated_at: now,
        result: null,
        error: null,
        review: null,
        alertEmitted: false,
      };

      const { job, degraded, localResult } = await radar.submitJob({
        study_uid: record.study_uid,
        source: record.source as 'pacs' | 'upload' | 'demo',
        file_ref: record.file_ref ?? undefined,
      });

      record.mode = job.mode;
      record.status = job.status;
      record.progress = job.status === 'completed' ? 1 : 0;
      // 上游或本地降级返回的同步结果
      if (localResult) {
        record.result = localResult;
        record.progress = 1;
      }
      record.updated_at = new Date().toISOString();
      jobs.set(record.job_id, record);
      maybeEmitCritical(record);
      persist();

      return json(ok({ job_id: record.job_id, status: record.status, mode: record.mode, degraded }));
    },
  },

  // GET /api/v1/imaging/ai/jobs?patient_id=xxx
  {
    method: 'GET',
    path: '/api/v1/imaging/ai/jobs',
    auth: true,
    handle: (c: Ctx) => {
      const denied = requirePermissionCode(c, IMAGING_PERMISSIONS.VIEW);
      if (denied) return denied;
      loadStore();

      const patientId = c.query.get('patient_id');
      const all = Array.from(jobs.values());
      const list = (patientId ? all.filter((j) => j.patient_id === patientId) : all)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((j) => ({
          job_id: j.job_id,
          patient_id: j.patient_id,
          study_uid: j.study_uid,
          status: j.status,
          mode: j.mode,
          created_at: j.created_at,
          reviewed: j.review !== null,
          summary: j.result?.summary ?? null,
        }));
      return json(ok({ total: list.length, items: list }));
    },
  },

  // GET /api/v1/imaging/ai/jobs/:id
  {
    method: 'GET',
    path: '/api/v1/imaging/ai/jobs/:id',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, IMAGING_PERMISSIONS.VIEW);
      if (denied) return denied;
      loadStore();

      const rec = jobs.get(c.params.id);
      if (!rec) {
        return json(fail(ErrorCode.NOT_FOUND, `影像 AI 任务不存在: ${c.params.id}`, c.traceId), 404);
      }

      // 生产态上游任务且本地尚无结果 → 向上游拉取一次（失败由适配器降级）
      if (!rec.result && rec.mode === 'production' && rec.status !== 'completed') {
        const { state, degraded } = await radar.getJob(rec.job_id, rec.study_uid);
        rec.status = state.status;
        rec.progress = state.progress;
        rec.error = state.error;
        if (state.result) {
          rec.result = state.result;
          rec.mode = degraded ? 'demo' : rec.mode;
          rec.progress = 1;
        }
        rec.updated_at = new Date().toISOString();
        jobs.set(rec.job_id, rec);
        maybeEmitCritical(rec);
        persist();
      }

      return json(
        ok({
          job_id: rec.job_id,
          patient_id: rec.patient_id,
          study_uid: rec.study_uid,
          status: rec.status,
          mode: rec.mode,
          progress: rec.progress,
          created_at: rec.created_at,
          updated_at: rec.updated_at,
          error: rec.error,
          result: rec.result,
          review: rec.review,
          model: rec.result?.model ?? null,
          model_version: rec.result?.model_version ?? null,
          disclaimer: rec.result?.disclaimer ?? null,
        }),
      );
    },
  },

  // POST /api/v1/imaging/ai/jobs/:id/review
  {
    method: 'POST',
    path: '/api/v1/imaging/ai/jobs/:id/review',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, IMAGING_PERMISSIONS.REVIEW);
      if (denied) return denied;
      loadStore();

      const rec = jobs.get(c.params.id);
      if (!rec) {
        return json(fail(ErrorCode.NOT_FOUND, `影像 AI 任务不存在: ${c.params.id}`, c.traceId), 404);
      }

      const parsed = await c.body<{
        verdict?: string;
        comment?: string;
        report_text?: string;
        signer_id?: string;
        signer_name?: string;
        ca_signature?: string;
      }>();

      const allowed: ReviewVerdict[] = ['approve', 'modify', 'reject'];
      if (!parsed.verdict || !allowed.includes(parsed.verdict as ReviewVerdict)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'verdict 必须为 approve/modify/reject', c.traceId), 400);
      }
      if (!parsed.signer_id || !parsed.signer_name) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 signer_id / signer_name', c.traceId), 400);
      }
      // 禁止重复签名
      if (rec.review) {
        return json(
          fail(ErrorCode.BAD_REQUEST, `任务已由 ${rec.review.signer_name} 复核，禁止重复提交`, c.traceId),
          409,
        );
      }

      const reviewed_at = new Date().toISOString();
      const review: ImagingAiReview = {
        verdict: parsed.verdict as ReviewVerdict,
        comment: parsed.comment,
        report_text: parsed.report_text,
        signer_id: parsed.signer_id,
        signer_name: parsed.signer_name,
        ca_signature: parsed.ca_signature,
        reviewed_at,
        audit_id: newAuditId(),
      };
      rec.review = review;
      rec.updated_at = reviewed_at;
      jobs.set(rec.job_id, rec);
      persist();

      return json(
        ok(
          {
            reviewed_at,
            signer_id: review.signer_id,
            audit_id: review.audit_id,
            verdict: review.verdict,
          },
          '复核签名已留痕',
        ),
      );
    },
  },
];
