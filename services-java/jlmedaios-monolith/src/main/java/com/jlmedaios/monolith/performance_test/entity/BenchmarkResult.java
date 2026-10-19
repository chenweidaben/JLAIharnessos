/*
 * 健澜科技 jlmedaios - 性能基准测试结果实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test.entity;

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
 * 性能基准测试结果实体。
 *
 * <p>性能基准测试结果，仅开发/压测环境使用</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "benchmark_result")
public class BenchmarkResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_name")
    private String testName;

    @Column(name = "concurrency")
    private Integer concurrency;

    @Column(name = "avg_response_ms")
    private BigDecimal avgResponseMs;

    @Column(name = "p99_response_ms")
    private BigDecimal p99ResponseMs;

    @Column(name = "throughput")
    private Integer throughput;

    @Column(name = "run_at")
    @Builder.Default
    private LocalDateTime runAt = LocalDateTime.now();
}
