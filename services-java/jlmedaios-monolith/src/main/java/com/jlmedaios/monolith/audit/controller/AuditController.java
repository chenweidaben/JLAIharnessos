/*
 * 健澜科技 jlmedaios - 审计 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit.controller;

import com.jlmedaios.monolith.audit.entity.AuditLog;
import com.jlmedaios.monolith.audit.service.AuditService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 审计 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    /**
     * 记录审计日志。
     *
     * @param body 审计日志请求体
     * @return Result<AuditLog>
     */
    @PostMapping("/log")
    public Result<AuditLog> log(@RequestBody Map<String, Object> body) {
        AuditLog log = auditService.log(
                String.valueOf(body.get("userId")),
                String.valueOf(body.get("userName")),
                String.valueOf(body.get("action")),
                String.valueOf(body.get("resourceType")),
                String.valueOf(body.get("resourceId")),
                String.valueOf(body.get("beforeJson")),
                String.valueOf(body.get("afterJson")),
                String.valueOf(body.get("ipAddress")),
                String.valueOf(body.get("userAgent"))
        );
        return Result.ok(log);
    }

    /**
     * 多条件查询审计日志。
     *
     * @param userId    用户 ID（可选）
     * @param action    操作类型（可选）
     * @param startTime 开始时间（可选）
     * @param endTime   结束时间（可选）
     * @return Result<List<AuditLog>>
     */
    @GetMapping("/query")
    public Result<List<AuditLog>> query(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return Result.ok(auditService.query(userId, action, startTime, endTime));
    }

    /**
     * 高风险操作列表。
     *
     * @return Result<List<AuditLog>>
     */
    @GetMapping("/export-risk")
    public Result<List<AuditLog>> exportRisk() {
        return Result.ok(auditService.exportRisk());
    }
}
