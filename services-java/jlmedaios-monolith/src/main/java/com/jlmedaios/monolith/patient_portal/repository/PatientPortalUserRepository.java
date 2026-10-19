/*
 * 健澜科技 jlmedaios - 患者门户用户 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_portal.repository;

import com.jlmedaios.monolith.patient_portal.entity.PatientPortalUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 患者门户用户 Repository。
 */
@Repository
public interface PatientPortalUserRepository extends JpaRepository<PatientPortalUser, Long> {

    /**
     * 按患者 ID 查询门户用户。
     *
     * @param patientId 患者 ID
     * @return 门户用户 Optional
     */
    Optional<PatientPortalUser> findByPatientId(Long patientId);

    /**
     * 按手机号查询门户用户。
     *
     * @param phone 手机号
     * @return 门户用户 Optional
     */
    Optional<PatientPortalUser> findByPhone(String phone);
}
