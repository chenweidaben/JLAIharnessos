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
}
