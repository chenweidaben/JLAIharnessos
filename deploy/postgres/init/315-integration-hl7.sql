-- ============================================================================
-- 健澜科技 jlmedaios — 【系统集成深化】HL7 v2.x / FHIR R4 接口消息日志（M155-C）
--
-- 依据国家医院互联互通标准化成熟度测评与电子病历五级评审对「外部接口」
-- 的留痕要求：所有进出院端的 HL7 v2.x 消息（ADT^A04 入院登记 / ORM^O01 医嘱
-- 下单 / ORU^R01 检验结果 / DFT^P03 账单更新）均须可追溯、可审计。
--
-- 本表落库每一条 HL7 原始报文与其解析摘要、转换出的 FHIR R4 资源及校验结果：
--   一行 = 一条外部接口消息，供接口测试页 /api/v1/integration/hl7/* 回读审计。
--
-- 标准依据：
--   · HL7 v2.x：字段分隔符 |、组件 ^、重复 ~、转义 \、子组件 &；
--     分段以回车（0x0D）为界；MSH-9 = 消息类型^触发事件（如 ADT^A04）。
--   · FHIR R4：Patient / Observation / MedicationRequest 标准资源结构。
--
-- 医疗安全红线：本表保留原始报文，可能含患者 PII，访问权限由 BFF 权限码
--   integ:hl7:view 控制；生产环境应配合数据脱敏与访问审计。
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS integ;

-- HL7 接口消息日志：一行 = 一条外部进出院端的 HL7 v2.x 报文
CREATE TABLE IF NOT EXISTS integ.hl7_message_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 消息控制号（MSH-10），同一条消息的唯一业务标识，用于去重/重传追踪
  message_control_id  text NOT NULL,
  -- 消息类型（MSH-9.1）：ADT / ORM / ORU / DFT
  message_type       text NOT NULL,
  -- 触发事件（MSH-9.2）：A04 / O01 / R01 / P03
  trigger_event      text NOT NULL,
  -- 完整消息类型（MSH-9），如 ADT^A04
  message_event       text NOT NULL,
  -- 发送方应用（MSH-3），用于追溯来源系统
  sending_app        text,
  -- 消息收发方向：inbound 院端接收 / outbound 院端发出
  direction          text NOT NULL DEFAULT 'inbound',
  -- 处理状态：received 已接收 / parsed 已解析 / converted 已转 FHIR / failed 失败
  status             text NOT NULL DEFAULT 'received',
  -- 原始 HL7 报文（|^~\& 分隔，分段 0x0D），审计留痕；敏感 PII 生产脱敏
  raw_message         text NOT NULL,
  -- 纯函数解析摘要（aggregators/integrationHl7Aggregator.ts 产出）：
  --   patientId / patientName / visitNumber / segments 数量等结构化字段
  parsed_summary      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 由 buildFHIRResource 转换出的 FHIR R4 资源（Patient/Observation/MedicationRequest）
  fhir_resource      jsonb,
  -- validateFHIRResource 对 FHIR 资源的校验结果：{ valid, errors[] }
  validation_result   jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 失败时的错误描述（解析/转换/校验失败原因）
  error_message       text,
  -- 入库时间（审计时序）
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_control_id)
);

-- 按消息类型+触发事件回读（按类型统计接口吞吐/失败率）
CREATE INDEX IF NOT EXISTS idx_hl7_msg_type_event
  ON integ.hl7_message_log(message_type, trigger_event);

-- 按状态回读失败报文（failed 排查队列）
CREATE INDEX IF NOT EXISTS idx_hl7_msg_status
  ON integ.hl7_message_log(status, created_at DESC);

-- 按时间倒序回读最近报文（接口测试页最近记录列表）
CREATE INDEX IF NOT EXISTS idx_hl7_msg_created
  ON integ.hl7_message_log(created_at DESC);

-- 接口日志可能含患者 PII，访问权限由 BFF 权限码 integ:hl7:view 控制，
-- 禁止未经授权的批量导出；审计动作应写入 audit schema。
