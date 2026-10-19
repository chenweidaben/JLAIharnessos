/*
 * 健澜科技 jlmedaios - 系统监控指标实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.system_monitoring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 系统监控指标实体。
 *
 * <p>append-only: 系统监控指标不可修改；生产接 Prometheus+Grafana，H2 下 mock 数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "system_metric")
public class SystemMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "metric_time")
    @Builder.Default
    private LocalDateTime metricTime = LocalDateTime.now();

    @Column(name = "service_name")
    private String serviceName;

    @Column(name = "cpu_usage")
    private BigDecimal cpuUsage;

    @Column(name = "memory_usage")
    private BigDecimal memoryUsage;

    @Column(name = "disk_usage")
    private BigDecimal diskUsage;

    @Column(name = "response_time_ms")
    private Integer responseTimeMs;

    @Column(name = "error_rate")
    private BigDecimal errorRate;

    @Column(name = "status")
    private String status;
}
