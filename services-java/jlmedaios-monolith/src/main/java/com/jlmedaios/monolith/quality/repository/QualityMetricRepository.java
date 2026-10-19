/*
 * 健澜科技 jlmedaios - 质量指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality.repository;

import com.jlmedaios.monolith.quality.entity.QualityMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 质量指标 Repository。
 */
@Repository
public interface QualityMetricRepository extends JpaRepository<QualityMetric, Long> {

    /**
     * 按科室编码查询质量指标列表。
     *
     * @param deptCode 科室编码
     * @return 质量指标列表
     */
    List<QualityMetric> findByDeptCode(String deptCode);

    /**
     * 按指标编码查询质量指标列表。
     *
     * @param metricCode 指标编码
     * @return 质量指标列表
     */
    List<QualityMetric> findByMetricCode(String metricCode);
}
