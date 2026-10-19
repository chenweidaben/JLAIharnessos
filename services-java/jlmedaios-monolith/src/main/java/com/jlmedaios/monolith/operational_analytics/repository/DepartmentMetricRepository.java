/*
 * 健澜科技 jlmedaios - 科室运营指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operational_analytics.repository;

import com.jlmedaios.monolith.operational_analytics.entity.DepartmentMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 科室运营指标 Repository。
 */
@Repository
public interface DepartmentMetricRepository extends JpaRepository<DepartmentMetric, Long> {

    /**
     * 按科室和周期查询指标。
     *
     * @param deptCode 科室编码
     * @param period   周期
     * @return 指标列表
     */
    List<DepartmentMetric> findByDeptCodeAndPeriod(String deptCode, String period);

    /**
     * 按指标名称查询。
     *
     * @param metricName 指标名称
     * @return 指标列表
     */
    List<DepartmentMetric> findByMetricName(String metricName);
}
