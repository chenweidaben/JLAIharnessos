/*
 * 健澜科技 jlmedaios - 影像申请单 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_advanced.repository;

import com.jlmedaios.monolith.radiology_advanced.entity.RadiologyOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 影像申请单 Repository。
 */
@Repository
public interface RadiologyOrderRepository extends JpaRepository<RadiologyOrder, Long> {

    /**
     * 按状态查询申请单。
     *
     * @param status 状态
     * @return 申请单列表
     */
    List<RadiologyOrder> findByStatus(String status);

    /**
     * 按患者 ID 查询申请单。
     *
     * @param patientId 患者 ID
     * @return 申请单列表
     */
    List<RadiologyOrder> findByPatientId(String patientId);
}
