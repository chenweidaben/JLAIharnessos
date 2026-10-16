-- ============================================================================
-- 健澜科技 jlmedaios — 【系统集成深化·二期】标准接口扩展消息日志（M174-B）
--
-- 在 315-integration-hl7.sql 已建立的 integ.hl7_message_log 基础上，
-- 扩展「深度系统集成」所需列，覆盖院内外系统对接的全部标准通道，
-- 严格遵循现行国际/行业标准，不自创格式：
--
--   1. HL7 v2.x（2.5.1）扩展触发事件：
--        ADT^A08  患者信息更新（人口学/地址/联系方式变更）
--        ORM^O02  医嘱修改（既有医嘱的修订/停止/换号）
--        ORU^R30  观察结果上传（检验仪器 -> LIS -> 院端，双向通信上行）
--
--   2. FHIR R4 标准资源：Patient / Encounter / Observation /
--      MedicationRequest / Condition（ICD-10 编码）。
--
--   3. DICOM 3.0 影像设备对接：C-STORE 影像归档 / C-FIND 检索 /
--      C-MOVE 调阅，按 SOP Class UID 与 modality 留痕。
--
--   4. LIS 检验仪器双向通信：主机查询医嘱（query_host）/
--      仪器结果上传（upload_result），ASTM L2 或 HL7 ORU^R30。
--
-- 幂等：CREATE/ALTER/INDEX ... IF NOT EXISTS，可重复执行，不破坏既有列。
-- 医疗安全红线：原始报文与影像元数据可能含患者 PII，访问权限由 BFF
--   integ:hl7:view 控制；生产环境配合脱敏与访问审计。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 315 已建 schema integ 与表 integ.hl7_message_log，此处仅做扩展，不重建表。

-- 集成通道：hl7v2x（HL7 v2.x 报文）/ fhir-r4（FHIR R4 资源）/
--          dicom（DICOM 影像）/ lis（检验仪器双向）
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'hl7v2x';

-- 标准版本号：HL7 v2.5.1 / FHIR R4 / DICOM 3.0 / ASTM E1394(L2)
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS std_version text;

-- 业务画像：ADT_A08_PATIENT_UPDATE / ORM_O02_ORDER_MODIFY /
--           ORU_R30_OBSERVATION / DICOM_IMAGE_STUDY / LIS_INSTRUMENT
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS message_profile text;

-- 由报文转换出的 FHIR R4 资源类型（Patient/Encounter/Observation/
-- MedicationRequest/Condition），与既有 fhir_resource(jsonb) 对应
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS fhir_resource_type text;

-- 就诊关联号（PV1-19 / FHIR Encounter.id），串联就诊-医嘱-观察-诊断
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS encounter_id text;

-- DICOM SOP Class UID（如 1.2.840.10008.5.1.4.1.1.2 = CT Image Storage）
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS dicom_sop_class text;

-- 检查 modality（CT/MR/US/DR...）或检验项目大类，便于按设备统计
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS modality text;

-- 检验仪器编号（LIS 双向通信的物理仪器标识，如 01-CBC-5800）
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS instrument_id text;

-- LIS 双向方向：query_host 主机向下查询医嘱 / upload_result 仪器上行结果
ALTER TABLE integ.hl7_message_log
  ADD COLUMN IF NOT EXISTS lis_direction text;

-- 按集成通道回读（HL7 / FHIR / DICOM / LIS 四类接口吞吐看板）
CREATE INDEX IF NOT EXISTS idx_hl7_msg_channel
  ON integ.hl7_message_log(channel, created_at DESC);

-- 按就诊号回读一次就诊跨通道的全部接口消息（患者 360 / 接口排障）
CREATE INDEX IF NOT EXISTS idx_hl7_msg_encounter
  ON integ.hl7_message_log(encounter_id);

-- 按 DICOM SOP Class 回读影像设备对接量（PACS/RIS 集成审计）
CREATE INDEX IF NOT EXISTS idx_hl7_msg_dicom
  ON integ.hl7_message_log(dicom_sop_class);

-- 按检验仪器回读双向通信成功率（LIS 仪器接入运维）
CREATE INDEX IF NOT EXISTS idx_hl7_msg_instrument
  ON integ.hl7_message_log(instrument_id, lis_direction);

-- 说明：本表仍以「一行 = 一条外部接口消息」为粒度；channel 区分协议族，
-- message_profile 区分同一协议族下的具体业务事件，既兼容 315 既有写
-- 入（默认 channel='hl7v2x'），又承载 DICOM/LIS 的影像与仪器元数据。
