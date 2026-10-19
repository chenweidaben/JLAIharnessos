/*
 * 健澜科技 jlmedaios - 院长级 KPI Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_dashboard.repository;

import com.jlmedaios.monolith.admin_dashboard.entity.ExecutiveKPI;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 院长级 KPI Repository。
 */
@Repository
public interface ExecutiveKPIRepository extends JpaRepository<ExecutiveKPI, Long> {

    /**
     * 按类别查询院长级 KPI。
     *
     * @param category 类别
     * @return 院长级 KPI 列表
     */
    List<ExecutiveKPI> findByCategory(String category);
}
