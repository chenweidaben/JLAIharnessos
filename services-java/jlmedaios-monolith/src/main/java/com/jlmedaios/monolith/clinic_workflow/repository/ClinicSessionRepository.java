/*
 * 健澜科技 jlmedaios - 门诊就诊会话 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinic_workflow.repository;

import com.jlmedaios.monolith.clinic_workflow.entity.ClinicSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 门诊就诊会话 Repository。
 */
@Repository
public interface ClinicSessionRepository extends JpaRepository<ClinicSession, Long> {

    /**
     * 按状态查询就诊会话。
     *
     * @param status 状态
     * @return 就诊会话列表
     */
    List<ClinicSession> findByStatus(String status);
}
