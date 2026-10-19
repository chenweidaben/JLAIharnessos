/*
 * 健澜科技 jlmedaios - 数据迁移 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.data_migration.entity.MigrationTask;
import com.jlmedaios.monolith.data_migration.service.DataMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 数据迁移 Controller。
 *
 * <p>生产接 DataX/SeaTunnel，支持增量+全量迁移</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/migration")
public class DataMigrationController {

    private final DataMigrationService dataMigrationService;

    /**
     * 创建迁移任务。
     *
     * @param body {taskName, sourceSystem, tableName, totalRecords}
     * @return Result<MigrationTask>
     */
    @PostMapping("/task")
    public Result<MigrationTask> createTask(@RequestBody Map<String, Object> body) {
        MigrationTask task = dataMigrationService.createTask(
                String.valueOf(body.get("taskName")),
                String.valueOf(body.get("sourceSystem")),
                String.valueOf(body.get("tableName")),
                Integer.valueOf(String.valueOf(body.get("totalRecords")))
        );
        return Result.ok(task);
    }

    /**
     * 启动任务。
     *
     * @param id 任务 ID
     * @return Result<MigrationTask>
     */
    @PutMapping("/task/{id}/start")
    public Result<MigrationTask> startTask(@PathVariable Long id) {
        return dataMigrationService.startTask(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 迁移进度。
     *
     * @param id 任务 ID
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/task/{id}/progress")
    public Result<Map<String, Object>> progress(@PathVariable Long id) {
        return Result.ok(dataMigrationService.progress(id));
    }

    /**
     * 全部任务列表。
     *
     * @return Result<List<MigrationTask>>
     */
    @GetMapping("/tasks")
    public Result<List<MigrationTask>> allTasks() {
        return Result.ok(dataMigrationService.allTasks());
    }
}
