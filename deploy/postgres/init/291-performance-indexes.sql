-- ============================================================================
-- 健澜科技 jlmedaios - M145-A 核心业务表性能索引收尾（生产化收尾）
--
-- 【生产化收尾】面向 5 张核心流水表的高频读路径，补齐「等值过滤 + 状态 + 时间倒序」
--   复合 btree 索引。设计原则：索引不能加太多，影响写入性能——
--   每张表只加 1 条真正缺失的窄列复合索引，全部为 btree（uuid / timestamptz /
--   low-cardinality text），写放大远低于既有的 GIN 全文 / jsonb 索引。
--
-- 任务口径 vs 真实列名（落库前已对齐，避免建在不存在的列上）：
--   - patients(dept_id, status, created_at)：clinical.patients 无 dept_id / status
--     列——租户归属由 hospital_id 表达，软删由 deleted_at 表达；故落
--     (hospital_id, created_at DESC) WHERE deleted_at IS NULL。
--   - visits(patient_id, visit_date, status)：就诊时间列实为 admit_at（无
--     visit_date）；故落 (patient_id, status, admit_at DESC)。
--   - medical_records(visit_id, dept, created_at)：病历文书无 dept 列（科室在
--     visits.department 上）；故落 (visit_id, created_at DESC)。
--   - notification(staff_id, read_at, created_at)：clinical.notifications 已在
--     263-notifications.sql 建好 (staff_id, created_at DESC) 与未读 partial
--     索引，本脚本不再重复加索引（避免双倍写放大），仅做注释说明。
--
-- 幂等：全部 CREATE INDEX IF NOT EXISTS，可重复执行；不删表、不改既有数据。
-- 编号：落位 291（290-ai-quality 之后）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- SPDX-License-Identifier: Apache-2.0
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 患者主索引：按医院拉取「近期建档患者」列表
--    读路径：WHERE hospital_id = $1 AND deleted_at IS NULL
--            ORDER BY created_at DESC LIMIT N（患者管理端首屏 / 导诊台建档列表）。
--    现状：261 仅建了 (hospital_id) 单列 partial 索引，排序仍需额外 sort。
--    写路径影响：INSERT patients 时仅多维护一条窄 btree 叶子项；
--      不影响 mrn 唯一约束校验、id_card_hash 查重、name_masked GIN 三角模糊、
--      tags GIN 这四条既有写入热路径（它们各自独立维护，本索引不参与）。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patients_hospital_created
  ON clinical.patients (hospital_id, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_patients_hospital_created IS
  '【生产化收尾】患者管理端按院列近期建档患者（hospital_id 等值 + created_at 倒序，partial 软删）；'
  || '只加 1 条窄 btree，不影响 mrn 唯一约束 / 身份证哈希查重 / GIN 姓名模糊 / GIN 标签 四条写入热路径。';

-- ---------------------------------------------------------------------------
-- 2. 就诊：患者 360 拉某患者「在诊/在院」就诊流水
--    读路径：WHERE patient_id = $1 AND status = 'ongoing'
--            ORDER BY admit_at DESC（患者主页 / 医生工作台拉在诊就诊）。
--    现状：20-clinical 已有 (patient_id, admit_at DESC) 但不带 status 过滤，
--      拉「在诊」时仍要回表过滤 + 排序。
--    写路径影响：visits 写入为低频（一次就诊一行），且新索引列均为既有列；
--      不影响 visit_no 唯一约束、(department, status) 科室看板索引的维护成本。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_visits_patient_status_admit
  ON clinical.visits (patient_id, status, admit_at DESC);

COMMENT ON INDEX idx_visits_patient_status_admit IS
  '【生产化收尾】患者360/医生工作台按患者拉在诊就诊（patient_id 等值 + status 等值 + admit_at 倒序）；'
  || 'visits 为一次就诊一行的低频写表，写放大可忽略，不影响 visit_no 唯一约束与科室看板索引。';

-- ---------------------------------------------------------------------------
-- 3. 处方头：就诊详情拉「待审/已发」处方列表
--    读路径：WHERE visit_id = $1 AND status IN ('pending_review','approved')
--            ORDER BY created_at DESC（就诊详情页处方 tab、药师审方队列按就诊看）。
--    现状：20-clinical 仅建 (visit_id) 与 (status) 两个单列索引，跨就诊 + 状态
--      组合过滤时优化器只能选其一，另一个条件仍回表过滤。
--    写路径影响：处方随就诊产生、写入并发有限；该索引不含大字段、不含 jsonb，
--      不影响 rx_no 唯一约束、audit_result jsonb 的写入成本。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rx_visit_status_created
  ON clinical.prescriptions (visit_id, status, created_at DESC);

COMMENT ON INDEX idx_rx_visit_status_created IS
  '【生产化收尾】就诊详情/药师审方按就诊拉处方（visit_id 等值 + status 等值 + created_at 倒序）；'
  || '处方为低频业务写，窄 btree 写放大极低，不影响 rx_no 唯一约束与 audit_result jsonb 写入。';

-- ---------------------------------------------------------------------------
-- 4. 病历文书：就诊详情拉「按时间倒序」的文书列表
--    读路径：WHERE visit_id = $1 ORDER BY created_at DESC
--            （EMR 就诊时间线 / 护士站病程列表）。
--    现状：20-clinical 仅建 (visit_id) 单列索引，拉列表时 filesort 溢出。
--    写路径影响：病历文书以 INSERT 为主（draft 落库后再更新 status），
--      本索引仅在 INSERT 时维护一次；不影响 (record_type, status) 质控队列索引、
--      content GIN、全文检索 GIN 这三条已有重索引的写入路径。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_records_visit_created
  ON clinical.medical_records (visit_id, created_at DESC);

COMMENT ON INDEX idx_records_visit_created IS
  '【生产化收尾】EMR 就诊时间线按就诊拉文书（visit_id 等值 + created_at 倒序）；'
  || '文书以 INSERT 为主，窄 btree 仅在写入时维护一次，不影响 record_type+status 质控索引与 content/全文 GIN。';

-- ---------------------------------------------------------------------------
-- 5. 医护通知：已在 263-notifications.sql 覆盖，本脚本不加新索引
--    （staff_id, created_at DESC）与 partial（staff_id, created_at DESC）
--    WHERE read_at IS NULL 两条索引已完整覆盖「某人通知列表」与「未读角标」
--    两类读路径。再加任何 (staff_id, read_at, created_at) 复合索引都会与既有
--    索引重叠、徒增通知表（高频写）的写放大——故本条只做说明，不落 DDL。
-- ---------------------------------------------------------------------------
-- no-op: clinical.notifications 已由 263-notifications.sql 索引覆盖，见上。
