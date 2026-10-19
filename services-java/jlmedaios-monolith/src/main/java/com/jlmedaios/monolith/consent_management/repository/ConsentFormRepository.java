/*
 * 健澜科技 jlmedaios - 知情同意书 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consent_management.repository;

import com.jlmedaios.monolith.consent_management.entity.ConsentForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 知情同意书 Repository。
 */
@Repository
public interface ConsentFormRepository extends JpaRepository<ConsentForm, Long> {

    /**
     * 按患者 ID 查询知情同意书。
     *
     * @param patientId 患者 ID
     * @return 知情同意书列表
     */
    List<ConsentForm> findByPatientId(String patientId);

    /**
     * 按状态查询知情同意书。
     *
     * @param status 状态
     * @return 知情同意书列表
     */
    List<ConsentForm> findByStatus(String status);
}
