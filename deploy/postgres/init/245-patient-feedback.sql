-- ============================================================================
-- 健澜科技 jlmedaios - M122-D 患者满意度反馈闭环
--
-- 依据宪法第四十五条（国家发展医疗卫生事业，保护人民健康）与
-- 国家尊重和保障人权的原则：患者有权对医疗服务作出真实评价，
-- 医疗机构有义务倾听并据此持续改进服务质量。
--
-- 表结构：
--   medmuse.patient_feedback
--     id          bigserial  主键（反馈流水号）
--     patient_id  text       脱敏患者号（不存姓名 / 身份证号）
--     visit_id    text       就诊标识（关联一次就诊，便于闭环追溯）
--     doctor_id   text       接诊医生工号（可空，互联网医院无固定接诊时）
--     dept_code   text       科室编码（用于科室满意度排名）
--     rating      smallint   总体评分 1-5（5 为最满意，CHECK 约束兜底）
--     comment     text       患者文字意见（可空；纯脱敏自由文本）
--     created_at  timestamptz 提交时间（默认 now()，用于趋势与近期窗口）
--
-- 医疗安全红线：
--   - 本表只存脱敏业务标识，严禁落患者姓名 / 身份证号 / 病案号明文；
--   - 患者端仅可写本人反馈；管理员端只读聚合结果，不下放单条明细检索；
--   - 评论为自由文本，落库前由 BFF 做长度截断与基本清洗，不做反推身份。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 患者满意度反馈（一次就诊一条评价；由患者端提交，管理员端聚合分析）
-- 依据宪法：公民获得基本医疗服务与监督医疗服务的权利
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.patient_feedback (
  id          bigserial PRIMARY KEY,
  patient_id  text        NOT NULL,
  visit_id    text        NOT NULL,
  doctor_id   text        NOT NULL DEFAULT '',
  dept_code   text        NOT NULL DEFAULT '',
  rating      smallint    NOT NULL,
  comment     text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_patient_feedback_rating CHECK (rating BETWEEN 1 AND 5)
);

-- 科室排名：按科室聚合均分时，先按科室过滤，再排序取近期窗口
CREATE INDEX IF NOT EXISTS idx_patient_feedback_dept_created
  ON medmuse.patient_feedback (dept_code, created_at DESC);

-- 患者本人查询历史反馈：按患者号倒序
CREATE INDEX IF NOT EXISTS idx_patient_feedback_patient_created
  ON medmuse.patient_feedback (patient_id, created_at DESC);

-- 一次就诊原则上只评价一次（重复提交由 BFF 做幂等，这里给唯一约束兜底）
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_feedback_visit
  ON medmuse.patient_feedback (visit_id);
