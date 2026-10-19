/*
 * 健澜科技 jlmedaios - 护理高级 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_advanced.service;

import com.jlmedaios.monolith.nursing_advanced.entity.NursingTask;
import com.jlmedaios.monolith.nursing_advanced.repository.NursingTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * 护理高级 Service。
 *
 * <p>append-only: 护理任务不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class NursingAdvancedService {

    private final NursingTaskRepository nursingTaskRepository;

    /**
     * 今日护理任务。
     *
     * @return 护理任务列表
     */
    public List<NursingTask> todayTasks() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        return nursingTaskRepository.findAll().stream()
                .filter(t -> t.getPlannedTime() != null &&
                        !t.getPlannedTime().isBefore(start) &&
                        !t.getPlannedTime().isAfter(end))
                .toList();
    }

    /**
     * 执行护理（status=COMPLETED + executedTime）。
     *
     * @param taskId 任务 ID
     * @return 已更新的护理任务
     */
    public Optional<NursingTask> completeTask(Long taskId) {
        Optional<NursingTask> opt = nursingTaskRepository.findById(taskId);
        if (opt.isPresent()) {
            NursingTask task = opt.get();
            task.setStatus("COMPLETED");
            task.setExecutedTime(LocalDateTime.now());
            nursingTaskRepository.save(task);
        }
        return opt;
    }

    /**
     * 患者护理记录。
     *
     * @param patientId 患者 ID
     * @return 护理任务列表
     */
    public List<NursingTask> patientTasks(Long patientId) {
        return nursingTaskRepository.findByPatientId(String.valueOf(patientId));
    }
}
