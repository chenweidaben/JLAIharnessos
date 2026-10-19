/*
 * 健澜科技 jlmedaios - 数据迁移任务实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 数据迁移任务实体。
 *
 * <p>数据迁移任务主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "migration_task")
public class MigrationTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_name")
    private String taskName;

    @Column(name = "source_system")
    private String sourceSystem;

    @Column(name = "table_name")
    private String tableName;

    @Column(name = "total_records")
    private Integer totalRecords;

    @Column(name = "migrated_records")
    @Builder.Default
    private Integer migratedRecords = 0;

    @Column(name = "failed_records")
    @Builder.Default
    private Integer failedRecords = 0;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
