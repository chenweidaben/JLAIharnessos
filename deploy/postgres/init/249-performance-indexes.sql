-- ============================================================================
-- 健澜科技 jlmedaios - M128-D 系统性能优化索引（移动端读路径加速）
--
-- 【移动端+性能优化】面向移动端高频拉取路径的复合索引补强。
--
-- 背景：移动端（护士站 / 医生工作台 / 患者门户）在弱网与高频轮询下，
--   读路径对以下三类流水表的「等值过滤 + 时间倒序」最敏感：
--   - medmuse.staff_decision_memory：按员工拉取近期决策记忆；
--   - medmuse.patient_feedback：按科室拉取近期反馈做满意度排名；
--   - medmuse.system_error_log：管理员拉取未闭环错误工单（按时间窗口）。
-- 本脚本为上述路径补充专用复合索引，避免全表扫描与排序溢出，
-- 直接降低移动端首屏等待与 BFF 聚合耗时。
--
-- 幂等：全部 CREATE INDEX IF NOT EXISTS，可重复执行；不删表、不改既有数据。
-- 编号说明：落位 249（248-system-config 之后）。
--
-- 说明：staff_decision_memory / patient_feedback 两表在 239 / 245 中已建
--   同列序复合索引，此处以 IF NOT EXISTS 对齐任务口径，重复执行为空操作；
--   system_error_log 仅有 created_at 单列索引，本脚本新增
--   (created_at, resolved) 复合索引服务「未闭环工单」过滤。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 1. 员工决策记忆：按 staff_id 等值 + created_at 倒序拉近期记忆
--    读路径：WHERE staff_id = $1 ORDER BY created_at DESC LIMIT N。
--    【移动端+性能优化】移动端护士 / 医生工作台首屏拉取本人决策上下文。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_staff_decision_memory_staff_created
  ON medmuse.staff_decision_memory (staff_id, created_at);

-- ---------------------------------------------------------------------------
-- 2. 患者反馈：按 dept_code 等值 + created_at 倒序做科室满意度排名
--    读路径：WHERE dept_code = $1 ORDER BY created_at DESC。
--    【移动端+性能优化】管理端移动端「科室反馈看板」按科室刷近期样本。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patient_feedback_dept_created
  ON medmuse.patient_feedback (dept_code, created_at);

-- ---------------------------------------------------------------------------
-- 3. 系统错误日志：created_at 时间窗口 + resolved 未闭环过滤
--    读路径：WHERE created_at >= $1 AND resolved = false ORDER BY created_at DESC。
--    【移动端+性能优化】运维移动端告警中心默认只看「待闭环」错误，
--    (created_at, resolved) 复合索引把时间窗口与布尔过滤一并消化。
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_system_error_log_created_resolved
  ON medmuse.system_error_log (created_at, resolved);
