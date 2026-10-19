/*
 * 健澜科技 jlmedaios - 教学计划 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.teaching.repository;

import com.jlmedaios.monolith.teaching.entity.TeachingPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 教学计划 Repository。
 */
@Repository
public interface TeachingPlanRepository extends JpaRepository<TeachingPlan, Long> {

    /**
     * 按科室查询教学计划。
     *
     * @param department 科室
     * @return 教学计划列表
     */
    List<TeachingPlan> findByDepartment(String department);
}
