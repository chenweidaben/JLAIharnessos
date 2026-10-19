/*
 * 健澜科技 jlmedaios - 性能压测 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test.service;

import com.jlmedaios.monolith.performance_test.entity.PerformanceTestResult;
import com.jlmedaios.monolith.performance_test.repository.PerformanceTestResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 性能压测 Service。
 *
 * <p>append-only: 压测结果不可修改；生产接 JMeter/k6，H2 下 mock；目标 P99<500ms</p>
 */
@Service
@RequiredArgsConstructor
public class PerformanceTestService {

    private final PerformanceTestResultRepository performanceTestResultRepository;

    /**
     * 启动压测（mock 返回结果）。
     *
     * @param testName       测试名
     * @param scenario       场景
     * @param concurrentUsers 并发用户数
     * @return 已持久化的压测结果
     */
    public PerformanceTestResult runTest(String testName, String scenario, Integer concurrentUsers) {
        PerformanceTestResult result = PerformanceTestResult.builder()
                .testName(testName)
                .scenario(scenario)
                .concurrentUsers(concurrentUsers)
                .avgResponseMs(120)
                .p95ResponseMs(350)
                .p99ResponseMs(480)
                .tps(concurrentUsers * 10)
                .errorRate(new BigDecimal("0.05"))
                .build();
        return performanceTestResultRepository.save(result);
    }

    /**
     * 压测历史。
     *
     * @return 压测结果列表
     */
    public List<PerformanceTestResult> history() {
        return performanceTestResultRepository.findAll();
    }

    /**
     * 压测报告。
     *
     * @param testName 测试名
     * @return 压测结果列表
     */
    public List<PerformanceTestResult> report(String testName) {
        return performanceTestResultRepository.findByTestName(testName);
    }
}
