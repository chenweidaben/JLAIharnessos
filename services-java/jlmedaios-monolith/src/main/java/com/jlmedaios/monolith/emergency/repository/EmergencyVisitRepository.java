/*
 * 健澜科技 jlmedaios - 急诊就诊 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emergency.repository;

import com.jlmedaios.monolith.emergency.entity.EmergencyVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 急诊就诊 Repository。
 */
@Repository
public interface EmergencyVisitRepository extends JpaRepository<EmergencyVisit, Long> {

    /**
     * 按状态查询急诊就诊。
     *
     * @param status 状态
     * @return 急诊就诊列表
     */
    List<EmergencyVisit> findByStatus(String status);

    /**
     * 按患者 ID 查询急诊就诊历史。
     *
     * @param patientId 患者 ID
     * @return 急诊就诊列表
     */
    List<EmergencyVisit> findByPatientId(Long patientId);
}
