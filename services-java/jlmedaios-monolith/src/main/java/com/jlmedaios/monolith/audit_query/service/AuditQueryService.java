/*
 * 健澜科技 jlmedaios - 审计日志查询 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit_query.service;

import com.jlmedaios.monolith.audit_query.entity.AuditLog;
import com.jlmedaios.monolith.audit_query.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 审计日志查询 Service。
 *
 * <p>append-only: 审计日志不可篡改；等保三级要求保存≥6个月</p>
 */
@Service
@RequiredArgsConstructor
public class AuditQueryService {

    private final AuditLogRepository auditLogRepository;

    /**
     * 审计日志查询（按用户/操作/结果筛选）。
     *
     * @param userId    用户 ID
     * @param operation 操作类型
     * @param result    操作结果
     * @return 审计日志列表
     */
    public List<AuditLog> queryLogs(String userId, String operation, String result) {
        List<AuditLog> all = auditLogRepository.findAll();
        return all.stream()
                .filter(log -> userId == null || userId.isEmpty() || userId.equals(log.getUserId()))
                .filter(log -> operation == null || operation.isEmpty() || operation.equals(log.getOperation()))
                .filter(log -> result == null || result.isEmpty() || result.equals(log.getResult()))
                .collect(Collectors.toList());
    }

    /**
     * 用户操作记录。
     *
     * @param userId 用户 ID
     * @return 审计日志列表
     */
    public List<AuditLog> userRecords(String userId) {
        return auditLogRepository.findByUserId(userId);
    }

    /**
     * 审计统计。
     *
     * @return 统计结果
     */
    public Map<String, Object> stats() {
        List<AuditLog> all = auditLogRepository.findAll();
        Map<String, Object> result = new HashMap<>();
        result.put("total_logs", all.size());

        Map<String, Long> byOperation = all.stream()
                .collect(Collectors.groupingBy(AuditLog::getOperation, Collectors.counting()));
        result.put("by_operation_type", byOperation);

        long failureCount = all.stream()
                .filter(log -> "failure".equals(log.getResult()))
                .count();
        result.put("failure_rate", all.isEmpty() ? "0%" : String.format("%.1f%%", failureCount * 100.0 / all.size()));

        return result;
    }
}
