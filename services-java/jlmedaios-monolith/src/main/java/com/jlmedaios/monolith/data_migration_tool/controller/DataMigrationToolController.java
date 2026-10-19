/*
 * 健澜科技 jlmedaios - 数据迁移工具 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration_tool.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.data_migration_tool.entity.MigrationTask;
import com.jlmedaios.monolith.data_migration_tool.service.DataMigrationToolService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 数据迁移工具 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/migration")
public class DataMigrationToolController {

    private final DataMigrationToolService dataMigrationToolService;

    /**
     * 创建迁移任务。
     *
     * @param body {taskName, sourceSystem, targetTable, migrationStrategy, totalRows}
     * @return Result<MigrationTask>
     */
    @PostMapping("/task")
    public Result<MigrationTask> createTask(@RequestBody Map<String, Object> body) {
        MigrationTask task = dataMigrationToolService.createTask(
                String.valueOf(body.get("taskName")),
                String.valueOf(body.get("sourceSystem")),
                String.valueOf(body.get("targetTable")),
                String.valueOf(body.get("migrationStrategy")),
                Integer.valueOf(String.valueOf(body.get("totalRows")))
        );
        return Result.ok(task);
    }

    /**
     * 启动迁移任务。
     *
     * @param taskName 任务名
     * @return Result<MigrationTask>
     */
    @PutMapping("/task/{taskName}/start")
    public Result<MigrationTask> startTask(@PathVariable String taskName) {
        return Result.ok(dataMigrationToolService.startTask(taskName));
    }

    /**
     * 迁移进度。
     *
     * @param taskName 任务名
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/task/{taskName}/progress")
    public Result<Map<String, Object>> progress(@PathVariable String taskName) {
        return Result.ok(dataMigrationToolService.progress(taskName));
    }

    /**
     * 全部任务列表。
     *
     * @return Result<List<MigrationTask>>
     */
    @GetMapping("/tasks")
    public Result<List<MigrationTask>> taskList() {
        return Result.ok(dataMigrationToolService.taskList());
    }
}
