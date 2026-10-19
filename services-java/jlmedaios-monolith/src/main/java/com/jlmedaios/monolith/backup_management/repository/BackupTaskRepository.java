/*
 * 健澜科技 jlmedaios - 备份任务 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.backup_management.repository;

import com.jlmedaios.monolith.backup_management.entity.BackupTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 备份任务 Repository。
 */
@Repository
public interface BackupTaskRepository extends JpaRepository<BackupTask, Long> {

    /**
     * 按状态查询备份任务。
     *
     * @param status 状态
     * @return 备份任务列表
     */
    List<BackupTask> findByStatus(String status);

    /**
     * 按任务名查询备份任务。
     *
     * @param taskName 任务名
     * @return 备份任务列表
     */
    List<BackupTask> findByTaskName(String taskName);
}
