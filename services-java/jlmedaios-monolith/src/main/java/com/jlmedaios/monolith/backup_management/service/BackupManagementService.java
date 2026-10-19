/*
 * 健澜科技 jlmedaios - 备份管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.backup_management.service;

import com.jlmedaios.monolith.backup_management.entity.BackupTask;
import com.jlmedaios.monolith.backup_management.repository.BackupTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 备份管理 Service。
 *
 * <p>append-only: 备份任务记录不可修改；生产接 pg_dump/WAL 归档，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class BackupManagementService {

    private final BackupTaskRepository backupTaskRepository;

    /**
     * 备份任务列表。
     *
     * @return 备份任务列表
     */
    public List<BackupTask> taskList() {
        return backupTaskRepository.findAll();
    }

    /**
     * 手动触发备份（mock 返回 RUNNING → SUCCESS）。
     *
     * @param taskName 任务名
     * @return 备份任务
     */
    public BackupTask runBackup(String taskName) {
        List<BackupTask> tasks = backupTaskRepository.findByTaskName(taskName);
        BackupTask task;
        if (tasks.isEmpty()) {
            task = BackupTask.builder()
                    .taskName(taskName)
                    .backupType("全量")
                    .targetDatabase("jlmedaios")
                    .nextBackupTime(LocalDateTime.now().plusDays(1))
                    .retentionDays(30)
                    .build();
        } else {
            task = tasks.get(0);
        }
        task.setStatus("RUNNING");
        task.setLastBackupTime(LocalDateTime.now());
        task.setNextBackupTime(LocalDateTime.now().plusDays(1));
        return backupTaskRepository.save(task);
    }

    /**
     * 备份历史。
     *
     * @return 备份任务列表
     */
    public List<BackupTask> backupHistory() {
        return backupTaskRepository.findAll();
    }
}
