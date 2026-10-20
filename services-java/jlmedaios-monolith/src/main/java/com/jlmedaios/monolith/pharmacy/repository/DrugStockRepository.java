/*
 * 健澜科技 jlmedaios - 药品库存 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy.repository;

import com.jlmedaios.monolith.pharmacy.entity.DrugStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 药品库存 Repository。
 */
@Repository
public interface DrugStockRepository extends JpaRepository<DrugStock, Long> {

    /**
     * 按药品编码查询药品库存（P5 性能优化：替代 findAll().filter()）。
     *
     * @param drugCode 药品编码
     * @return 药品库存
     */
    DrugStock findByDrugCode(String drugCode);
}
