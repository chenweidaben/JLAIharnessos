/*
 * 健澜科技 jlmedaios - 考核结果 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance.repository;

import com.jlmedaios.monolith.performance.entity.PerformanceResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 考核结果 Repository。
 */
@Repository
public interface PerformanceResultRepository extends JpaRepository<PerformanceResult, Long> {

    /**
     * 按周期查询考核结果。
     *
     * @param period 周期
     * @return 考核结果列表
     */
    List<PerformanceResult> findByPeriod(String period);
}
