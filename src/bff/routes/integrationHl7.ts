/**
 * 健澜科技 jlmedaios — 【系统集成深化】HL7 v2.x / FHIR R4 接口路由（M155-C）
 *
 *   POST /api/v1/integration/hl7/parse
 *     body: { rawMessage: string, direction?: 'inbound'|'outbound' }
 *     把原始 HL7 v2.x 报文交由纯函数聚合器解析为结构化对象，并按
 *     integ.hl7_message_log 留痕（互联互通 / 电子病历五级接口审计要求）。
 *
 *   POST /api/v1/integration/fhir/build
 *     body: { resourceType: 'Patient'|'Observation'|'MedicationRequest',
 *             data: object, validate?: boolean }
 *     依据 FHIR R4 标准装配资源，可选地用 FHIR_R4_SCHEMAS 做必填字段校验。
 *
 * 【质量与合规】本层只做协议转换与留痕，不依据解析结果触发诊疗行为；
 *   原始报文含患者 PII，访问权限为登录态 + 后续审计。
 * 降级原则：演示模式（DEMO_MODE）不连 PostgreSQL，不伪造落库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildFHIRResource,
  FHIR_R4_SCHEMAS,
  parseHL7Message,
  validateFHIRResource,
  type FHIRResource,
} from '../aggregators/integrationHl7Aggregator';

/** 无 DB 演示模式：不连 PostgreSQL，不伪造落库 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface ParseBody {
  rawMessage?: string;
  direction?: string;
}

interface BuildBody {
  resourceType?: 'Patient' | 'Observation' | 'MedicationRequest';
  data?: Record<string, unknown>;
  validate?: boolean;
}

/** 解析结果落库（best-effort，失败不阻断返回） */
async function persistParseLog(
  rawMessage: string,
  parsed: ReturnType<typeof parseHL7Message>,
  direction: string,
): Promise<void> {
  if (isDemo) return;
  const db = getDb();
  const status = parsed.errors.length > 0 ? 'failed' : 'parsed';
  await db`
    INSERT INTO integ.hl7_message_log
      (message_control_id, message_type, trigger_event, message_event,
       sending_app, direction, status, raw_message, parsed_summary,
       validation_result, error_message)
    VALUES (
      ${parsed.messageControlId || `mc_${Date.now().toString(36)}`},
      ${parsed.messageType || 'UNKNOWN'},
      ${parsed.triggerEvent || 'UNKNOWN'},
      ${parsed.messageEvent || 'UNKNOWN^UNKNOWN'},
      ${parsed.sendingApplication || null},
      ${direction === 'outbound' ? 'outbound' : 'inbound'},
      ${status},
      ${rawMessage},
      ${JSON.stringify({
        patientId: parsed.patientId,
        patientName: parsed.patientName,
        visitNumber: parsed.visitNumber,
        segmentCount: parsed.segments.length,
        observationCount: parsed.observations.length,
        orderCount: parsed.orders.length,
      })},
      ${JSON.stringify({ errors: parsed.errors })},
      ${parsed.errors.length > 0 ? parsed.errors.join('; ') : null}
    )
    ON CONFLICT (message_control_id) DO UPDATE SET
      status           = EXCLUDED.status,
      parsed_summary   = EXCLUDED.parsed_summary,
      error_message    = EXCLUDED.error_message
  `;
}

export const integrationHl7Routes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/integration/hl7/parse',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body<ParseBody>().catch(() => ({} as ParseBody))) ?? {};
        const rawMessage = typeof body.rawMessage === 'string' ? body.rawMessage : '';
        if (!rawMessage.trim()) {
          return json(fail(ErrorCode.BAD_REQUEST, 'rawMessage 不能为空'), 400);
        }
        const direction = body.direction === 'outbound' ? 'outbound' : 'inbound';

        // 纯函数解析：不触库
        const parsed = parseHL7Message(rawMessage);

        // best-effort 落库留痕（失败不阻断返回）
        await persistParseLog(rawMessage, parsed, direction).catch(() => undefined);

        return json(
          ok({
            parsed,
            logged: !isDemo,
          }),
        );
      } catch (e) {
        console.error(`[integrationHl7] POST /hl7/parse [${c.traceId}]`, e);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : 'HL7 解析失败'),
          500,
        );
      }
    },
  },

  {
    method: 'POST',
    path: '/api/v1/integration/fhir/build',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body<BuildBody>().catch(() => ({} as BuildBody))) ?? {};
        const resourceType = body.resourceType;
        if (!resourceType || !FHIR_R4_SCHEMAS[resourceType]) {
          return json(
            fail(ErrorCode.BAD_REQUEST, 'resourceType 必须为 Patient / Observation / MedicationRequest'),
            400,
          );
        }
        const data = (body.data ?? {}) as Record<string, unknown>;

        // 纯函数装配 FHIR R4 资源
        const resource = buildFHIRResource(resourceType, data as never) as FHIRResource;

        // 可选：按标准 schema 校验
        const validation = body.validate === false
          ? null
          : validateFHIRResource(resource, FHIR_R4_SCHEMAS[resourceType]);

        return json(ok({ resource, validation }));
      } catch (e) {
        console.error(`[integrationHl7] POST /fhir/build [${c.traceId}]`, e);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : 'FHIR 资源装配失败'),
          500,
        );
      }
    },
  },
];
