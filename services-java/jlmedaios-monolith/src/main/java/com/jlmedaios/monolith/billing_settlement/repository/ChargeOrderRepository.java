/*
 * 健澜科技 jlmedaios - 缴费单 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_settlement.repository;

import com.jlmedaios.monolith.billing_settlement.entity.ChargeOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 缴费单 Repository。
 */
@Repository
public interface ChargeOrderRepository extends JpaRepository<ChargeOrder, Long> {

    /**
     * 按状态查询缴费单。
     *
     * @param status 状态
     * @return 缴费单列表
     */
    List<ChargeOrder> findByStatus(String status);

    /**
     * 按患者 ID 查询缴费单。
     *
     * @param patientId 患者 ID
     * @return 缴费单列表
     */
    List<ChargeOrder> findByPatientId(String patientId);
}
