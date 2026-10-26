/**
 * 健澜科技 jlmedaios - M610 病历版本链受控接口
 *
 * GET  /api/v1/emr/record-version-chain        病历版本链完整性校验 + 版本清单（剥离正文）
 * POST /api/v1/emr/record-version-chain/revise 受控追加修订（append-only，禁止物理覆盖）
 *
 * 领域守卫：../../medical-tools/emr/RecordVersionChain。
 * 当前为内存种子态（DEMO_MODE 不连 PostgreSQL）；生产化替换点：仓储层按 recordId 读取版本链、
 * 写入走 DB append-only 触发器与 WORM 存储，接口契约保持不变。
 *
 * 权限：emr:version-chain:read（查看）/ emr:record:revise（修订）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildCreateVersion,
  buildRevisionVersion,
  verifyVersionChain,
  RecordIntegrityCode,
  RecordIntegrityError,
  type RecordVersion,
} from '../../medical-tools/emr/RecordVersionChain.js';

/* ==================== 内存种子链（生产化替换为仓储读取） ==================== */

const SEED_RECORD_ID = 'EMR-MRN-100451';

/** 模块级内存链：recordId -> 版本数组（按版本号升序） */
const chainStore = new Map<string, RecordVersion[]>();

function seedChain(): RecordVersion[] {
  const v1 = buildCreateVersion(SEED_RECORD_ID, {
    editorId: 'D001',
    editorName: '赵医生',
    content: '患者因胸闷 3 天入院。现病史：3 天前无明显诱因出现胸闷，活动后加重，伴心悸，无胸痛放射。既往高血压病史 5 年，规律服药。',
    changeSummary: '首次入院记录',
    editedAt: '2026-10-20T08:00:00.000Z',
  });
  const v2 = buildRevisionVersion(v1, {
    editorId: 'D002',
    editorName: '李医生',
    content: '患者因胸闷 3 天入院。现病史：3 天前无明显诱因出现胸闷，活动后加重，伴心悸，无胸痛放射。既往高血压病史 5 年，规律服药。补充：入院当日测血压 156/96 mmHg，心率 88 次/分。',
    changeSummary: '补充现病史与入院生命体征',
    editedAt: '2026-10-20T10:30:00.000Z',
  });
  const v3 = buildRevisionVersion(v2, {
    editorId: 'D001',
    editorName: '赵医生',
    content: '患者因胸闷 3 天入院。现病史：3 天前无明显诱因出现胸闷，活动后加重，伴心悸，无胸痛放射。既往高血压病史 5 年，规律服药。入院当日测血压 156/96 mmHg，心率 88 次/分。上级医师查房：结合心电图与心肌酶谱，考虑不稳定型心绞痛待排，建议完善冠脉造影，继续抗血小板、调脂、降压治疗。',
    changeSummary: '上级医师查房记录，诊疗计划更新',
    editedAt: '2026-10-20T14:20:00.000Z',
  });
  return [v1, v2, v3];
}

function getChain(recordId: string): RecordVersion[] {
  if (!chainStore.has(recordId)) {
    if (recordId === SEED_RECORD_ID) {
      chainStore.set(recordId, seedChain());
    } else {
      chainStore.set(recordId, []);
    }
  }
  return chainStore.get(recordId)!;
}

/** 出参视图：剥离正文，仅回传版本元数据、指纹与摘要，避免病历正文经列表接口外泄 */
function toVersionView(v: RecordVersion) {
  return {
    versionId: v.versionId,
    recordId: v.recordId,
    versionNo: v.versionNo,
    prevVersionId: v.prevVersionId,
    contentHash: v.contentHash,
    contentSummary: v.contentSummary,
    editorId: v.editorId,
    editorName: v.editorName,
    editedAt: v.editedAt,
    action: v.action,
    changeSummary: v.changeSummary,
    status: v.status,
    signature: v.signature,
  };
}

/** 领域错误码 → HTTP 状态码与 BFF 错误码映射 */
function mapIntegrityError(c: Ctx, err: RecordIntegrityError): Response {
  let status = 409;
  let code = ErrorCode.CONFLICT;
  switch (err.code) {
    case RecordIntegrityCode.EMPTY_CONTENT:
      status = 400;
      code = ErrorCode.BAD_REQUEST;
      break;
    case RecordIntegrityCode.UNKNOWN_VERSION:
      status = 404;
      code = ErrorCode.NOT_FOUND;
      break;
    case RecordIntegrityCode.EDIT_LOCKED:
    case RecordIntegrityCode.SIGNED_FINAL:
    case RecordIntegrityCode.PHYSICAL_OVERWRITE:
    case RecordIntegrityCode.VERSION_OUT_OF_ORDER:
    case RecordIntegrityCode.CHAIN_BROKEN:
    case RecordIntegrityCode.HASH_MISMATCH:
      status = 409;
      code = ErrorCode.CONFLICT;
      break;
  }
  return json(fail(code, err.message, c.traceId), status);
}

/* ==================== 路由处理 ==================== */

/** GET /api/v1/emr/record-version-chain?recordId= 版本链完整性校验与清单 */
async function handleChainInspect(c: Ctx): Promise<Response> {
  const denied = requirePermissionCode(c, 'emr:version-chain:read');
  if (denied) return denied;

  const recordId = (c.query.get('recordId') ?? SEED_RECORD_ID).trim();
  const chain = getChain(recordId);
  const result = verifyVersionChain(chain);

  return json(
    ok({
      recordId,
      chain: result,
      versions: chain.map(toVersionView),
      totalCount: chain.length,
    }),
  );
}

/** POST /api/v1/emr/record-version-chain/revise 受控追加修订（append-only） */
async function handleChainRevise(c: Ctx): Promise<Response> {
  const denied = requirePermissionCode(c, 'emr:record:revise');
  if (denied) return denied;

  const body = (await c.body()) as { recordId?: string; content?: string; changeSummary?: string };
  const recordId = (body.recordId ?? '').trim();
  const content = (body.content ?? '').trim();
  const changeSummary = (body.changeSummary ?? '').trim();

  if (!recordId) {
    return json(fail(ErrorCode.BAD_REQUEST, '病历号 recordId 不能为空'), 400);
  }

  const chain = getChain(recordId);
  const operator = c.user ?? { id: 'system', name: '系统' };

  try {
    let latest: RecordVersion;
    if (chain.length === 0) {
      latest = buildCreateVersion(recordId, {
        editorId: operator.id,
        editorName: operator.name,
        content,
        changeSummary: changeSummary || '首次建档',
      });
      chain.push(latest);
    } else {
      latest = chain[chain.length - 1];
      const next = buildRevisionVersion(latest, {
        editorId: operator.id,
        editorName: operator.name,
        content,
        changeSummary,
      });
      chain.push(next);
      latest = next;
    }

    const result = verifyVersionChain(chain);
    return json(
      ok({
        recordId,
        appended: toVersionView(latest),
        chain: result,
        totalCount: chain.length,
      }),
    );
  } catch (err) {
    if (err instanceof RecordIntegrityError) return mapIntegrityError(c, err);
    return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '修订失败'), 500);
  }
}

export const m610Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/record-version-chain', handle: handleChainInspect, auth: true },
  { method: 'POST', path: '/api/v1/emr/record-version-chain/revise', handle: handleChainRevise, auth: true },
];
