/*
 * 健澜科技 jlmedaios - 性能基准测试 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test.service;

import com.jlmedaios.monolith.performance_test.entity.BenchmarkResult;
import com.jlmedaios.monolith.performance_test.repository.BenchmarkResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 性能基准测试 Service。
 *
 * <p>生产环境禁用，仅开发/压测环境使用</p>
 */
@Service
@RequiredArgsConstructor
public class BenchmarkService {

    private final BenchmarkResultRepository benchmarkResultRepository;

    /**
     * 运行基准测试（mock）。
     *
     * @param testName    测试名称
     * @param concurrency 并发数
     * @return 测试结果
     */
    public BenchmarkResult run(String testName, Integer concurrency) {
        // mock：返回固定性能数据
        BenchmarkResult result = BenchmarkResult.builder()
                .testName(testName)
                .concurrency(concurrency)
                .avgResponseMs(new BigDecimal("45.2"))
                .p99ResponseMs(new BigDecimal("120.5"))
                .throughput(500)
                .build();
        return benchmarkResultRepository.save(result);
    }

    /**
     * 历史测试结果。
     *
     * @return 测试结果列表
     */
    public List<BenchmarkResult> history() {
        return benchmarkResultRepository.findTop10ByOrderByRunAtDesc();
    }
}
