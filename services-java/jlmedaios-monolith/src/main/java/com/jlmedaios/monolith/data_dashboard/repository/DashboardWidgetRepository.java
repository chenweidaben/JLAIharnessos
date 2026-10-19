/*
 * 健澜科技 jlmedaios - 看板部件 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_dashboard.repository;

import com.jlmedaios.monolith.data_dashboard.entity.DashboardWidget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 看板部件 Repository。
 */
@Repository
public interface DashboardWidgetRepository extends JpaRepository<DashboardWidget, Long> {

    /**
     * 按科室编码查询看板部件。
     *
     * @param deptCode 科室编码
     * @return 看板部件列表
     */
    List<DashboardWidget> findByDeptCode(String deptCode);
}
