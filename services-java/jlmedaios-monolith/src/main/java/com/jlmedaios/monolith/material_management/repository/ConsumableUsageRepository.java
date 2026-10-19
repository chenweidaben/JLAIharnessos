/*
 * 健澜科技 jlmedaios - 耗材使用记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material_management.repository;

import com.jlmedaios.monolith.material_management.entity.ConsumableUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 耗材使用记录 Repository。
 */
@Repository
public interface ConsumableUsageRepository extends JpaRepository<ConsumableUsage, Long> {

    /**
     * 按科室查询耗材使用记录。
     *
     * @param department 科室
     * @return 使用记录列表
     */
    List<ConsumableUsage> findByDepartment(String department);
}
