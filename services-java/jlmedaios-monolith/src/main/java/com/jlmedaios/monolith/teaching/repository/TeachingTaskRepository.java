/*
 * 健澜科技 jlmedaios - 教学任务 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.teaching.repository;

import com.jlmedaios.monolith.teaching.entity.TeachingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 教学任务 Repository。
 */
@Repository
public interface TeachingTaskRepository extends JpaRepository<TeachingTask, Long> {

    /**
     * 按科室+日期范围查询教学任务。
     *
     * @param deptCode 科室编码
     * @param start    开始日期
     * @param end      结束日期
     * @return 教学任务列表
     */
    List<TeachingTask> findByDeptCodeAndDateBetween(String deptCode, LocalDate start, LocalDate end);

    /**
     * 按教师工号查询教学历史。
     *
     * @param teacherId 教师工号
     * @return 教学任务列表
     */
    List<TeachingTask> findByTeacherId(String teacherId);
}
