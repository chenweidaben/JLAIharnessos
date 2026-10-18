/**
 * 健澜科技 jlmedaios - 质控培训课程管理 V14 路由（M503-A）
 *
 * GET  /api/v1/emr-qc-training-course  （read，auth:true）返回课程列表
 * POST /api/v1/emr-qc-training-course  （auth:true）添加课程
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { addCourse, buildCourse, type TrainingCourseV14 } from "../aggregators/emrQcTrainingCourseV14Aggregator.js";

let sampleCourses: TrainingCourseV14[] = [
  buildCourse("病历书写规范", "张教授", 4),
  buildCourse("质控核心制度", "李教授", 2),
];

export const emrQcTrainingCourseV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-training-course",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-training-course:read");
      if (denied) return denied;
      return json(ok({ courses: sampleCourses, total: sampleCourses.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-training-course",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-training-course:write");
      if (denied) return denied;
      const body = await c.req.json();
      const name = typeof body?.name === "string" ? body.name : "";
      const lecturer = typeof body?.lecturer === "string" ? body.lecturer : "";
      const hours = typeof body?.hours === "number" ? body.hours : 0;
      const course = buildCourse(name, lecturer, hours);
      sampleCourses = addCourse(sampleCourses, course);
      return json(ok({ courses: sampleCourses, total: sampleCourses.length }));
    },
  },
];
