/*
 * 健澜科技 jlmedaios - 质量指标实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality.entity;

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
 * 质量指标实体。
 *
 * <p>append-only: 质量指标录入不可修改，季度审计</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "quality_metric")
public class QualityMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "metric_code")
    private String metricCode;

    // 统计周期，如"2026Q3"
    @Column(name = "period_value")
    private String periodValue;

    @Column(name = "target_value")
    private BigDecimal targetValue;

    @Column(name = "actual_value")
    private BigDecimal actualValue;

    // 评级：A/B/C/D
    @Column(name = "grade")
    private String grade;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
