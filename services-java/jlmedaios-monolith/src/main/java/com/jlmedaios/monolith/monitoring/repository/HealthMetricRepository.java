/*
 * 健澜科技 jlmedaios - 健康指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.monitoring.repository;

import com.jlmedaios.monolith.monitoring.entity.HealthMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 健康指标 Repository。
 */
@Repository
public interface HealthMetricRepository extends JpaRepository<HealthMetric, Long> {

    /**
     * 按指标名查询最新 10 条。
     *
     * @param metricName 指标名
     * @return 指标列表
     */
    List<HealthMetric> findTop10ByMetricNameOrderByCollectedAtDesc(String metricName);
}
