/*
 * 健澜科技 jlmedaios - 急诊就诊记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.er_workstation.repository;

import com.jlmedaios.monolith.er_workstation.entity.ERVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 急诊就诊记录 Repository。
 */
@Repository
public interface ERVisitRepository extends JpaRepository<ERVisit, Long> {

    /**
     * 按状态查询急诊就诊记录。
     *
     * @param status 状态
     * @return 急诊就诊记录列表
     */
    List<ERVisit> findByStatus(String status);

    /**
     * 按患者 ID 查询急诊就诊记录。
     *
     * @param patientId 患者 ID
     * @return 急诊就诊记录列表
     */
    List<ERVisit> findByPatientId(String patientId);

    /**
     * 按就诊编号查询急诊就诊记录（P1 性能优化：替代 findAll().filter()）。
     *
     * @param visitNo 就诊编号
     * @return 急诊就诊记录
     */
    ERVisit findByVisitNo(String visitNo);
}
