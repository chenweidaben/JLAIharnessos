/*
 * 健澜科技 jlmedaios - ICU 患者 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_management.repository;

import com.jlmedaios.monolith.icu_management.entity.ICUPatient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ICU 患者 Repository。
 */
@Repository
public interface ICUPatientRepository extends JpaRepository<ICUPatient, Long> {

    /**
     * 按状态查询 ICU 患者。
     *
     * @param status 状态
     * @return ICU 患者列表
     */
    List<ICUPatient> findByStatus(String status);

    /**
     * 按患者 ID 查询 ICU 患者。
     *
     * @param patientId 患者 ID
     * @return ICU 患者列表
     */
    List<ICUPatient> findByPatientId(String patientId);
}
