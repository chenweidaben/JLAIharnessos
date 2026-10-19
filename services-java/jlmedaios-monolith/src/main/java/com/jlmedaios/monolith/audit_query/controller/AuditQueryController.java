/*
 * 健澜科技 jlmedaios - 审计日志查询 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit_query.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.audit_query.entity.AuditLog;
import com.jlmedaios.monolith.audit_query.service.AuditQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 审计日志查询 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/audit")
public class AuditQueryController {

    private final AuditQueryService auditQueryService;

    /**
     * 审计日志查询。
     *
     * @param userId    用户 ID（可选）
     * @param operation 操作类型（可选）
     * @param result    操作结果（可选）
     * @return Result<List<AuditLog>>
     */
    @GetMapping("/logs")
    public Result<List<AuditLog>> queryLogs(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String operation,
            @RequestParam(required = false) String result) {
        return Result.ok(auditQueryService.queryLogs(userId, operation, result));
    }

    /**
     * 用户操作记录。
     *
     * @param userId 用户 ID
     * @return Result<List<AuditLog>>
     */
    @GetMapping("/user/{userId}")
    public Result<List<AuditLog>> userRecords(@PathVariable String userId) {
        return Result.ok(auditQueryService.userRecords(userId));
    }

    /**
     * 审计统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(auditQueryService.stats());
    }
}
