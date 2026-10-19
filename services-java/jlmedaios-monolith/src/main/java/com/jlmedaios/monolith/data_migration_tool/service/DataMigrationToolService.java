/*
 * 健澜科技 jlmedaios - 数据迁移工具 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration_tool.service;

import com.jlmedaios.monolith.data_migration_tool.entity.MigrationTask;
import com.jlmedaios.monolith.data_migration_tool.repository.MigrationTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据迁移工具 Service。
 *
 * <p>append-only: 迁移任务不可修改；生产接 DataX/SeaTunnel，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class DataMigrationToolService {

    private final MigrationTaskRepository migrationTaskRepository;

    /**
     * 创建迁移任务。
     *
     * @param taskName         任务名
     * @param sourceSystem     源系统
     * @param targetTable      目标表
     * @param migrationStrategy 迁移策略
     * @param totalRows        总行数
     * @return 已持久化的迁移任务
     */
    public MigrationTask createTask(String taskName, String sourceSystem, String targetTable,
                                     String migrationStrategy, Integer totalRows) {
        MigrationTask task = MigrationTask.builder()
                .taskName(taskName)
                .sourceSystem(sourceSystem)
                .targetTable(targetTable)
                .migrationStrategy(migrationStrategy)
                .totalRows(totalRows)
                .migratedRows(0)
                .failedRows(0)
                .build();
        return migrationTaskRepository.save(task);
    }

    /**
     * 启动（mock 状态 PENDING→RUNNING→COMPLETED）。
     *
     * @param taskName 任务名
     * @return 已更新的迁移任务
     */
    public MigrationTask startTask(String taskName) {
        List<MigrationTask> tasks = migrationTaskRepository.findByTaskName(taskName);
        if (!tasks.isEmpty()) {
            MigrationTask task = tasks.get(0);
            task.setStatus("RUNNING");
            task.setStartTime(LocalDateTime.now());
            task.setMigratedRows(task.getTotalRows());
            task.setFailedRows(0);
            task.setStatus("COMPLETED");
            task.setEndTime(LocalDateTime.now());
            return migrationTaskRepository.save(task);
        }
        return null;
    }

    /**
     * 进度。
     *
     * @param taskName 任务名
     * @return 进度信息
     */
    public Map<String, Object> progress(String taskName) {
        List<MigrationTask> tasks = migrationTaskRepository.findByTaskName(taskName);
        Map<String, Object> result = new HashMap<>();
        if (!tasks.isEmpty()) {
            MigrationTask task = tasks.get(0);
            result.put("migratedRows", task.getMigratedRows());
            result.put("failedRows", task.getFailedRows());
            int percentage = task.getTotalRows() == null || task.getTotalRows() == 0 ? 0
                    : (task.getMigratedRows() * 100 / task.getTotalRows());
            result.put("percentage", percentage + "%");
        }
        return result;
    }

    /**
     * 全部任务列表。
     *
     * @return 迁移任务列表
     */
    public List<MigrationTask> taskList() {
        return migrationTaskRepository.findAll();
    }
}
