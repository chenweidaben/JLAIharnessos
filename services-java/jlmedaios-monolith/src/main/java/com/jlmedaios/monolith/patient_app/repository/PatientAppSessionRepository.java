/*
 * 健澜科技 jlmedaios - 患者 APP 会话 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_app.repository;

import com.jlmedaios.monolith.patient_app.entity.PatientAppSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 患者 APP 会话 Repository。
 */
@Repository
public interface PatientAppSessionRepository extends JpaRepository<PatientAppSession, Long> {

    /**
     * 按患者 ID 查询患者 APP 会话。
     *
     * @param patientId 患者 ID
     * @return 患者 APP 会话列表
     */
    List<PatientAppSession> findByPatientId(String patientId);
}
