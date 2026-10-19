/*
 * 健澜科技 jlmedaios - 备份任务实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.backup_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 备份任务实体。
 *
 * <p>append-only: 备份任务记录不可修改；生产接 pg_dump/WAL 归档，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "backup_task")
public class BackupTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_name")
    private String taskName;

    @Column(name = "backup_type")
    private String backupType;

    @Column(name = "target_database")
    private String targetDatabase;

    @Column(name = "last_backup_time")
    private LocalDateTime lastBackupTime;

    @Column(name = "next_backup_time")
    private LocalDateTime nextBackupTime;

    @Column(name = "status")
    @Builder.Default
    private String status = "SUCCESS";

    @Column(name = "retention_days")
    private Integer retentionDays;
}
