-- ============================================================================
-- 健澜科技 jlmedaios · M162-B 教学与培训深化——teaching_course 在线课程与考核
--
-- 【医院全场景】把「在线课程（录播 + 直播）/ 技能考核（OSCE 客观结构化考核）/
--   规培管理（轮转计划 + 出科考核）/ 继教学分（自动记录）」四类教学业务统一
--   落到一张 teaching_course 表，作为 BFF 聚合层三个纯函数的持久化快照：
--     buildTeachingPlan(dept, year)          按科室生成年度教学计划
--     evaluateStudentPerformance(sid,cid)    OSCE 多考站加权、公平可追溯
--     generateTeachingReport(dept, period)   科室教学质量与公平性报告
--
-- 【教学考核要公平，不能走过场】
--   - course_type 用 CHECK 锁死五类口径：recorded=录播 / live=直播 /
--     osce=客观结构化技能考核 / rotation=规培轮转 / exit_exam=出科考核；
--   - assessment jsonb 固化 OSCE 考站与权重（病史采集/体格检查/临床操作/
--     医患沟通/急救技能），任何一站低于 60 分即整体不通过，杜绝「平均过线、
--     短板放水」；
--   - credit_auto_record=true 时，考核合格即自动登记继教学分，免人工补录、
--     避免「听没听、到没到、修了多少学分」三不知；
--   - 分数/学分均由服务端纯函数按确定性种子生成，不采信前端自报，防篡改。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- 不碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- teaching_course：一门在线课程 / 一场直播 / 一次 OSCE / 一段轮转 / 一次出科考
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.teaching_course (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code   text NOT NULL,                              -- 课程编码（如 REC-2026-001 / OSCE-2026-INT）
  course_name   text NOT NULL,                              -- 课程 / 考核名称
  dept          text NOT NULL,                              -- 开课 / 接收科室

  -- 课程形态：录播 / 直播 / OSCE 技能考核 / 规培轮转 / 出科考核
  course_type   text NOT NULL CHECK (course_type IN
                 ('recorded','live','osce','rotation','exit_exam')),

  teacher_id    text NOT NULL DEFAULT '',                   -- 主讲 / 带教师傅工号
  target_group text NOT NULL DEFAULT '',                   -- 培训对象（规培生 / 实习生 / 继教全员）

  credit        numeric(6,1) NOT NULL DEFAULT 0
                CHECK (credit >= 0),                         -- 继教学分（合格后入账）
  capacity      int NOT NULL DEFAULT 0 CHECK (capacity >= 0),-- 选课容量 / 轮转人数

  -- 排期：录播节次 / 直播时段 / 轮转起止月份（结构化 jsonb，便于排课与提醒）
  schedule      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 考核方案：OSCE 考站清单 + 权重 + 合格线（默认每站 ≥60、加权总分 ≥60）
  assessment    jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 继教学分是否自动记录：true=考核合格即自动入账，免人工登记
  credit_auto_record boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 科教科按「科室 + 课程形态」拉教学计划看板
CREATE INDEX IF NOT EXISTS idx_teaching_course_dept_type
  ON clinical.teaching_course (dept, course_type);

-- 按课程形态全局盘点（在线课程 / OSCE / 规培 / 继教）
CREATE INDEX IF NOT EXISTS idx_teaching_course_type
  ON clinical.teaching_course (course_type);

-- 按带教师傅汇总工作量
CREATE INDEX IF NOT EXISTS idx_teaching_course_teacher
  ON clinical.teaching_course (teacher_id);

COMMENT ON TABLE clinical.teaching_course IS
  'M162-B 教学与培训深化：在线课程(录播+直播)/OSCE客观结构化考核/规培轮转+出科考核/继教学分自动记录；考核公平可追溯，不走过场';
