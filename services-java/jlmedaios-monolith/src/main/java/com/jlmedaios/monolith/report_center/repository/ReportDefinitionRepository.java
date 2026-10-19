/*
 * 健澜科技 jlmedaios - 报表定义 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.report_center.repository;

import com.jlmedaios.monolith.report_center.entity.ReportDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 报表定义 Repository。
 */
@Repository
public interface ReportDefinitionRepository extends JpaRepository<ReportDefinition, Long> {

    /**
     * 按报表类别查询。
     *
     * @param reportCategory 报表类别
     * @return 报表定义列表
     */
    List<ReportDefinition> findByReportCategory(String reportCategory);
}
