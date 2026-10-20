/**
 * 健澜科技 jlmedaios - 病历修改痕迹接口
 *
 * 提供病历版本历史查询，用于病历质控/合规审计。
 * DEMO_MODE 下返回 3 个版本 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/emr/notes/:id/versions
 * 返回病历修改历史版本
 */
async function handleNoteVersions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const noteId = c.params?.id ?? 'note-001';

  const versions = [
    {
      version: 1,
      modifiedBy: '李医生',
      modifiedAt: '2026-10-19T09:00:00Z',
      changeSummary: '初稿',
      diff: '【入院记录初稿】患者因"胸闷3天"入院。',
    },
    {
      version: 2,
      modifiedBy: '李医生',
      modifiedAt: '2026-10-19T10:00:00Z',
      changeSummary: '补充现病史',
      diff: '+现病史：患者3天前无明显诱因出现胸闷，呈阵发性，每次持续约5分钟，休息后可缓解。',
    },
    {
      version: 3,
      modifiedBy: '王主任',
      modifiedAt: '2026-10-19T11:00:00Z',
      changeSummary: '修正诊断',
      diff: '-诊断：待查\n+诊断：冠心病（稳定型心绞痛）',
    },
  ];

  const result = {
    noteId,
    versions,
    totalVersions: versions.length,
    latestVersion: versions.length,
  };

  return json(ok(result));
}

export const emrNoteRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/emr/notes/:id/versions',
    handle: handleNoteVersions,
    auth: true,
  },
];
