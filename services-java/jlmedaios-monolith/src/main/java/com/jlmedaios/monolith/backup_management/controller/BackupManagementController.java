/*
 * 健澜科技 jlmedaios - 备份管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.backup_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.backup_management.entity.BackupTask;
import com.jlmedaios.monolith.backup_management.service.BackupManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 备份管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/backup")
public class BackupManagementController {

    private final BackupManagementService backupManagementService;

    /**
     * 备份任务列表。
     *
     * @return Result<List<BackupTask>>
     */
    @GetMapping("/tasks")
    public Result<List<BackupTask>> taskList() {
        return Result.ok(backupManagementService.taskList());
    }

    /**
     * 手动触发备份。
     *
     * @param taskName 任务名
     * @return Result<BackupTask>
     */
    @PostMapping("/run/{taskName}")
    public Result<BackupTask> runBackup(@PathVariable String taskName) {
        return Result.ok(backupManagementService.runBackup(taskName));
    }

    /**
     * 备份历史。
     *
     * @return Result<List<BackupTask>>
     */
    @GetMapping("/history")
    public Result<List<BackupTask>> backupHistory() {
        return Result.ok(backupManagementService.backupHistory());
    }
}
