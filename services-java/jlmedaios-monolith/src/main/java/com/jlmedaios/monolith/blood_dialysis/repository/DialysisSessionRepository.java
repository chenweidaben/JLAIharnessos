/*
 * 健澜科技 jlmedaios - 透析记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_dialysis.repository;

import com.jlmedaios.monolith.blood_dialysis.entity.DialysisSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 透析记录 Repository。
 */
@Repository
public interface DialysisSessionRepository extends JpaRepository<DialysisSession, Long> {

    /**
     * 按状态查询透析记录。
     *
     * @param status 状态
     * @return 透析记录列表
     */
    List<DialysisSession> findByStatus(String status);

    /**
     * 按患者 ID 查询透析记录。
     *
     * @param patientId 患者 ID
     * @return 透析记录列表
     */
    List<DialysisSession> findByPatientId(String patientId);
}
