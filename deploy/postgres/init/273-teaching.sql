-- ============================================================================
-- 健澜科技 jlmedaios - 教学管理 · 教学计划与考勤表（M140-C · 医院管理深化）
-- 273-teaching.sql
--
-- 【医院管理深化】教学管理与规培考核直接挂钩：
--   把规培生教学 / 实习生带教 / 继续教育讲座 / 三基三严培训四类教学活动
--   统一登记为教学计划（teaching_plan），并逐人记录考勤（teaching_attendance），
--   考勤合格方计学分，学分累计回写规培生考核档案——
--   「听没听、到没到、修了多少学分」院长与科教科一眼可查。
--
--   教学类别（category CHECK 锁死四类口径）：
--     residency    规培生教学（与规培考核直接挂钩，assess_linked 默认 true）
--     internship   实习生带教
--     lecture      继续教育讲座
--     three_basics 三基三严培训
--
-- 设计要点：
--   - credits 一律 >= 0，考勤合格（attended = true）才把学分计入学员个人账户；
--   - assess_linked 标记该教学计划是否回写规培考核——规培生教学默认 true，
--     其余类别可由科教科按需开启；考核部门据此出「教学-考核」闭环报表；
--   - schedule 记录授课安排（时间/地点/周次的自然语言描述，如「每周三 16:00 示教室」），
--     不强制结构化，避免与排班系统重复建模；
--   - recorded_at / created_at 用数据库时钟 now()，不采信前端自报时间，防篡改。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重复执行。
-- 不触碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 教学计划：一门课 / 一场讲座 / 一次带教的登记
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.teaching_plan (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name   text NOT NULL,                                -- 课程/讲座/培训名称
  teacher_id    text NOT NULL,                                -- 带教老师工号
  student_group text NOT NULL,                                -- 授课对象组别（如 内科规培一组）
  category      text NOT NULL CHECK (category IN
                 ('residency','internship','lecture','three_basics')),
  schedule      text NOT NULL DEFAULT '',                     -- 授课安排（时间/地点）
  credits       numeric(6,1) NOT NULL DEFAULT 0 CHECK (credits >= 0),  -- 学分
  dept          text NOT NULL,                                -- 开课科室
  assess_linked boolean NOT NULL DEFAULT true,               -- 是否与规培考核挂钩
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 按类别 + 开课科室拉教学计划（科教科按类别/科室看板）
CREATE INDEX IF NOT EXISTS idx_teaching_plan_category
  ON clinical.teaching_plan (category, dept);

-- 按老师工作量汇总（带教老师授课门数 / 学分）
CREATE INDEX IF NOT EXISTS idx_teaching_plan_teacher
  ON clinical.teaching_plan (teacher_id);

-- ---------------------------------------------------------------------------
-- 教学考勤：一名学员参加某一次教学的到勤与学分认定
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.teaching_attendance (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        uuid NOT NULL REFERENCES clinical.teaching_plan(id) ON DELETE CASCADE,
  student_id     text NOT NULL,                               -- 学员工号/学号
  attended       boolean NOT NULL DEFAULT false,              -- 是否到勤
  attendance_date date   date NOT NULL DEFAULT CURRENT_DATE,  -- 授课日期
  credits_earned numeric(6,1) NOT NULL DEFAULT 0 CHECK (credits_earned >= 0),  -- 考勤合格认定学分
  recorded_at    timestamptz NOT NULL DEFAULT now()
);

-- 按学员拉考勤与修读学分（规培考核回写数据源）
CREATE INDEX IF NOT EXISTS idx_teaching_attendance_student
  ON clinical.teaching_attendance (student_id, attendance_date);

-- 按教学计划统计到勤率
CREATE INDEX IF NOT EXISTS idx_teaching_attendance_plan
  ON clinical.teaching_attendance (plan_id, attendance_date);
