/*
 * 健澜科技 jlmedaios - 绩效分 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance.repository;

import com.jlmedaios.monolith.performance.entity.PerformanceScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 绩效分 Repository。
 */
@Repository
public interface PerformanceScoreRepository extends JpaRepository<PerformanceScore, Long> {

    /**
     * 按科室查询绩效分。
     *
     * @param deptCode 科室编码
     * @return 绩效分列表
     */
    List<PerformanceScore> findByDeptCode(String deptCode);

    /**
     * 按员工工号查询绩效历史。
     *
     * @param staffId 员工工号
     * @return 绩效分列表
     */
    List<PerformanceScore> findByStaffId(String staffId);
}
