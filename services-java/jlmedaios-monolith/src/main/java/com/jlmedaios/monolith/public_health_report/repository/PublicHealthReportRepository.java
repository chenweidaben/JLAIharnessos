/*
 * 健澜科技 jlmedaios - 公共卫生上报 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.public_health_report.repository;

import com.jlmedaios.monolith.public_health_report.entity.PublicHealthReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 公共卫生上报 Repository。
 */
@Repository
public interface PublicHealthReportRepository extends JpaRepository<PublicHealthReport, Long> {

    /**
     * 按状态查询上报。
     *
     * @param status 状态
     * @return 上报列表
     */
    List<PublicHealthReport> findByStatus(String status);

    /**
     * 按上报类型查询上报。
     *
     * @param reportType 上报类型
     * @return 上报列表
     */
    List<PublicHealthReport> findByReportType(String reportType);
}
