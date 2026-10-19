/*
 * 健澜科技 jlmedaios - 单条迁移记录 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration.repository;

import com.jlmedaios.monolith.data_migration.entity.MigrationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 单条迁移记录 Repository。
 */
@Repository
public interface MigrationRecordRepository extends JpaRepository<MigrationRecord, Long> {

    /**
     * 按任务 ID 查询迁移记录。
     *
     * @param taskId 任务 ID
     * @return 迁移记录列表
     */
    List<MigrationRecord> findByTaskId(Long taskId);
}
