/*
 * 健澜科技 jlmedaios - 医生接诊会话 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.doctor_workstation.repository;

import com.jlmedaios.monolith.doctor_workstation.entity.DoctorSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 医生接诊会话 Repository。
 */
@Repository
public interface DoctorSessionRepository extends JpaRepository<DoctorSession, Long> {

    /**
     * 按医生 ID 查询医生接诊会话。
     *
     * @param doctorId 医生 ID
     * @return 医生接诊会话列表
     */
    List<DoctorSession> findByDoctorId(String doctorId);

    /**
     * 按状态查询医生接诊会话。
     *
     * @param status 状态
     * @return 医生接诊会话列表
     */
    List<DoctorSession> findByStatus(String status);
}
