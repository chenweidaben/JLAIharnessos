/*
 * 健澜科技 jlmedaios - 血透工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_dialysis.service;

import com.jlmedaios.monolith.blood_dialysis.entity.DialysisSession;
import com.jlmedaios.monolith.blood_dialysis.repository.DialysisSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 血透工作站 Service。
 *
 * <p>append-only: 透析记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class BloodDialysisService {

    private final DialysisSessionRepository dialysisSessionRepository;

    /**
     * 今日透析安排。
     *
     * @return 透析记录列表
     */
    public List<DialysisSession> todaySchedule() {
        return dialysisSessionRepository.findByStatus("SCHEDULED");
    }

    /**
     * 开始透析。
     *
     * @param sessionNo 透析场次编号
     * @return 已开始的透析记录
     */
    public DialysisSession startDialysis(String sessionNo) {
        DialysisSession session = findBySessionNo(sessionNo);
        if (session != null) {
            session.setStatus("IN_PROGRESS");
            session.setStartTime(LocalDateTime.now());
            return dialysisSessionRepository.save(session);
        }
        return null;
    }

    /**
     * 结束透析。
     *
     * @param sessionNo     透析场次编号
     * @param actualWeight   实际体重
     * @param ultrafiltration 脱水量
     * @param postWeight     透析后体重
     * @return 已结束的透析记录
     */
    public DialysisSession endDialysis(String sessionNo, BigDecimal actualWeight,
                                        BigDecimal ultrafiltration, BigDecimal postWeight) {
        DialysisSession session = findBySessionNo(sessionNo);
        if (session != null) {
            session.setStatus("COMPLETED");
            session.setEndTime(LocalDateTime.now());
            session.setActualWeight(actualWeight);
            session.setUltrafiltration(ultrafiltration);
            session.setPostWeight(postWeight);
            return dialysisSessionRepository.save(session);
        }
        return null;
    }

    /**
     * 患者透析历史。
     *
     * @param patientId 患者 ID
     * @return 透析记录列表
     */
    public List<DialysisSession> dialysisHistory(Long patientId) {
        return dialysisSessionRepository.findByPatientId(String.valueOf(patientId));
    }

    private DialysisSession findBySessionNo(String sessionNo) {
        return dialysisSessionRepository.findAll().stream()
                .filter(s -> sessionNo.equals(s.getSessionNo()))
                .findFirst()
                .orElse(null);
    }
}
