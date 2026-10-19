/*
 * 健澜科技 jlmedaios - 手术排班 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operation_schedule.service;

import com.jlmedaios.monolith.operation_schedule.entity.OperationSchedule;
import com.jlmedaios.monolith.operation_schedule.repository.OperationScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * 手术排班 Service。
 *
 * <p>append-only: 手术排班不可修改，取消留痕</p>
 */
@Service
@RequiredArgsConstructor
public class OperationScheduleService {

    private final OperationScheduleRepository operationScheduleRepository;

    /**
     * 创建手术排班。
     *
     * @param roomCode           手术室编码
     * @param surgeonId          主刀医生工号
     * @param assistantId       助手工号
     * @param anesthesiologistId 麻醉师工号
     * @param patientId         患者 ID
     * @param procedureName      手术名称
     * @param scheduledStart     计划开始时间
     * @param scheduledEnd       计划结束时间
     * @return 已持久化的手术排班
     */
    public OperationSchedule schedule(String roomCode, String surgeonId, String assistantId,
                                       String anesthesiologistId, Long patientId,
                                       String procedureName, LocalDateTime scheduledStart,
                                       LocalDateTime scheduledEnd) {
        OperationSchedule schedule = OperationSchedule.builder()
                .roomCode(roomCode)
                .surgeonId(surgeonId)
                .assistantId(assistantId)
                .anesthesiologistId(anesthesiologistId)
                .patientId(patientId)
                .procedureName(procedureName)
                .scheduledStart(scheduledStart)
                .scheduledEnd(scheduledEnd)
                .build();
        return operationScheduleRepository.save(schedule);
    }

    /**
     * 今日手术安排。
     *
     * @return 手术排班列表
     */
    public List<OperationSchedule> todayList() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        return operationScheduleRepository.findByScheduledStartBetween(start, end);
    }

    /**
     * 手术开始（设 status=IN_PROGRESS）。
     *
     * @param id 排班 ID
     * @return 已更新的手术排班
     */
    public Optional<OperationSchedule> start(Long id) {
        Optional<OperationSchedule> opt = operationScheduleRepository.findById(id);
        if (opt.isPresent()) {
            OperationSchedule schedule = opt.get();
            schedule.setStatus("IN_PROGRESS");
            schedule.setUpdatedAt(LocalDateTime.now());
            operationScheduleRepository.save(schedule);
        }
        return opt;
    }

    /**
     * 手术完成（设 status=COMPLETED）。
     *
     * @param id 排班 ID
     * @return 已更新的手术排班
     */
    public Optional<OperationSchedule> finish(Long id) {
        Optional<OperationSchedule> opt = operationScheduleRepository.findById(id);
        if (opt.isPresent()) {
            OperationSchedule schedule = opt.get();
            schedule.setStatus("COMPLETED");
            schedule.setUpdatedAt(LocalDateTime.now());
            operationScheduleRepository.save(schedule);
        }
        return opt;
    }
}
