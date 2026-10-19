/*
 * 健澜科技 jlmedaios - 物资耗材 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.material.repository;

import com.jlmedaios.monolith.material.entity.MaterialItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 物资耗材 Repository。
 */
@Repository
public interface MaterialItemRepository extends JpaRepository<MaterialItem, Long> {

    /**
     * 按物资编码查询。
     *
     * @param materialCode 物资编码
     * @return 物资 Optional
     */
    Optional<MaterialItem> findByMaterialCode(String materialCode);

    /**
     * 低库存预警（库存低于安全库存）。
     *
     * @param safetyStock 安全库存阈值
     * @return 低库存物资列表
     */
    List<MaterialItem> findByStockQuantityLessThan(int safetyStock);
}
