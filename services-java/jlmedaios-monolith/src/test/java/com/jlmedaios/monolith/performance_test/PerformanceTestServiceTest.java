/*
 * 健澜科技 jlmedaios - 性能压测 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test;

import com.jlmedaios.monolith.performance_test.entity.PerformanceTestResult;
import com.jlmedaios.monolith.performance_test.service.PerformanceTestService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 性能压测 Service 测试。
 */
@SpringBootTest
public class PerformanceTestServiceTest {

    @Autowired
    private PerformanceTestService performanceTestService;

    @Test
    void testRunTest() {
        PerformanceTestResult result = performanceTestService.runTest(
                "门诊查询压测", "并发查询", 100);
        assertNotNull(result.getId());
        assertTrue(result.getP99ResponseMs() > 0);
    }

    @Test
    void testHistory() {
        List<PerformanceTestResult> history = performanceTestService.history();
        assertNotNull(history);
    }

    @Test
    void testReport() {
        List<PerformanceTestResult> report = performanceTestService.report("门诊查询压测");
        assertNotNull(report);
    }
}
