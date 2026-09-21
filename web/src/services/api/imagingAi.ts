/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR AI 辅诊 API（契约 §4）：
 *  - GET  /imaging/ai/catalog          静态目录（18 器官 / 146 发现骨架）
 *  - POST /imaging/ai/jobs             提交辅诊任务
 *  - GET  /imaging/ai/jobs/:id          查询任务状态 + result（轮询/SSE）
 *  - POST /imaging/ai/jobs/:id/review   医师复核签名（权限码 imaging:ai:review）
 * 降级策略（契约 §4）：推理服务不可用时，catalog 与 job 结果回退到内置确定性数据，
 * 保证前端不白屏；submitReview 失败则向上抛出由界面提示。
 */
import {
  buildCatalog,
  buildDemoResult,
} from '@/mock/imagingAi';
import { delay, uid } from '@/mock/utils';
import type {
  RadarCatalog,
  RadarJob,
  RadarJobCreated,
  RadarResult,
  RadarReviewReceipt,
  RadarReviewRequest,
} from '@/types/imagingAi';
import { env } from '@/utils/config';

import { get, post } from '../request';

/** 拉取静态目录；失败/离线时回退内置目录（契约 §4：不白屏） */
export async function fetchRadarCatalog(): Promise<RadarCatalog> {
  if (env.mockEnabled) {
    await delay(120, 260);
    return buildCatalog();
  }
  try {
    return await get<RadarCatalog>('/imaging/ai/catalog', undefined, { silent: true });
  } catch {
    return buildCatalog();
  }
}

/** 提交辅诊任务（契约 §3.4） */
export async function createRadarJob(params: {
  study_uid?: string;
  source?: 'pacs' | 'upload' | 'demo';
  file_ref?: string;
}): Promise<RadarJobCreated> {
  const studyUid = params.study_uid ?? `STUDY-DEMO-${Date.now().toString(36).toUpperCase()}`;
  if (env.mockEnabled) {
    await delay(150, 300);
    return { job_id: `job_demo_${Date.now().toString(36)}`, status: 'completed', mode: 'demo' };
  }
  return post<RadarJobCreated>('/imaging/ai/jobs', {
    study_uid: studyUid,
    source: params.source ?? 'demo',
    file_ref: params.file_ref,
  });
}

/** 查询单次任务；失败/离线时回退内置确定性 demo 结果（契约 §4 mock 同源数值） */
export async function fetchRadarJob(jobId: string, studyUid: string): Promise<RadarJob> {
  if (env.mockEnabled) {
    await delay(120, 240);
    return {
      job_id: jobId,
      status: 'completed',
      progress: 1,
      mode: 'demo',
      study_uid: studyUid,
      error: null,
      result: buildDemoResult(studyUid, 'demo'),
    };
  }
  try {
    return await get<RadarJob>(`/imaging/ai/jobs/${jobId}`, undefined, { silent: true });
  } catch {
    return {
      job_id: jobId,
      status: 'completed',
      progress: 1,
      mode: 'demo',
      study_uid: studyUid,
      error: null,
      result: buildDemoResult(studyUid, 'demo'),
    };
  }
}

export interface PollOptions {
  signal?: AbortSignal;
  intervalMs?: number;
  timeoutMs?: number;
  onTick?: (job: RadarJob) => void;
}

/**
 * 轮询任务直到 completed / failed（契约 §3.5）。
 * demo 同步完成场景下首次即返回 completed，不会进入轮询循环。
 */
export async function pollRadarJob(
  jobId: string,
  studyUid: string,
  opts: PollOptions = {},
): Promise<RadarJob> {
  const intervalMs = opts.intervalMs ?? 1200;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const deadline = Date.now() + timeoutMs;

  let job = await fetchRadarJob(jobId, studyUid);
  opts.onTick?.(job);
  if (job.status === 'completed' || job.status === 'failed') return job;

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) {
      return { ...job, status: 'failed', error: { code: 'ABORTED', message: '已取消' } };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
    job = await fetchRadarJob(jobId, studyUid);
    opts.onTick?.(job);
    if (job.status === 'completed' || job.status === 'failed') return job;
  }
  return { ...job, status: 'failed', error: { code: 'TIMEOUT', message: '推理超时' } };
}

/** 提交医师复核签名（契约 §4）。权限码 imaging:ai:review 由后端 RBAC 拦截。 */
export async function submitRadarReview(
  jobId: string,
  body: RadarReviewRequest,
): Promise<RadarReviewReceipt> {
  if (env.mockEnabled) {
    await delay(220, 420);
    return {
      reviewed_at: new Date().toISOString(),
      signer_id: body.signer_id,
      audit_id: `AUD-${uid('')}`,
      verdict: body.verdict,
    };
  }
  return post<RadarReviewReceipt>(`/imaging/ai/jobs/${jobId}/review`, body);
}

/** 便捷：一站式拉取/生成一份完整报告（创建任务→轮询→返回 result） */
export async function runRadarReport(
  studyUid: string,
  opts: PollOptions = {},
): Promise<{ job: RadarJob; result: RadarResult }> {
  const created = await createRadarJob({ study_uid: studyUid, source: 'demo' });
  const job = await pollRadarJob(created.job_id, studyUid, opts);
  if (job.status === 'failed' || !job.result) {
    // 最后兜底：仍返回内置 demo 结果，界面渲染降级态而非白屏
    return { job, result: buildDemoResult(studyUid, 'demo') };
  }
  return { job, result: job.result };
}
