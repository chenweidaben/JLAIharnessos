/**
 * 健澜科技 jlmedaios - M585 新标准 P10：互联互通测评准备 3 端点
 *
 * GET  /api/v1/interop-checklist              全部条目（按 category 分组）
 * GET  /api/v1/interop-checklist/:itemId     单条详情（404 not found）
 * POST /api/v1/interop-checklist/:itemId/update  更新自评（status=passed 但 evidenceUrl 空 → 400 passed_requires_evidence）
 *
 * 种子 20 项：infrastructure / data_quality / security / interoperability 各 5。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type IcCategory = 'infrastructure' | 'data_quality' | 'security' | 'interoperability';
type IcStatus = 'not_started' | 'in_progress' | 'passed' | 'failed';

interface IcRecord {
  itemId: string;
  category: IcCategory;
  itemName: string;
  requirement: string;
  status: IcStatus;
  evidenceUrl: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const icStore = new Map<string, IcRecord>();
let icSeq = 0;

function addIc(r: Omit<IcRecord, 'itemId'>): IcRecord {
  icSeq += 1;
  const rec: IcRecord = { ...r, itemId: `IC-${String(icSeq).padStart(3, '0')}` };
  icStore.set(rec.itemId, rec);
  return rec;
}

function seedIc(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  const categories: Array<{ cat: IcCategory; items: Array<[string, string, IcStatus]> }> = [
    {
      cat: 'infrastructure',
      items: [
        ['服务器双活部署', '核心业务系统双机热备', 'passed'],
        ['存储扩容至 100TB', '数据存储满足 5 年留存', 'in_progress'],
        ['核心网络冗余', '核心交换双链路', 'passed'],
        ['灾备中心建设', '异地灾备 RPO<1h', 'not_started'],
        ['终端安全管控', '全院终端准入', 'failed'],
      ],
    },
    {
      cat: 'data_quality',
      items: [
        ['主索引 EMPI 落地', '全院患者主索引统一', 'passed'],
        ['字典映射覆盖率', '国家码表映射率>95%', 'in_progress'],
        ['病历内涵质控', '甲级病案率>90%', 'passed'],
        ['检验结果互认', '区域检验互认', 'not_started'],
        ['数据完整性校验', '关键非空字段>99%', 'passed'],
      ],
    },
    {
      cat: 'security',
      items: [
        ['等保三级备案', '通过等保三级测评', 'passed'],
        ['数据加密存储', '敏感字段 AES-256', 'in_progress'],
        ['访问审计全量', '所有操作留痕', 'passed'],
        ['终端防病毒', '全院终端统一 EDR', 'passed'],
        ['应急预案演练', '年度演练≥2 次', 'not_started'],
      ],
    },
    {
      cat: 'interoperability',
      items: [
        ['FHIR R4 接口', '核心资源 FHIR 化', 'in_progress'],
        ['区域平台上报', '卫健委标准数据集', 'in_progress'],
        ['影像云 PACS', '云影像调阅', 'passed'],
        ['检验报告互认', '区域 LIS 互通', 'not_started'],
        ['电子病历 6 级', '通过电子病历应用水平评价 6 级', 'in_progress'],
      ],
    },
  ];

  for (const c of categories) {
    for (const [name, req, st] of c.items) {
      addIc({
        category: c.cat,
        itemName: name,
        requirement: req,
        status: st,
        evidenceUrl: st === 'passed' ? `https://evidence.example.com/${icSeq + 1}.pdf` : null,
        updatedBy: st === 'passed' ? 'DOC-QUALITY' : null,
        updatedAt: st === 'passed' ? iso(60 * 24 * 5) : null,
        createdAt: iso(60 * 24 * 10),
      });
    }
  }
}
seedIc();

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` },
      ],
    },
    404,
  );
}

const VALID_STATUSES: IcStatus[] = ['not_started', 'in_progress', 'passed', 'failed'];

// ============================== 1. GET /api/v1/interop-checklist ==============================

async function handleIcList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rows = Array.from(icStore.values()).sort((a, b) => a.itemId.localeCompare(b.itemId));

  // 按 category 分组
  const groups: Record<string, IcRecord[]> = {};
  for (const r of rows) {
    if (!groups[r.category]) groups[r.category] = [];
    groups[r.category].push(r);
  }

  return json(ok({ items: rows, totalCount: rows.length, byCategory: groups }), 200);
}

// ============================== 2. GET /api/v1/interop-checklist/:itemId ==============================

async function handleIcDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const itemId = (c.params.id ?? '').trim();
  const rec = icStore.get(itemId);
  if (!rec) return notFound('InteropChecklistItem', itemId);
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/interop-checklist/:itemId/update ==============================

async function handleIcUpdate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const itemId = (c.params.id ?? '').trim();
  const rec = icStore.get(itemId);
  if (!rec) return notFound('InteropChecklistItem', itemId);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { status, evidenceUrl, updatedBy } = body as Record<string, unknown>;

  if (
    typeof status !== 'string' || !VALID_STATUSES.includes(status as IcStatus) ||
    typeof updatedBy !== 'string' || !updatedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // passed 必须配 evidenceUrl
  if (status === 'passed' && (typeof evidenceUrl !== 'string' || !evidenceUrl.trim())) {
    return json({ code: 400, message: 'passed_requires_evidence' }, 400);
  }

  rec.status = status as IcStatus;
  rec.evidenceUrl = typeof evidenceUrl === 'string' && evidenceUrl.trim() ? evidenceUrl.trim() : null;
  rec.updatedBy = updatedBy.trim();
  rec.updatedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m585Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/interop-checklist', handle: handleIcList, auth: true },
  { method: 'GET', path: '/api/v1/interop-checklist/:id', handle: handleIcDetail, auth: true },
  { method: 'POST', path: '/api/v1/interop-checklist/:id/update', handle: handleIcUpdate, auth: true },
];
