/*
 * 健澜科技 jlmedaios - 手术 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery.service;

import com.jlmedaios.monolith.surgery.entity.SurgeryRecord;
import com.jlmedaios.monolith.surgery.repository.SurgeryRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * 手术 Service。
 */
@Service
@RequiredArgsConstructor
public class SurgeryService {

    private final SurgeryRecordRepository surgeryRecordRepository;

    /**
     * 排手术。
     *
     * @param patientId       患者 ID
     * @param surgeryName    手术名称
     * @param doctorName      主刀医生
     * @param anesthesiologist 麻醉医生
     * @return 已持久化的手术记录
     */
    public SurgeryRecord schedule(Long patientId, String surgeryName,
                                  String doctorName, String anesthesiologist) {
        SurgeryRecord record = SurgeryRecord.builder()
                .patientId(patientId)
                .surgeryName(surgeryName)
                .doctorName(doctorName)
                .anesthesiologist(anesthesiologist)
                .build();
        return surgeryRecordRepository.save(record);
    }

    /**
     * 开始手术（status → IN_PROGRESS + startTime=now）。
     *
     * @param id 手术记录 ID
     * @return 更新后的手术记录
     */
    public Optional<SurgeryRecord> start(Long id) {
        Optional<SurgeryRecord> opt = surgeryRecordRepository.findById(id);
        opt.ifPresent(r -> {
            r.setStatus("IN_PROGRESS");
            r.setStartTime(LocalDateTime.now());
            surgeryRecordRepository.save(r);
        });
        return opt;
    }

    /**
     * 完成手术（status → FINISHED + endTime=now）。
     *
     * @param id 手术记录 ID
     * @return 更新后的手术记录
     */
    public Optional<SurgeryRecord> finish(Long id) {
        Optional<SurgeryRecord> opt = surgeryRecordRepository.findById(id);
        opt.ifPresent(r -> {
            r.setStatus("FINISHED");
            r.setEndTime(LocalDateTime.now());
            surgeryRecordRepository.save(r);
        });
        return opt;
    }

    /**
     * 查今日手术列表。
     *
     * @return 今日手术记录列表
     */
    public List<SurgeryRecord> today() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return surgeryRecordRepository.findByStartTimeBetween(startOfDay, endOfDay);
    }
}
