/*
 * 健澜科技 jlmedaios - 不良事件上报 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.incident_report.repository;

import com.jlmedaios.monolith.incident_report.entity.IncidentReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 不良事件上报 Repository。
 */
@Repository
public interface IncidentReportRepository extends JpaRepository<IncidentReport, Long> {

    /**
     * 按状态查询不良事件。
     *
     * @param status 状态
     * @return 不良事件列表
     */
    List<IncidentReport> findByStatus(String status);

    /**
     * 按事件类型查询不良事件。
     *
     * @param eventType 事件类型
     * @return 不良事件列表
     */
    List<IncidentReport> findByEventType(String eventType);
}
