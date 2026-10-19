/*
 * 健澜科技 jlmedaios - 药品 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_management.repository;

import com.jlmedaios.monolith.drug_management.entity.Drug;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 药品 Repository。
 */
@Repository
public interface DrugRepository extends JpaRepository<Drug, Long> {

    /**
     * 按状态查询药品。
     *
     * @param status 状态
     * @return 药品列表
     */
    List<Drug> findByStatus(String status);

    /**
     * 按库存低于预警值查询药品。
     *
     * @param warningLevel 预警值
     * @return 药品列表
     */
    List<Drug> findByStockQuantityLessThan(int warningLevel);
}
