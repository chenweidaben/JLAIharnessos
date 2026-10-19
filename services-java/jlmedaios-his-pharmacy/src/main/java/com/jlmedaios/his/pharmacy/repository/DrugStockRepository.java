/*
 * 健澜科技 jlmedaios - 药品库存 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.pharmacy.repository;

import com.jlmedaios.his.pharmacy.entity.DrugStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 药品库存 Repository。
 */
@Repository
public interface DrugStockRepository extends JpaRepository<DrugStock, Long> {

    /**
     * 按药品编码查询库存。
     *
     * @param drugCode 药品编码
     * @return 库存 Optional
     */
    Optional<DrugStock> findByDrugCode(String drugCode);
}
