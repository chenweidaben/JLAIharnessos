/*
 * 健澜科技 jlmedaios - 检验申请单 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_advanced.repository;

import com.jlmedaios.monolith.lab_advanced.entity.LabOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 检验申请单 Repository。
 */
@Repository
public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {

    /**
     * 按状态查询申请单。
     *
     * @param status 状态
     * @return 申请单列表
     */
    List<LabOrder> findByStatus(String status);

    /**
     * 按患者 ID 查询申请单。
     *
     * @param patientId 患者 ID
     * @return 申请单列表
     */
    List<LabOrder> findByPatientId(String patientId);
}
