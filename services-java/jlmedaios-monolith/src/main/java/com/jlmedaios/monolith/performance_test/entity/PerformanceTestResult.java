/*
 * 健澜科技 jlmedaios - 压测结果实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 压测结果实体。
 *
 * <p>append-only: 压测结果不可修改；生产接 JMeter/k6，H2 下 mock；目标 P99<500ms</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "performance_test_result")
public class PerformanceTestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_name")
    private String testName;

    @Column(name = "scenario")
    private String scenario;

    @Column(name = "concurrent_users")
    private Integer concurrentUsers;

    @Column(name = "avg_response_ms")
    private Integer avgResponseMs;

    @Column(name = "p95_response_ms")
    private Integer p95ResponseMs;

    @Column(name = "p99_response_ms")
    private Integer p99ResponseMs;

    @Column(name = "tps")
    private Integer tps;

    @Column(name = "error_rate")
    private BigDecimal errorRate;

    @Column(name = "test_time")
    @Builder.Default
    private LocalDateTime testTime = LocalDateTime.now();
}
