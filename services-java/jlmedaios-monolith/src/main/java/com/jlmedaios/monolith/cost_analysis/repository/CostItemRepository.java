/*
 * 健澜科技 jlmedaios - 成本记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.cost_analysis.repository;

import com.jlmedaios.monolith.cost_analysis.entity.CostItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 成本记录 Repository。
 */
@Repository
public interface CostItemRepository extends JpaRepository<CostItem, Long> {

    /**
     * 按科室查询成本记录。
     *
     * @param department 科室
     * @return 成本记录列表
     */
    List<CostItem> findByDepartment(String department);

    /**
     * 按类别查询成本记录。
     *
     * @param category 类别
     * @return 成本记录列表
     */
    List<CostItem> findByCategory(String category);
}
