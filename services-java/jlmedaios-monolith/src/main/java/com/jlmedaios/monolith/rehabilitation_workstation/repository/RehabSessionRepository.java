/*
 * 健澜科技 jlmedaios - 康复治疗记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation_workstation.repository;

import com.jlmedaios.monolith.rehabilitation_workstation.entity.RehabSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 康复治疗记录 Repository。
 */
@Repository
public interface RehabSessionRepository extends JpaRepository<RehabSession, Long> {

    /**
     * 按状态查询康复治疗记录。
     *
     * @param status 状态
     * @return 康复治疗记录列表
     */
    List<RehabSession> findByStatus(String status);

    /**
     * 按患者 ID 查询康复治疗记录。
     *
     * @param patientId 患者 ID
     * @return 康复治疗记录列表
     */
    List<RehabSession> findByPatientId(String patientId);

    /**
     * 按治疗编号查询康复治疗记录（P5 性能优化：替代 findAll().filter()）。
     *
     * @param sessionNo 治疗编号
     * @return 康复治疗记录
     */
    RehabSession findBySessionNo(String sessionNo);
}
