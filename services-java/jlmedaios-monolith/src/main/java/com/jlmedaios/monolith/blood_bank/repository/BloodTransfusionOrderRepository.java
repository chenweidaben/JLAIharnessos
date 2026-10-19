/*
 * 健澜科技 jlmedaios - 输血申请 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_bank.repository;

import com.jlmedaios.monolith.blood_bank.entity.BloodTransfusionOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 输血申请 Repository。
 */
@Repository
public interface BloodTransfusionOrderRepository extends JpaRepository<BloodTransfusionOrder, Long> {

    /**
     * 按状态查询输血申请。
     *
     * @param status 状态
     * @return 输血申请列表
     */
    List<BloodTransfusionOrder> findByStatus(String status);

    /**
     * 按患者 ID 查询输血历史。
     *
     * @param patientId 患者 ID
     * @return 输血申请列表
     */
    List<BloodTransfusionOrder> findByPatientId(Long patientId);
}
