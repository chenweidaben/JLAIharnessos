/*
 * 健澜科技 jlmedaios - 患者消息 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_portal.repository;

import com.jlmedaios.monolith.patient_portal.entity.PatientMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 患者消息 Repository。
 */
@Repository
public interface PatientMessageRepository extends JpaRepository<PatientMessage, Long> {

    /**
     * 按患者 ID 查询消息。
     *
     * @param patientId 患者 ID
     * @return 消息列表
     */
    List<PatientMessage> findByPatientId(String patientId);

    /**
     * 按已读状态查询消息。
     *
     * @param readStatus 已读状态
     * @return 消息列表
     */
    List<PatientMessage> findByReadStatus(String readStatus);
}
