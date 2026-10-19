/*
 * 健澜科技 jlmedaios - 移动查房 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.mobile_rounds.service;

import com.jlmedaios.monolith.mobile_rounds.entity.RoundRecord;
import com.jlmedaios.monolith.mobile_rounds.repository.RoundRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 移动查房 Service。
 *
 * <p>append-only: 查房记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class MobileRoundsService {

    private final RoundRecordRepository roundRecordRepository;

    /**
     * 创建查房记录。
     *
     * @param patientId  患者 ID
     * @param wardCode  病区编码
     * @param doctorId   医生工号
     * @param roundType  查房类型
     * @param findings   查房所见
     * @param plan       诊疗计划
     * @return 已持久化的查房记录
     */
    public RoundRecord create(Long patientId, String wardCode, String doctorId,
                              String roundType, String findings, String plan) {
        RoundRecord record = RoundRecord.builder()
                .patientId(patientId)
                .wardCode(wardCode)
                .doctorId(doctorId)
                .roundType(roundType)
                .findings(findings)
                .plan(plan)
                .build();
        return roundRecordRepository.save(record);
    }

    /**
     * 今日某病区查房记录。
     *
     * @param wardCode 病区编码
     * @return 查房记录列表
     */
    public List<RoundRecord> todayWard(String wardCode) {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        return roundRecordRepository.findByWardCodeAndRoundTimeBetween(wardCode, start, end);
    }

    /**
     * 患者查房历史。
     *
     * @param patientId 患者 ID
     * @return 查房记录列表
     */
    public List<RoundRecord> patientHistory(Long patientId) {
        return roundRecordRepository.findByPatientId(patientId);
    }

    /**
     * 记录移动查房（含生命体征）。
     *
     * @param roundNo      查房编号
     * @param patientId     患者 ID
     * @param nurseId       护士工号
     * @param roundType     查房类型
     * @param temperature   体温
     * @param bloodPressure 血压
     * @param heartRate     心率
     * @param spo2          血氧
     * @param nurseNotes    护士记录
     * @return 已持久化的查房记录
     */
    public RoundRecord recordRound(String roundNo, Long patientId, String nurseId,
                                    String roundType, BigDecimal temperature, String bloodPressure,
                                    Integer heartRate, Integer spo2, String nurseNotes) {
        RoundRecord record = RoundRecord.builder()
                .roundNo(roundNo)
                .patientId(patientId)
                .nurseId(nurseId)
                .roundType(roundType)
                .temperature(temperature)
                .bloodPressure(bloodPressure)
                .heartRate(heartRate)
                .spo2(spo2)
                .nurseNotes(nurseNotes)
                .build();
        return roundRecordRepository.save(record);
    }

    /**
     * 今日查房记录。
     *
     * @return 查房记录列表
     */
    public List<RoundRecord> todayRounds() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        return roundRecordRepository.findByRoundTimeBetween(start, end);
    }
}
