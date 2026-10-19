/*
 * 健澜科技 jlmedaios - 数据迁移 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration.service;

import com.jlmedaios.monolith.data_migration.entity.MigrationTask;
import com.jlmedaios.monolith.data_migration.repository.MigrationTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 数据迁移 Service。
 *
 * <p>生产接 DataX/SeaTunnel，支持增量+全量迁移</p>
 */
@Service
@RequiredArgsConstructor
public class DataMigrationService {

    private final MigrationTaskRepository migrationTaskRepository;

    /**
     * 创建迁移任务。
     *
     * @param taskName     任务名称
     * @param sourceSystem 源系统
     * @param tableName    表名
     * @param totalRecords  总记录数
     * @return 已持久化的任务
     */
    public MigrationTask createTask(String taskName, String sourceSystem,
                                     String tableName, Integer totalRecords) {
        MigrationTask task = MigrationTask.builder()
                .taskName(taskName)
                .sourceSystem(sourceSystem)
                .tableName(tableName)
                .totalRecords(totalRecords)
                .build();
        return migrationTaskRepository.save(task);
    }

    /**
     * 启动任务（status=RUNNING + startedAt）。
     *
     * @param id 任务 ID
     * @return 已更新的任务
     */
    public Optional<MigrationTask> startTask(Long id) {
        Optional<MigrationTask> opt = migrationTaskRepository.findById(id);
        if (opt.isPresent()) {
            MigrationTask task = opt.get();
            task.setStatus("RUNNING");
            task.setStartedAt(LocalDateTime.now());
            migrationTaskRepository.save(task);
        }
        return opt;
    }

    /**
     * 迁移进度。
     *
     * @param id 任务 ID
     * @return 进度信息
     */
    public Map<String, Object> progress(Long id) {
        Optional<MigrationTask> opt = migrationTaskRepository.findById(id);
        Map<String, Object> result = new HashMap<>();
        if (opt.isPresent()) {
            MigrationTask task = opt.get();
            int total = task.getTotalRecords() != null ? task.getTotalRecords() : 0;
            int migrated = task.getMigratedRecords() != null ? task.getMigratedRecords() : 0;
            int failed = task.getFailedRecords() != null ? task.getFailedRecords() : 0;
            double percentage = total > 0 ? (double) (migrated + failed) / total * 100 : 0;
            result.put("total", total);
            result.put("migrated", migrated);
            result.put("failed", failed);
            result.put("percentage", String.format("%.2f%%", percentage));
        }
        return result;
    }

    /**
     * 全部任务列表。
     *
     * @return 任务列表
     */
    public List<MigrationTask> allTasks() {
        return migrationTaskRepository.findAll();
    }
}
