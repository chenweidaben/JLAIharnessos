-- ============================================================================
-- 健澜科技 jlmedaios - 住院号序列
-- 23-inpatient-sequences.sql
--
-- 住院登记使用顺序、可读、唯一的住院号/住院就诊号：
--   admission_no = 'ZY' || lpad(nextval, 6)
--   visit_no     = 'IP' || lpad(nextval, 6)   （与入院记录 1:1，便于交叉核对）
--
-- 幂等：CREATE SEQUENCE IF NOT EXISTS。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS clinical.admission_no_seq
  START WITH 100001 INCREMENT BY 1 CACHE 20;
