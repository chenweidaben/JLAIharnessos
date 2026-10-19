/*
 * 健澜科技 jlmedaios - 在线咨询 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.online_consultation.repository;

import com.jlmedaios.monolith.online_consultation.entity.OnlineConsultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 在线咨询 Repository。
 */
@Repository
public interface OnlineConsultationRepository extends JpaRepository<OnlineConsultation, Long> {

    /**
     * 按状态查询咨询。
     *
     * @param status 状态
     * @return 咨询列表
     */
    List<OnlineConsultation> findByStatus(String status);

    /**
     * 按患者 ID 查询咨询。
     *
     * @param patientId 患者 ID
     * @return 咨询列表
     */
    List<OnlineConsultation> findByPatientId(String patientId);
}
