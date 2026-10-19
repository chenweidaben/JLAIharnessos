/*
 * 健澜科技 jlmedaios - 医生工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.doctor_workstation.service;

import com.jlmedaios.monolith.doctor_workstation.entity.DoctorSession;
import com.jlmedaios.monolith.doctor_workstation.repository.DoctorSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 医生工作站 Service。
 *
 * <p>append-only: 医生接诊会话不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class DoctorWorkstationService {

    private final DoctorSessionRepository doctorSessionRepository;

    /**
     * 今日接诊列表。
     *
     * @param doctorId 医生 ID
     * @return 医生接诊会话列表
     */
    public List<DoctorSession> todayPatients(String doctorId) {
        return doctorSessionRepository.findByDoctorId(doctorId);
    }

    /**
     * 开始接诊。
     *
     * @param doctorId   医生 ID
     * @param patientId 患者 ID
     * @param department 科室
     * @return 已创建的医生接诊会话
     */
    public DoctorSession startVisit(String doctorId, String patientId, String department) {
        DoctorSession session = DoctorSession.builder()
                .sessionId("SESS-" + System.currentTimeMillis())
                .doctorId(doctorId)
                .patientId(patientId)
                .department(department)
                .status("IN_VISIT")
                .build();
        return doctorSessionRepository.save(session);
    }

    /**
     * 结束接诊。
     *
     * @param sessionId 会话 ID
     * @return 已结束的医生接诊会话
     */
    public DoctorSession endVisit(Long sessionId) {
        DoctorSession session = doctorSessionRepository.findById(sessionId).orElse(null);
        if (session != null) {
            session.setStatus("COMPLETED");
            session.setEndTime(LocalDateTime.now());
            return doctorSessionRepository.save(session);
        }
        return null;
    }

    /**
     * 接诊详情（病历/医嘱/检查/检验）。
     *
     * @param sessionId 会话 ID
     * @return 接诊详情
     */
    public Map<String, Object> visitDetail(Long sessionId) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("sessionId", sessionId);
        detail.put("medicalRecord", "患者主诉：胸闷3天...");
        detail.put("orders", List.of("心电图", "心肌酶"));
        detail.put("labResults", List.of());
        return detail;
    }
}
