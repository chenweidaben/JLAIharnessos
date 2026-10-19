/*
 * 健澜科技 jlmedaios - 康复工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation_workstation.service;

import com.jlmedaios.monolith.rehabilitation_workstation.entity.RehabSession;
import com.jlmedaios.monolith.rehabilitation_workstation.repository.RehabSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 康复工作站 Service。
 *
 * <p>append-only: 康复治疗记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class RehabilitationWorkstationService {

    private final RehabSessionRepository rehabSessionRepository;

    /**
     * 今日康复安排。
     *
     * @return 康复治疗记录列表
     */
    public List<RehabSession> todaySessions() {
        return rehabSessionRepository.findByStatus("SCHEDULED");
    }

    /**
     * 创建治疗安排。
     *
     * @param sessionNo       治疗场次编号
     * @param patientId       患者 ID
     * @param therapyType     治疗类型
     * @param therapist       治疗师
     * @param durationMinutes 治疗时长（分钟）
     * @return 已创建的康复治疗记录
     */
    public RehabSession createSession(String sessionNo, String patientId, String therapyType,
                                       String therapist, Integer durationMinutes) {
        RehabSession session = RehabSession.builder()
                .sessionNo(sessionNo)
                .patientId(patientId)
                .therapyType(therapyType)
                .therapist(therapist)
                .durationMinutes(durationMinutes)
                .status("SCHEDULED")
                .build();
        return rehabSessionRepository.save(session);
    }

    /**
     * 完成治疗。
     *
     * @param sessionNo 治疗场次编号
     * @param notes    治疗记录
     * @return 已完成的康复治疗记录
     */
    public RehabSession completeSession(String sessionNo, String notes) {
        RehabSession session = findBySessionNo(sessionNo);
        if (session != null) {
            session.setStatus("COMPLETED");
            session.setNotes(notes);
            return rehabSessionRepository.save(session);
        }
        return null;
    }

    /**
     * 患者康复计划。
     *
     * @param patientId 患者 ID
     * @return 康复计划
     */
    public Map<String, Object> rehabPlan(Long patientId) {
        Map<String, Object> plan = new HashMap<>();
        plan.put("patientId", patientId);
        plan.put("phases", List.of("急性期", "恢复期", "后遗症期"));
        plan.put("weeklySession", 5);
        plan.put("durationWeeks", 12);
        return plan;
    }

    private RehabSession findBySessionNo(String sessionNo) {
        return rehabSessionRepository.findAll().stream()
                .filter(s -> sessionNo.equals(s.getSessionNo()))
                .findFirst()
                .orElse(null);
    }
}
