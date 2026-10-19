/*
 * 健澜科技 jlmedaios - 护理高级 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_advanced.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.nursing_advanced.entity.NursingTask;
import com.jlmedaios.monolith.nursing_advanced.service.NursingAdvancedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 护理高级 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/nursing")
public class NursingAdvancedController {

    private final NursingAdvancedService nursingAdvancedService;

    /**
     * 今日护理任务。
     *
     * @return Result<List<NursingTask>>
     */
    @GetMapping("/tasks/today")
    public Result<List<NursingTask>> todayTasks() {
        return Result.ok(nursingAdvancedService.todayTasks());
    }

    /**
     * 执行护理。
     *
     * @param id 任务 ID
     * @return Result<NursingTask>
     */
    @PutMapping("/task/{id}/complete")
    public Result<NursingTask> completeTask(@PathVariable Long id) {
        return nursingAdvancedService.completeTask(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 患者护理记录。
     *
     * @param patientId 患者 ID
     * @return Result<List<NursingTask>>
     */
    @GetMapping("/tasks/patient/{patientId}")
    public Result<List<NursingTask>> patientTasks(@PathVariable Long patientId) {
        return Result.ok(nursingAdvancedService.patientTasks(patientId));
    }
}
