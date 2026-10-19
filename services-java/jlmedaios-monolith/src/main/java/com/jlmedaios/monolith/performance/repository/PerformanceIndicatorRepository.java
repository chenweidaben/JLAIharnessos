/*
 * 健澜科技 jlmedaios - 考核指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance.repository;

import com.jlmedaios.monolith.performance.entity.PerformanceIndicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 考核指标 Repository。
 */
@Repository
public interface PerformanceIndicatorRepository extends JpaRepository<PerformanceIndicator, Long> {

    /**
     * 按类别查询考核指标。
     *
     * @param category 类别
     * @return 指标列表
     */
    List<PerformanceIndicator> findByCategory(String category);
}
