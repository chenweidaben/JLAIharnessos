/*
 * 健澜科技 jlmedaios - 诊疗 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.encounter.service;

import com.jlmedaios.monolith.encounter.entity.EncounterRecord;
import com.jlmedaios.monolith.encounter.repository.EncounterRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 诊疗 Service。
 */
@Service
@RequiredArgsConstructor
public class EncounterService {

    private final EncounterRecordRepository encounterRecordRepository;

    /**
     * 记录一次诊疗（append-only，创建后不可修改）。
     *
     * @param patientId       患者 ID
     * @param visitId         就诊 ID
     * @param deptCode        科室编码
     * @param doctorName       医生姓名
     * @param chiefComplaint  主诉
     * @param diagnosis       诊断
     * @param ordersSnapshot  医嘱快照（JSON 字符串）
     * @param chargeSnapshot  收费快照（JSON 字符串）
     * @param outcome         转归（治愈/好转/未愈/转院）
     * @param durationMinutes  诊疗时长（分钟）
     * @return 已持久化的诊疗记录
     */
    public EncounterRecord recordEncounter(Long patientId, Long visitId, String deptCode,
                                           String doctorName, String chiefComplaint, String diagnosis,
                                           String ordersSnapshot, String chargeSnapshot,
                                           String outcome, Integer durationMinutes) {
        EncounterRecord record = EncounterRecord.builder()
                .patientId(patientId)
                .visitId(visitId)
                .deptCode(deptCode)
                .doctorName(doctorName)
                .chiefComplaint(chiefComplaint)
                .diagnosis(diagnosis)
                .ordersSnapshot(ordersSnapshot)
                .chargeSnapshot(chargeSnapshot)
                .outcome(outcome)
                .durationMinutes(durationMinutes)
                .build();
        return encounterRecordRepository.save(record);
    }

    /**
     * 按 ID 查询诊疗记录。
     *
     * @param id 诊疗记录 ID
     * @return 诊疗记录 Optional
     */
    public Optional<EncounterRecord> getEncounter(Long id) {
        return encounterRecordRepository.findById(id);
    }

    /**
     * 按患者 ID 查询诊疗记录列表。
     *
     * @param patientId 患者 ID
     * @return 诊疗记录列表
     */
    public List<EncounterRecord> listByPatient(Long patientId) {
        return encounterRecordRepository.findByPatientId(patientId);
    }

    /**
     * 按科室统计诊疗数据（总数/治愈数/好转数/平均时长）。
     *
     * @param deptCode 科室编码
     * @return 统计结果 Map
     */
    public Map<String, Object> getStatistics(String deptCode) {
        List<EncounterRecord> records = encounterRecordRepository.findByDeptCode(deptCode);

        long total = records.size();
        long cured = records.stream().filter(r -> "治愈".equals(r.getOutcome())).count();
        long improved = records.stream().filter(r -> "好转".equals(r.getOutcome())).count();
        double avgDuration = records.stream()
                .mapToInt(r -> r.getDurationMinutes() != null ? r.getDurationMinutes() : 0)
                .average()
                .orElse(0);

        Map<String, Object> stats = new HashMap<>();
        stats.put("deptCode", deptCode);
        stats.put("total", total);
        stats.put("cured", cured);
        stats.put("improved", improved);
        stats.put("avgDurationMinutes", Math.round(avgDuration * 100.0) / 100.0);
        return stats;
    }
}
