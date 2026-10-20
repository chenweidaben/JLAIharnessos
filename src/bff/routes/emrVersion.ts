/**
 * 健澜科技 jlmedaios - 病历版本管理深度接口（M417）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function makeItems(kind: string, n = 5) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${kind}-${i + 1}`,
    kind,
    version: `v${i + 1}.0`,
    editor: `医生${i + 1}`,
    time: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    detail: `${kind} 第${i + 1}条（DEMO）`,
  }));
}

export const emrVersionRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/versions', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('version') })) },
  { method: 'GET', path: '/api/v1/emr/version-compare', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('compare') })) },
  { method: 'GET', path: '/api/v1/emr/version-restore', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('restore') })) },
  { method: 'GET', path: '/api/v1/emr/version-diff', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('diff') })) },
  { method: 'GET', path: '/api/v1/emr/version-locks', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('lock') })) },
  { method: 'GET', path: '/api/v1/emr/version-audit', auth: false, handle: async (_c: Ctx): Promise<Response> => json(ok({ items: makeItems('audit') })) },
];