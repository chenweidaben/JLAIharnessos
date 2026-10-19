/*
 * 健澜科技 jlmedaios - 健康指标实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.monitoring.entity;

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
 * 健康指标实体。
 *
 * <p>监控指标时序数据，自动采集</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "health_metric")
public class HealthMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "metric_name")
    private String metricName;

    @Column(name = "metric_value")
    private BigDecimal metricValue;

    @Column(name = "labels")
    private String labels;

    @Column(name = "collected_at")
    @Builder.Default
    private LocalDateTime collectedAt = LocalDateTime.now();
}
