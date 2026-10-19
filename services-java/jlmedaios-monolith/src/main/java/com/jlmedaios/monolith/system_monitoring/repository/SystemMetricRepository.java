/*
 * 健澜科技 jlmedaios - 系统监控指标 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.system_monitoring.repository;

import com.jlmedaios.monolith.system_monitoring.entity.SystemMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 系统监控指标 Repository。
 */
@Repository
public interface SystemMetricRepository extends JpaRepository<SystemMetric, Long> {

    /**
     * 按状态查询监控指标。
     *
     * @param status 状态
     * @return 监控指标列表
     */
    List<SystemMetric> findByStatus(String status);

    /**
     * 按服务名查询监控指标。
     *
     * @param serviceName 服务名
     * @return 监控指标列表
     */
    List<SystemMetric> findByServiceName(String serviceName);
}
