/*
 * 健澜科技 jlmedaios - 手术高级 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery_advanced.service;

import com.jlmedaios.monolith.surgery_advanced.entity.SurgeryRecord;
import com.jlmedaios.monolith.surgery_advanced.entity.SurgerySchedule;
import com.jlmedaios.monolith.surgery_advanced.repository.SurgeryRecordRepository;
import com.jlmedaios.monolith.surgery_advanced.repository.SurgeryScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * 手术高级 Service。
 *
 * <p>append-only: 手术记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class SurgeryAdvancedService {

    private final SurgeryScheduleRepository surgeryScheduleRepository;
    private final SurgeryRecordRepository surgeryRecordRepository;

    /**
     * 创建手术排台。
     *
     * @param scheduleNo      排台编号
     * @param patientId       患者 ID
     * @param surgeryName     手术名称
     * @param surgeon         主刀医生
     * @param anesthesiologist 麻醉医生
     * @param surgeryRoom     手术室
     * @param scheduledStart  计划开始时间
     * @param scheduledEnd     计划结束时间
     * @param priority        优先级
     * @return 已持久化的排台
     */
    public SurgerySchedule createSchedule(String scheduleNo, String patientId, String surgeryName,
                                           String surgeon, String anesthesiologist, String surgeryRoom,
                                           LocalDateTime scheduledStart, LocalDateTime scheduledEnd,
                                           String priority) {
        SurgerySchedule schedule = SurgerySchedule.builder()
                .scheduleNo(scheduleNo)
                .patientId(patientId)
                .surgeryName(surgeryName)
                .surgeon(surgeon)
                .anesthesiologist(anesthesiologist)
                .surgeryRoom(surgeryRoom)
                .scheduledStart(scheduledStart)
                .scheduledEnd(scheduledEnd)
                .priority(priority)
                .build();
        return surgeryScheduleRepository.save(schedule);
    }

    /**
     * 开始手术（status=IN_PROGRESS）。
     *
     * @param scheduleId 排台 ID
     * @return 已更新的排台
     */
    public Optional<SurgerySchedule> startSurgery(Long scheduleId) {
        Optional<SurgerySchedule> opt = surgeryScheduleRepository.findById(scheduleId);
        if (opt.isPresent()) {
            SurgerySchedule schedule = opt.get();
            schedule.setStatus("IN_PROGRESS");
            surgeryScheduleRepository.save(schedule);
        }
        return opt;
    }

    /**
     * 完成手术（status=COMPLETED + 创建手术记录）。
     *
     * @param scheduleId        排台 ID
     * @param preOpDiagnosis     术前诊断
     * @param postOpDiagnosis    术后诊断
     * @param surgeryDescription 手术描述
     * @param bleedingAmount     出血量
     * @param transfusion        输血
     * @param complications      并发症
     * @return 已持久化的手术记录
     */
    public Optional<SurgeryRecord> finishSurgery(Long scheduleId, String preOpDiagnosis,
                                                   String postOpDiagnosis, String surgeryDescription,
                                                   BigDecimal bleedingAmount, String transfusion,
                                                   String complications) {
        Optional<SurgerySchedule> opt = surgeryScheduleRepository.findById(scheduleId);
        if (opt.isPresent()) {
            SurgerySchedule schedule = opt.get();
            schedule.setStatus("COMPLETED");
            surgeryScheduleRepository.save(schedule);

            SurgeryRecord record = SurgeryRecord.builder()
                    .scheduleNo(schedule.getScheduleNo())
                    .patientId(schedule.getPatientId())
                    .actualStart(LocalDateTime.now().minusHours(2))
                    .actualEnd(LocalDateTime.now())
                    .preOpDiagnosis(preOpDiagnosis)
                    .postOpDiagnosis(postOpDiagnosis)
                    .surgeryDescription(surgeryDescription)
                    .bleedingAmount(bleedingAmount)
                    .transfusion(transfusion)
                    .complications(complications)
                    .build();
            return Optional.of(surgeryRecordRepository.save(record));
        }
        return Optional.empty();
    }

    /**
     * 今日手术安排。
     *
     * @return 排台列表
     */
    public List<SurgerySchedule> todaySchedule() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        return surgeryScheduleRepository.findByScheduledStartBetween(start, end);
    }
}
