/*
 * 健澜科技 jlmedaios - 教育材料推送记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_education.repository;

import com.jlmedaios.monolith.patient_education.entity.EducationDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 教育材料推送记录 Repository。
 */
@Repository
public interface EducationDeliveryRepository extends JpaRepository<EducationDelivery, Long> {

    /**
     * 按患者 ID 查询推送记录。
     *
     * @param patientId 患者 ID
     * @return 推送记录列表
     */
    List<EducationDelivery> findByPatientId(Long patientId);
}
