/**
 * 健澜科技 jlmedaios - 病历修改痕迹与版本历史路由
 *
 * v5.0试点扩展（M190病历版本）：电子病历 5 级硬要求——所有病历修改有完整痕迹记录。
 * GET /api/v1/emr/notes/:noteId/versions
 * DEMO_MODE 下短路返回 5 条版本记录（内存种子，不连 PostgreSQL）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { listNoteVersions, type NoteVersion } from '../aggregators/emrVersionAggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/**
 * GET /api/v1/emr/notes/:noteId/versions
 * 返回指定病历的版本修改痕迹列表（版本号升序）。
 */
async function handleNoteVersions(c: Ctx): Promise<Response> {
  const noteId = c.params?.noteId ?? c.params?.id ?? 'demo-note-001';

  // v5.0试点扩展（M190病历版本）：DEMO_MODE 短路，直接返回内存种子版本列表
  if (isDemo) {
    const versions = listNoteVersions(noteId);
    return json(
      ok({
        noteId,
        versions: versions as NoteVersion[],
        totalVersions: versions.length,
        latestVersion: versions.length === 0 ? 0 : versions[versions.length - 1].version,
      }),
    );
  }

  // 非 DEMO：后续接 PostgreSQL emr_note_version 表；当前先返回空列表占位
  const versions = listNoteVersions(noteId);
  return json(
    ok({
      noteId,
      versions: versions as NoteVersion[],
      totalVersions: versions.length,
      latestVersion: versions.length === 0 ? 0 : versions[versions.length - 1].version,
    }),
  );
}

export const emrVersionRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emr/notes/:noteId/versions',
    handle: handleNoteVersions,
    // DEMO 演示环境不强制鉴权；生产环境由上游网关统一鉴权
    auth: false,
  },
];
