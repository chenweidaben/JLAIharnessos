/*
 * 健澜科技 jlmedaios - 血库库存 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_bank.repository;

import com.jlmedaios.monolith.blood_bank.entity.BloodInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 血库库存 Repository。
 */
@Repository
public interface BloodInventoryRepository extends JpaRepository<BloodInventory, Long> {

    /**
     * 按状态查询库存。
     *
     * @param status 状态
     * @return 库存列表
     */
    List<BloodInventory> findByStatus(String status);

    /**
     * 按过期日期查询即将过期的血液。
     *
     * @param date 截止日期
     * @return 库存列表
     */
    List<BloodInventory> findByExpiryDateBefore(LocalDate date);
}
