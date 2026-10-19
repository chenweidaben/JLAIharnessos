/*
 * 健澜科技 jlmedaios - 放射报告 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_report.repository;

import com.jlmedaios.monolith.radiology_report.entity.RadiologyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 放射报告 Repository。
 */
@Repository
public interface RadiologyReportRepository extends JpaRepository<RadiologyReport, Long> {

    /**
     * 按患者 ID 查询放射报告。
     *
     * @param patientId 患者 ID
     * @return 放射报告列表
     */
    List<RadiologyReport> findByPatientId(Long patientId);

    /**
     * 按状态查询放射报告。
     *
     * @param status 状态
     * @return 放射报告列表
     */
    List<RadiologyReport> findByStatus(String status);
}
