/**
 * 健澜科技 jlmedaios — 【系统集成深化·二期】标准接口扩展路由（M174-B）
 *
 *   POST /api/v1/integration/deep/parse
 *     body: {
 *       standard?: 'hl7v2x' | 'fhir-r4' | 'dicom' | 'lis'（默认 hl7v2x）,
 *       rawMessage?: string,                 // standard=hl7v2x 时：原始报文
 *       resourceType?: FHIRR4ResourceType,   // standard=fhir-r4 时：Patient/Encounter/
 *                                            //   Observation/MedicationRequest/Condition
 *       data?: object,                      // fhir-r4 入参 / dicom/lis 描述符
 *       direction?: 'inbound'|'outbound'
 *     }
 *
 *     统一入口按标准族分发到纯函数聚合器（aggregators/integrationDeepAggregator.ts）：
 *       · hl7v2x  -> parseHL7v2x 解析 ADT^A08/ORM^O02/ORU^R30 + validateIntegrationMessage 校验
 *       · fhir-r4 -> buildFHIRR4 装配 5 类标准资源 + validateIntegrationMessage 校验
 *       · dicom   -> validateIntegrationMessage 校验 DICOM SOP/modality 描述符
 *       · lis     -> validateIntegrationMessage 校验检验仪器双向通道描述符
 *
 * 【质量与合规】本层只做协议转换与留痕，不依据解析结果触发诊疗行为；
 *   原始报文/影像元数据含患者 PII，访问权限为登录态 + 后续审计。
 * 降级原则：演示模式（DEMO_MODE）不连 PostgreSQL，不伪造落库。
 *
 * 「持续优化与新场景」：新增标准族时，仅需在分发 switch 与 persistProfile 登记，
 *   前端控制台通过 buildDeepIntegration() 自动获得新能力清单。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepIntegration,
  buildFHIRR4,
  parseHL7v2x,
  validateIntegrationMessage,
  type DeepParsedMessage,
  type DeepValidationResult,
  type FHIRR4ResourceType,
  type IntegrationStandard,
} from '../aggregators/integrationDeepAggregator';

/** 无 DB 演示模式：不连 PostgreSQL，不伪造落库 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const STANDARDS: readonly IntegrationStandard[] = ['hl7v2x', 'fhir-r4', 'dicom', 'lis'];

interface DeepParseBody {
  standard?: string;
  rawMessage?: string;
  resourceType?: string;
  data?: Record<string, unknown>;
  direction?: string;
}

/** 按协议族映射业务画像（写入 message_profile 列） */
function profileOf(standard: IntegrationStandard, parsed?: DeepParsedMessage): string {
  if (standard === 'hl7v2x' && parsed) {
    switch (parsed.messageEvent) {
      case 'ADT^A08':
        return 'ADT_A08_PATIENT_UPDATE';
      case 'ORM^O02':
        return 'ORM_O02_ORDER_MODIFY';
      case 'ORU^R30':
        return 'ORU_R30_OBSERVATION';
      default:
        return 'HL7_UNKNOWN';
    }
  }
  if (standard === 'dicom') return 'DICOM_IMAGE_STUDY';
  if (standard === 'lis') return 'LIS_INSTRUMENT';
  return 'FHIR_RESOURCE';
}

/**
 * 留痕落库（best-effort，失败不阻断返回）。
 * 写入 348-integration-deep.sql 扩展的 channel/std_version/profile 等列。
 */
