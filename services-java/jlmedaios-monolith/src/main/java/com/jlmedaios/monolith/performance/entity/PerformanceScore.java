/*
 * 健澜科技 jlmedaios - 绩效分实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 绩效分实体。
 *
 * <p>append-only: 绩效分录入不可修改，季度审计</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "performance_score")
public class PerformanceScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // @Sensitive 员工工号，脱敏存储
    @Column(name = "staff_id")
    private String staffId;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "period")
    private String period;

    @Column(name = "metric_code")
    private String metricCode;

    @Column(name = "score")
    private BigDecimal score;

    @Column(name = "weighted_score")
    private BigDecimal weightedScore;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
