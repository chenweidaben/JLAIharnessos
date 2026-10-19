/*
 * 健澜科技 jlmedaios - 药学咨询 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_service.repository;

import com.jlmedaios.monolith.pharmacy_service.entity.PharmacyConsult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 药学咨询 Repository。
 */
@Repository
public interface PharmacyConsultRepository extends JpaRepository<PharmacyConsult, Long> {

    /**
     * 按患者 ID 查询药学咨询列表。
     *
     * @param patientId 患者 ID
     * @return 药学咨询列表
     */
    List<PharmacyConsult> findByPatientId(Long patientId);

    /**
     * 按咨询类型查询药学咨询列表。
     *
     * @param consultType 咨询类型
     * @return 药学咨询列表
     */
    List<PharmacyConsult> findByConsultType(String consultType);
}
