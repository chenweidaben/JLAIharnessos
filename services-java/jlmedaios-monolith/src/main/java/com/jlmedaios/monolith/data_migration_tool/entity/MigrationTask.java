/*
 * 健澜科技 jlmedaios - 迁移任务实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration_tool.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 迁移任务实体。
 *
 * <p>append-only: 迁移任务不可修改；生产接 DataX/SeaTunnel，H2 下 mock</p>
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

    @Column(name = "target_table")
    private String targetTable;

    @Column(name = "migration_strategy")
    private String migrationStrategy;

    @Column(name = "total_rows")
    private Integer totalRows;

    @Column(name = "migrated_rows")
    private Integer migratedRows;

    @Column(name = "failed_rows")
    private Integer failedRows;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;
}
