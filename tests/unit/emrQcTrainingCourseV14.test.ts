/**
 * 健澜科技 jlmedaios - 质控培训课程管理 V14 单测（M503-A）
 *
 * 测试 buildCourse 构建、addCourse 添加、removeCourse 移除、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  addCourse,
  buildCourse,
  removeCourse,
  type TrainingCourseV14,
} from "../../src/bff/aggregators/emrQcTrainingCourseV14Aggregator";
import { emrQcTrainingCourseV14Routes } from "../../src/bff/routes/emrQcTrainingCourseV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildCourse 病历书写规范", () => {
  // 手算：name='病历书写规范', lecturer='张教授', hours=4 → 正确构建
  it("name='病历书写规范', lecturer='张教授', hours=4 → 正确构建", () => {
    const course: TrainingCourseV14 = buildCourse("病历书写规范", "张教授", 4);
    expect(course.name).toBe("病历书写规范");
    expect(course.lecturer).toBe("张教授");
    expect(course.hours).toBe(4);
  });
});

describe("addCourse 空列表添加", () => {
  // 手算：空列表+新课程 → 返回长度 1（0+1=1）
  it("空列表+新课程 → 返回长度 1", () => {
    const courses: TrainingCourseV14[] = [];
    const course = buildCourse("病历书写规范", "张教授", 4);
    const result = addCourse(courses, course);
    expect(result.length).toBe(1);
  });
});

describe("removeCourse 移除课程", () => {
  // 手算：列表有 2 课程，移除'病历书写规范' → 返回长度 1（2-1=1）
  it("列表有 2 课程，移除'病历书写规范' → 返回长度 1", () => {
    const courses: TrainingCourseV14[] = [
      buildCourse("病历书写规范", "张教授", 4),
      buildCourse("质控核心制度", "李教授", 2),
    ];
    const result = removeCourse(courses, "病历书写规范");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("质控核心制度");
  });
});

describe("buildCourse 质控核心制度", () => {
  // 手算：name='质控核心制度', lecturer='李教授', hours=2 → 正确构建
  it("name='质控核心制度', lecturer='李教授', hours=2 → 正确构建", () => {
    const course: TrainingCourseV14 = buildCourse("质控核心制度", "李教授", 2);
    expect(course.name).toBe("质控核心制度");
    expect(course.lecturer).toBe("李教授");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-training-course auth:true", () => {
    const def = (emrQcTrainingCourseV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-training-course");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
