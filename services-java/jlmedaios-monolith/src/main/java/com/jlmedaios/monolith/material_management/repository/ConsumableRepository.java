/*
 * 健澜科技 jlmedaios - 耗材 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material_management.repository;

import com.jlmedaios.monolith.material_management.entity.Consumable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 耗材 Repository。
 */
@Repository
public interface ConsumableRepository extends JpaRepository<Consumable, Long> {

    /**
     * 按类别查询耗材。
     *
     * @param category 类别
     * @return 耗材列表
     */
    List<Consumable> findByCategory(String category);

    /**
     * 按库存低于预警值查询耗材。
     *
     * @param warningLevel 预警值
     * @return 耗材列表
     */
    List<Consumable> findByStockQuantityLessThan(int warningLevel);
}
