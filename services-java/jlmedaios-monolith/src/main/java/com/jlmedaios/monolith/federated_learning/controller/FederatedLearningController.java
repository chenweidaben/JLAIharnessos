/*
 * 健澜科技 jlmedaios - 联邦学习 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.federated_learning.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.federated_learning.entity.FederatedParticipant;
import com.jlmedaios.monolith.federated_learning.entity.FederatedTask;
import com.jlmedaios.monolith.federated_learning.service.FederatedLearningService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 联邦学习 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/federated")
public class FederatedLearningController {

    private final FederatedLearningService federatedLearningService;

    /**
     * 联邦任务列表。
     *
     * @return Result<List<FederatedTask>>
     */
    @GetMapping("/tasks")
    public Result<List<FederatedTask>> taskList() {
        return Result.ok(federatedLearningService.taskList());
    }

    /**
     * 创建联邦任务。
     *
     * @param body {taskName, taskType, totalRounds}
     * @return Result<FederatedTask>
     */
    @PostMapping("/task")
    public Result<FederatedTask> createTask(@RequestBody Map<String, Object> body) {
        FederatedTask task = federatedLearningService.createTask(
                String.valueOf(body.get("taskName")),
                String.valueOf(body.get("taskType")),
                Integer.valueOf(String.valueOf(body.get("totalRounds")))
        );
        return Result.ok(task);
    }

    /**
     * 启动训练。
     *
     * @param name 任务名称
     * @return Result<FederatedTask>
     */
    @PutMapping("/task/{name}/start")
    public Result<FederatedTask> startTraining(@PathVariable String name) {
        return Result.ok(federatedLearningService.startTraining(name));
    }

    /**
     * 参与方列表。
     *
     * @param name 任务名称
     * @return Result<List<FederatedParticipant>>
     */
    @GetMapping("/task/{name}/participants")
    public Result<List<FederatedParticipant>> participants(@PathVariable String name) {
        return Result.ok(federatedLearningService.participants(name));
    }
}
