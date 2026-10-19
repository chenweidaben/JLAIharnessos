/*
 * 健澜科技 jlmedaios - 急诊高级 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emergency_advanced.service;

import com.jlmedaios.monolith.emergency_advanced.entity.EmergencyVisit;
import com.jlmedaios.monolith.emergency_advanced.repository.EmergencyVisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 急诊高级 Service。
 *
 * <p>append-only: 急诊就诊记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class EmergencyAdvancedService {

    private final EmergencyVisitRepository emergencyVisitRepository;

    /**
     * 急诊登记。
     *
     * @param visitNo        就诊编号
     * @param patientId       患者 ID
     * @param chiefComplaint  主诉
     * @return 已持久化的就诊记录
     */
    public EmergencyVisit register(String visitNo, String patientId, String chiefComplaint) {
        EmergencyVisit visit = EmergencyVisit.builder()
                .visitNo(visitNo)
                .patientId(patientId)
                .chiefComplaint(chiefComplaint)
                .build();
        return emergencyVisitRepository.save(visit);
    }

    /**
     * 分诊（status=TRIAGED）。
     *
     * @param visitId      就诊记录 ID
     * @param triageLevel  分诊级别
     * @return 已更新的就诊记录
     */
    public Optional<EmergencyVisit> triage(Long visitId, String triageLevel) {
        Optional<EmergencyVisit> opt = emergencyVisitRepository.findById(visitId);
        if (opt.isPresent()) {
            EmergencyVisit visit = opt.get();
            visit.setTriageLevel(triageLevel);
            visit.setStatus("TRIAGED");
            emergencyVisitRepository.save(visit);
        }
        return opt;
    }

    /**
     * 转归（status=TRANSFERRED）。
     *
     * @param visitId    就诊记录 ID
     * @param transferTo 转归去向
     * @return 已更新的就诊记录
     */
    public Optional<EmergencyVisit> transfer(Long visitId, String transferTo) {
        Optional<EmergencyVisit> opt = emergencyVisitRepository.findById(visitId);
        if (opt.isPresent()) {
            EmergencyVisit visit = opt.get();
            visit.setTransferTo(transferTo);
            visit.setStatus("TRANSFERRED");
            emergencyVisitRepository.save(visit);
        }
        return opt;
    }

    /**
     * 急诊统计。
     *
     * @return 统计结果
     */
    public Map<String, Object> stats() {
        List<EmergencyVisit> all = emergencyVisitRepository.findAll();
        Map<String, Object> result = new HashMap<>();
        result.put("total_visits", all.size());
        result.put("by_triage_level", emergencyVisitRepository.findByTriageLevel("Ⅰ级濒危").size()
                + emergencyVisitRepository.findByTriageLevel("Ⅱ级危重").size()
                + emergencyVisitRepository.findByTriageLevel("Ⅲ级急症").size());
        result.put("by_transfer", emergencyVisitRepository.findByStatus("TRANSFERRED").size());
        return result;
    }
}
