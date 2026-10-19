/*
 * 健澜科技 jlmedaios - 处方配送 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.prescription_delivery.repository;

import com.jlmedaios.monolith.prescription_delivery.entity.PrescriptionDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 处方配送 Repository。
 */
@Repository
public interface PrescriptionDeliveryRepository extends JpaRepository<PrescriptionDelivery, Long> {

    /**
     * 按状态查询配送。
     *
     * @param status 状态
     * @return 配送列表
     */
    List<PrescriptionDelivery> findByStatus(String status);

    /**
     * 按患者 ID 查询配送。
     *
     * @param patientId 患者 ID
     * @return 配送列表
     */
    List<PrescriptionDelivery> findByPatientId(Long patientId);
}
