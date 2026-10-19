/*
 * 健澜科技 jlmedaios - 护理记录 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_record.service;

import com.jlmedaios.monolith.nursing_record.entity.NursingRecord;
import com.jlmedaios.monolith.nursing_record.repository.NursingRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 护理记录 Service。
 */
@Service
@RequiredArgsConstructor
public class NursingRecordService {

    private final NursingRecordRepository nursingRecordRepository;

    /**
     * 创建护理记录（append-only）。
     *
     * @param patientId   患者 ID
     * @param wardCode    病区编码
     * @param recordType  记录类型
     * @param contentText 内容
     * @param nurseId     护士工号
     * @return 已持久化的护理记录
     */
    public NursingRecord create(Long patientId, String wardCode, String recordType,
                                 String contentText, String nurseId) {
        NursingRecord record = NursingRecord.builder()
                .patientId(patientId)
                .wardCode(wardCode)
                .recordType(recordType)
                .contentText(contentText)
                .nurseId(nurseId)
                .build();
        return nursingRecordRepository.save(record);
    }

    /**
     * 按患者 ID 查询护理记录列表。
     *
     * @param patientId 患者 ID
     * @return 护理记录列表
     */
    public List<NursingRecord> listByPatient(Long patientId) {
        return nursingRecordRepository.findByPatientId(patientId);
    }

    /**
     * 今日某病区护理记录。
     *
     * @param wardCode 病区编码
     * @return 护理记录列表
     */
    public List<NursingRecord> todayWard(String wardCode) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return nursingRecordRepository
                .findByWardCodeAndRecordTimeBetween(wardCode, startOfDay, endOfDay);
    }
}
