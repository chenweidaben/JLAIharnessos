/*
 * 健澜科技 jlmedaios - 急诊就诊 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emergency_advanced.repository;

import com.jlmedaios.monolith.emergency_advanced.entity.EmergencyVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 急诊就诊 Repository。
 */
@Repository
public interface EmergencyVisitRepository extends JpaRepository<EmergencyVisit, Long> {

    /**
     * 按状态查询就诊记录。
     *
     * @param status 状态
     * @return 就诊记录列表
     */
    List<EmergencyVisit> findByStatus(String status);

    /**
     * 按分诊级别查询就诊记录。
     *
     * @param triageLevel 分诊级别
     * @return 就诊记录列表
     */
    List<EmergencyVisit> findByTriageLevel(String triageLevel);
}
