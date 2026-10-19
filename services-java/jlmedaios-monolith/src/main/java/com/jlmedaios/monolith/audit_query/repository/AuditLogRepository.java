/*
 * 健澜科技 jlmedaios - 审计日志 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit_query.repository;

import com.jlmedaios.monolith.audit_query.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 审计日志 Repository。
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * 按用户 ID 查询审计日志。
     *
     * @param userId 用户 ID
     * @return 审计日志列表
     */
    List<AuditLog> findByUserId(String userId);

    /**
     * 按操作结果查询审计日志。
     *
     * @param result 操作结果
     * @return 审计日志列表
     */
    List<AuditLog> findByResult(String result);
}
