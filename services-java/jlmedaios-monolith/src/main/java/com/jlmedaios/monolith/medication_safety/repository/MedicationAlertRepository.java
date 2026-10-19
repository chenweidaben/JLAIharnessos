/*
 * 健澜科技 jlmedaios - 用药安全预警 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medication_safety.repository;

import com.jlmedaios.monolith.medication_safety.entity.MedicationAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 用药安全预警 Repository。
 */
@Repository
public interface MedicationAlertRepository extends JpaRepository<MedicationAlert, Long> {

    /**
     * 按状态查询用药安全预警。
     *
     * @param status 状态
     * @return 用药安全预警列表
     */
    List<MedicationAlert> findByStatus(String status);

    /**
     * 按严重程度查询用药安全预警。
     *
     * @param severity 严重程度
     * @return 用药安全预警列表
     */
    List<MedicationAlert> findBySeverity(String severity);
}
