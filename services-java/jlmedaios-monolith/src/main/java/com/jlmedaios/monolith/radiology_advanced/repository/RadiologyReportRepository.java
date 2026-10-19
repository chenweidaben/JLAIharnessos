/*
 * 健澜科技 jlmedaios - 影像报告 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_advanced.repository;

import com.jlmedaios.monolith.radiology_advanced.entity.RadiologyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 影像报告 Repository。
 */
@Repository
public interface RadiologyReportRepository extends JpaRepository<RadiologyReport, Long> {

    /**
     * 按申请单编号查询报告。
     *
     * @param orderNo 申请单编号
     * @return 报告
     */
    Optional<RadiologyReport> findByOrderNo(String orderNo);
}
