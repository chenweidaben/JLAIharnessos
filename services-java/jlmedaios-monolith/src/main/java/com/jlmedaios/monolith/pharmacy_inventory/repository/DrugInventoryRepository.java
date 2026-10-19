/*
 * 健澜科技 jlmedaios - 药品库存 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_inventory.repository;

import com.jlmedaios.monolith.pharmacy_inventory.entity.DrugInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 药品库存 Repository。
 */
@Repository
public interface DrugInventoryRepository extends JpaRepository<DrugInventory, Long> {

    /**
     * 低库存预警。
     *
     * @param safetyStock 安全库存阈值
     * @return 低库存药品列表
     */
    List<DrugInventory> findByStockQuantityLessThan(int safetyStock);

    /**
     * 近效期预警。
     *
     * @param date 截止日期
     * @return 近效期药品列表
     */
    List<DrugInventory> findByExpiryDateBefore(LocalDate date);
}