async function persistDeepLog(input: {
  channel: IntegrationStandard;
  direction: string;
  rawMessage: string;
  parsed?: DeepParsedMessage;
  validation: DeepValidationResult;
  fhirResourceType?: string;
  fhirResource?: unknown;
  descriptor?: Record<string, unknown>;
}): Promise<void> {
  if (isDemo) return;
  const db = getDb();
  const { channel, direction, rawMessage, parsed, validation, fhirResourceType, fhirResource, descriptor } = input;

  const messageControlId =
    parsed?.messageControlId ||
    descriptor?.instrumentCode ||
    `mc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const stdVersion =
    channel === 'hl7v2x' ? '2.5.1' : channel === 'fhir-r4' ? 'R4' : channel === 'dicom' ? '3.0' : 'ASTM-L2';
  const status = validation.valid ? 'parsed' : 'failed';

  await db`
    INSERT INTO integ.hl7_message_log
      (message_control_id, message_type, trigger_event, message_event,
       sending_app, direction, status, raw_message, parsed_summary,
       fhir_resource, fhir_resource_type, validation_result, error_message,
       channel, std_version, message_profile, encounter_id,
       dicom_sop_class, modality, instrument_id)
    VALUES (
      ${String(messageControlId)},
      ${parsed?.messageType || channel.toUpperCase()},
      ${parsed?.triggerEvent || '-'},
      ${parsed?.messageEvent || channel},
      ${parsed?.sendingApplication || null},
      ${direction === 'outbound' ? 'outbound' : 'inbound'},
      ${status},
      ${rawMessage},
      ${JSON.stringify({
        patientId: parsed?.patientId,
        patientName: parsed?.patientName,
        visitNumber: parsed?.visitNumber,
        segmentCount: parsed?.segments.length ?? 0,
        observationCount: parsed?.observations.length ?? 0,
        orderCount: parsed?.orders.length ?? 0,
        descriptor: descriptor ?? null,
      })},
      ${fhirResource ? JSON.stringify(fhirResource) : null},
      ${fhirResourceType ?? null},
      ${JSON.stringify({ valid: validation.valid, errors: validation.errors })},
      ${validation.errors.length > 0 ? validation.errors.join('; ') : null},
      ${channel},
      ${stdVersion},
      ${profileOf(channel, parsed)},
      ${parsed?.visitNumber || (descriptor?.studyInstanceUid ? String(descriptor.studyInstanceUid) : null)},
      ${descriptor?.sopClassUid ? String(descriptor.sopClassUid) : null},
      ${descriptor?.modality ? String(descriptor.modality) : null},
      ${descriptor?.instrumentCode ? String(descriptor.instrumentCode) : null}
    )
    ON CONFLICT (message_control_id) DO UPDATE SET
      status           = EXCLUDED.status,
      parsed_summary   = EXCLUDED.parsed_summary,
      fhir_resource    = EXCLUDED.fhir_resource,
      validation_result = EXCLUDED.validation_result,
      error_message    = EXCLUDED.error_message
  `;
}

export const integrationDeepRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/integration/deep/parse',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body<DeepParseBody>().catch(() => ({} as DeepParseBody))) ?? {};
        const standard = (STANDARDS as readonly string[]).includes(String(body.standard ?? 'hl7v2x'))
          ? (body.standard as IntegrationStandard)
          : 'hl7v2x';
        const direction = body.direction === 'outbound' ? 'outbound' : 'inbound';
        const capability = buildDeepIntegration();

        // —— 分支 1：HL7 v2.x 深度报文解析 ——
        if (standard === 'hl7v2x') {
          const rawMessage = typeof body.rawMessage === 'string' ? body.rawMessage : '';
          if (!rawMessage.trim()) {
            return json(fail(ErrorCode.BAD_REQUEST, 'rawMessage 不能为空'), 400);
          }
          const parsed = parseHL7v2x(rawMessage);
          const validation = validateIntegrationMessage(rawMessage, 'hl7v2x');
          // 解析成功后，自动装配 FHIR Patient 资源（互联互通「数据标准化」要求）
          const fhir = parsed.patientId
            ? buildFHIRR4('Patient', {
                id: parsed.patientId,
                identifier: parsed.patientId,
                familyName: parsed.patientName.split(' ')[0] ?? '',
                givenNames: parsed.patientName.split(' ').slice(1),
                gender: hl7GenderSafe(parsed.administrativeSex),
                birthDate: parsed.dateTimeOfBirth.slice(0, 10),
              })
            : null;

          await persistDeepLog({
            channel: 'hl7v2x',
            direction,
            rawMessage,
            parsed,
            validation,
            fhirResourceType: fhir?.resourceType,
            fhirResource: fhir,
          }).catch(() => undefined);

          return json(ok({ capability, standard, parsed, fhir, validation, logged: !isDemo }));
        }

        // —— 分支 2：FHIR R4 资源装配 + 校验 ——
        if (standard === 'fhir-r4') {
          const resourceType = body.resourceType as FHIRR4ResourceType | undefined;
          if (!resourceType) {
            return json(fail(ErrorCode.BAD_REQUEST, 'fhir-r4 需指定 resourceType'), 400);
          }
          const data = body.data ?? {};
          const resource = buildFHIRR4(resourceType, data as never);
          const validation = validateIntegrationMessage(resource, 'fhir-r4');

          await persistDeepLog({
            channel: 'fhir-r4',
            direction,
            rawMessage: JSON.stringify({ resourceType, data }),
            validation,
            fhirResourceType: resource.resourceType,
            fhirResource: resource,
          }).catch(() => undefined);

          return json(ok({ capability, standard, resource, validation, logged: !isDemo }));
        }

        // —— 分支 3/4：DICOM 影像 / LIS 检验仪器双向 描述符校验 ——
        const descriptor = body.data ?? {};
        const validation = validateIntegrationMessage(descriptor, standard);
        await persistDeepLog({
          channel: standard,
          direction,
          rawMessage: JSON.stringify(descriptor),
          validation,
          descriptor,
        }).catch(() => undefined);

        return json(ok({ capability, standard, descriptor, validation, logged: !isDemo }));
      } catch (e) {
        console.error(`[integrationDeep] POST /deep/parse [${c.traceId}]`, e);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '深度集成处理失败'),
          500,
        );
      }
    },
  },
];

/** 本地小工具：把 HL7 性别代码映射为 FHIR（避免在路由层二次引入聚合器内部函数） */
function hl7GenderSafe(gender: string): string {
  switch ((gender ?? '').trim().toUpperCase()) {
    case 'M':
      return 'male';
    case 'F':
      return 'female';
    case 'O':
      return 'other';
    default:
      return 'unknown';
  }
}
