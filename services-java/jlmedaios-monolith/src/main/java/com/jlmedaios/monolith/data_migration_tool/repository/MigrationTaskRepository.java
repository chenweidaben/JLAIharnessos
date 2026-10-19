/*
 * 健澜科技 jlmedaios - 迁移任务 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration_tool.repository;

import com.jlmedaios.monolith.data_migration_tool.entity.MigrationTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 迁移任务 Repository。
 */
@Repository
public interface MigrationTaskRepository extends JpaRepository<MigrationTask, Long> {

    /**
     * 按状态查询迁移任务。
     *
     * @param status 状态
     * @return 迁移任务列表
     */
    List<MigrationTask> findByStatus(String status);

    /**
     * 按任务名查询迁移任务。
     *
     * @param taskName 任务名
     * @return 迁移任务列表
     */
    List<MigrationTask> findByTaskName(String taskName);
}
