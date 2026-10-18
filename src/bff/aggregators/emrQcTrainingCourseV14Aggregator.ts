/**
 * 健澜科技 jlmedaios - 质控培训课程管理 V14 聚合器（M503-A）
 *
 * 纯函数：培训课程构建 + 课程增删操作。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 培训课程 */
export interface TrainingCourseV14 {
  name: string;
  lecturer: string;
  hours: number;
}

/**
 * 构建培训课程。
 *
 * @param name 课程名
 * @param lecturer 讲师
 * @param hours 学时
 * @returns 培训课程
 */
export function buildCourse(name: string, lecturer: string, hours: number): TrainingCourseV14 {
  return { name, lecturer, hours };
}

/**
 * 添加课程。
 *
 * @param courses 课程数组
 * @param course 新课程
 * @returns 新课程数组（长度+1）
 */
export function addCourse(courses: TrainingCourseV14[], course: TrainingCourseV14): TrainingCourseV14[] {
  // 手算 add：返回新数组长度+1
  return [...courses, course];
}

/**
 * 移除课程。
 *
 * @param courses 课程数组
 * @param name 要移除的课程名
 * @returns 新课程数组（过滤后长度-1）
 */
export function removeCourse(courses: TrainingCourseV14[], name: string): TrainingCourseV14[] {
  // 手算 remove：过滤掉指定课程名，长度-1
  return courses.filter((c) => c.name !== name);
}
