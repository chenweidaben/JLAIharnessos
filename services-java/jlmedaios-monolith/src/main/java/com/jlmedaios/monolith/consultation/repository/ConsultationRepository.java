/*
 * 健澜科技 jlmedaios - 会诊 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consultation.repository;

import com.jlmedaios.monolith.consultation.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 会诊 Repository。
 */
@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    /**
     * 按状态查询会诊。
     *
     * @param status 状态
     * @return 会诊列表
     */
    List<Consultation> findByStatus(String status);

    /**
     * 按目标科室查询会诊。
     *
     * @param targetDept 目标科室
     * @return 会诊列表
     */
    List<Consultation> findByTargetDept(String targetDept);
}
