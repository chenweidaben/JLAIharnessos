/*
 * 健澜科技 jlmedaios - 采购记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_management.repository;

import com.jlmedaios.monolith.drug_management.entity.DrugPurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 采购记录 Repository。
 */
@Repository
public interface DrugPurchaseRepository extends JpaRepository<DrugPurchase, Long> {

    /**
     * 按状态查询采购记录。
     *
     * @param status 状态
     * @return 采购记录列表
     */
    List<DrugPurchase> findByStatus(String status);
}
