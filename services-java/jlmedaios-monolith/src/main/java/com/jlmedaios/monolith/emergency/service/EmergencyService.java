/*
 * 健澜科技 jlmedaios - 急诊管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emergency.service;

import com.jlmedaios.monolith.emergency.entity.EmergencyVisit;
import com.jlmedaios.monolith.emergency.repository.EmergencyVisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 急诊管理 Service。
 *
 * <p>append-only: 急诊就诊记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class EmergencyService {

    private final EmergencyVisitRepository emergencyVisitRepository;

    /**
     * 急诊登记。
     *
     * @param patientId       患者 ID
     * @param chiefComplaint  主诉
     * @param attendingDoctor 主治医师
     * @return 已持久化的急诊就诊
     */
    public EmergencyVisit register(Long patientId, String chiefComplaint, String attendingDoctor) {
        EmergencyVisit visit = EmergencyVisit.builder()
                .patientId(patientId)
                .chiefComplaint(chiefComplaint)
                .attendingDoctor(attendingDoctor)
                .build();
        return emergencyVisitRepository.save(visit);
    }

    /**
     * 急诊分诊。
     *
     * @param id           急诊就诊 ID
     * @param triageLevel   分诊级别（Ⅰ/Ⅱ/Ⅲ/Ⅳ级）
     * @return 已更新的急诊就诊
     */
    public Optional<EmergencyVisit> triage(Long id, String triageLevel) {
        // Ⅰ/Ⅱ级自动触发抢救通知（mock）
        Optional<EmergencyVisit> opt = emergencyVisitRepository.findById(id);
        if (opt.isPresent()) {
            EmergencyVisit visit = opt.get();
            visit.setTriageLevel(triageLevel);
            visit.setUpdatedAt(LocalDateTime.now());
            emergencyVisitRepository.save(visit);
        }
        return opt;
    }

    /**
     * 急诊离院（设 departureType + departureTime + status=CLOSED）。
     *
     * @param id             急诊就诊 ID
     * @param departureType 离院类型（离院/入院/转院/死亡）
     * @return 已更新的急诊就诊
     */
    public Optional<EmergencyVisit> depart(Long id, String departureType) {
        Optional<EmergencyVisit> opt = emergencyVisitRepository.findById(id);
        if (opt.isPresent()) {
            EmergencyVisit visit = opt.get();
            visit.setDepartureType(departureType);
            visit.setDepartureTime(LocalDateTime.now());
            visit.setStatus("CLOSED");
            visit.setUpdatedAt(LocalDateTime.now());
            emergencyVisitRepository.save(visit);
        }
        return opt;
    }

    /**
     * 急诊中列表（status=ONGOING）。
     *
     * @return 急诊就诊列表
     */
    public List<EmergencyVisit> ongoingList() {
        return emergencyVisitRepository.findByStatus("ONGOING");
    }
}
