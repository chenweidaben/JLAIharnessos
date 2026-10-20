/*
 * 健澜科技 jlmedaios - 审计 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit.service;

import com.jlmedaios.monolith.audit.entity.AuditLog;
import com.jlmedaios.monolith.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 审计 Service。
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * 记录审计日志。
     *
     * @param userId       用户 ID
     * @param userName     用户名
     * @param action       操作类型
     * @param resourceType  资源类型
     * @param resourceId   资源 ID
     * @param beforeJson   修改前 JSON
     * @param afterJson    修改后 JSON
     * @param ipAddress    IP 地址
     * @param userAgent    User-Agent
     * @return 已持久化的审计日志
     */
    public AuditLog log(String userId, String userName, String action,
                        String resourceType, String resourceId,
                        String beforeJson, String afterJson,
                        String ipAddress, String userAgent) {
        AuditLog log = AuditLog.builder()
                .userId(userId)
                .userName(userName)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .beforeJson(beforeJson)
                .afterJson(afterJson)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();
        return auditLogRepository.save(log);
    }

    /**
     * 多条件查询审计日志。
     *
     * @param userId    用户 ID（可选）
     * @param action     操作类型（可选）
     * @param startTime  开始时间（可选）
     * @param endTime    结束时间（可选）
     * @return 审计日志列表
     */
    public List<AuditLog> query(String userId, String action,
                                 LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime != null && endTime != null) {
            return auditLogRepository.findByOccurTimeBetween(startTime, endTime);
        }
        if (action != null) {
            return auditLogRepository.findByAction(action);
        }
        if (userId != null) {
            return auditLogRepository.findByUserId(userId);
        }
        return auditLogRepository.findAll();
    }

    /**
     * 高风险操作列表（action=导出 or action=删除）。
     *
     * @return 高风险审计日志列表
     */
    public List<AuditLog> exportRisk() {
        // P5 性能优化：直接调用 Repository 派生查询
        return auditLogRepository.findByActionIn(java.util.Arrays.asList("导出", "删除"));
    }
}
