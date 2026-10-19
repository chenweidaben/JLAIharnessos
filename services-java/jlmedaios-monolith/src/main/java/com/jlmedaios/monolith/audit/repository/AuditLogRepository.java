/*
 * 健澜科技 jlmedaios - 审计日志 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit.repository;

import com.jlmedaios.monolith.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 审计日志 Repository。
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * 按用户 ID 查询审计日志列表。
     *
     * @param userId 用户 ID
     * @return 审计日志列表
     */
    List<AuditLog> findByUserId(String userId);

    /**
     * 按操作类型查询审计日志列表。
     *
     * @param action 操作类型
     * @return 审计日志列表
     */
    List<AuditLog> findByAction(String action);

    /**
     * 按时间段查询审计日志列表。
     *
     * @param start 开始时间
     * @param end   结束时间
     * @return 审计日志列表
     */
    List<AuditLog> findByOccurTimeBetween(LocalDateTime start, LocalDateTime end);
}
