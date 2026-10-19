/*
 * 健澜科技 jlmedaios - 审计日志实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit_query.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 审计日志实体。
 *
 * <p>append-only: 审计日志不可篡改；等保三级要求保存≥6个月</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "log_id")
    private String logId;

    // @Sensitive 用户 ID，脱敏存储
    @Column(name = "user_id")
    private String userId;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "operation")
    private String operation;

    @Column(name = "resource_type")
    private String resourceType;

    @Column(name = "resource_id")
    private String resourceId;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "operation_time")
    @Builder.Default
    private LocalDateTime operationTime = LocalDateTime.now();

    @Column(name = "result")
    private String result;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;
}
