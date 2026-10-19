/*
 * 健澜科技 jlmedaios - 麻醉管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.anesthesia_management.service;

import com.jlmedaios.monolith.anesthesia_management.entity.AnesthesiaRecord;
import com.jlmedaios.monolith.anesthesia_management.repository.AnesthesiaRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * 麻醉管理 Service。
 *
 * <p>append-only: 麻醉记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class AnesthesiaManagementService {

    private final AnesthesiaRecordRepository anesthesiaRecordRepository;

    /**
     * 创建麻醉记录。
     *
     * @param recordNo       记录编号
     * @param scheduleNo     排台编号
     * @param patientId      患者 ID
     * @param anesthesiaType 麻醉类型
     * @param anesthesiaPlan  麻醉方案
     * @return 已持久化的麻醉记录
     */
    public AnesthesiaRecord createRecord(String recordNo, String scheduleNo, String patientId,
                                          String anesthesiaType, String anesthesiaPlan) {
        AnesthesiaRecord record = AnesthesiaRecord.builder()
                .recordNo(recordNo)
                .scheduleNo(scheduleNo)
                .patientId(patientId)
                .anesthesiaType(anesthesiaType)
                .anesthesiaPlan(anesthesiaPlan)
                .build();
        return anesthesiaRecordRepository.save(record);
    }

    /**
     * 术中监测数据。
     *
     * @param recordId           记录 ID
     * @param monitoringDataJSON 监测数据 JSON
     * @return 已更新的麻醉记录
     */
    public Optional<AnesthesiaRecord> monitor(Long recordId, String monitoringDataJSON) {
        Optional<AnesthesiaRecord> opt = anesthesiaRecordRepository.findById(recordId);
        if (opt.isPresent()) {
            AnesthesiaRecord record = opt.get();
            record.setMonitoringDataJSON(monitoringDataJSON);
            anesthesiaRecordRepository.save(record);
        }
        return opt;
    }

    /**
     * 麻醉复苏（设 recoveryTime + complications）。
     *
     * @param recordId     记录 ID
     * @param complications 并发症
     * @return 已更新的麻醉记录
     */
    public Optional<AnesthesiaRecord> recover(Long recordId, String complications) {
        Optional<AnesthesiaRecord> opt = anesthesiaRecordRepository.findById(recordId);
        if (opt.isPresent()) {
            AnesthesiaRecord record = opt.get();
            record.setRecoveryTime(LocalDateTime.now());
            record.setComplications(complications);
            anesthesiaRecordRepository.save(record);
        }
        return opt;
    }

    /**
     * 今日麻醉记录。
     *
     * @return 麻醉记录列表
     */
    public List<AnesthesiaRecord> todayRecords() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        return anesthesiaRecordRepository.findAll().stream()
                .filter(r -> r.getRecoveryTime() != null &&
                        !r.getRecoveryTime().isBefore(start) &&
                        !r.getRecoveryTime().isAfter(end))
                .toList();
    }
}
