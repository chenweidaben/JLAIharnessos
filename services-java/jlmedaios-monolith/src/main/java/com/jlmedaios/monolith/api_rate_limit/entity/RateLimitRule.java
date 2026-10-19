/*
 * 健澜科技 jlmedaios - 限流规则实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_rate_limit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 限流规则实体。
 *
 * <p>限流规则主数据；生产接 Redis+Sentinel，H2 下 mock；等保三级要求防暴力破解</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "rate_limit_rule")
public class RateLimitRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_code")
    private String ruleCode;

    @Column(name = "path")
    private String path;

    @Column(name = "method")
    private String method;

    @Column(name = "limit_per_minute")
    private Integer limitPerMinute;

    @Column(name = "limit_per_day")
    private Integer limitPerDay;

    @Column(name = "action")
    private String action;

    @Column(name = "status")
    @Builder.Default
    private String status = "ENABLED";
}
