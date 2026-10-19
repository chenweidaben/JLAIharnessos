/*
 * 健澜科技 jlmedaios - 性能压测 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.performance_test.entity.PerformanceTestResult;
import com.jlmedaios.monolith.performance_test.service.PerformanceTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 性能压测 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/perftest")
public class PerformanceTestController {

    private final PerformanceTestService performanceTestService;

    /**
     * 启动压测。
     *
     * @param body {testName, scenario, concurrentUsers}
     * @return Result<PerformanceTestResult>
     */
    @PostMapping("/run")
    public Result<PerformanceTestResult> runTest(@RequestBody Map<String, Object> body) {
        PerformanceTestResult result = performanceTestService.runTest(
                String.valueOf(body.get("testName")),
                String.valueOf(body.get("scenario")),
                Integer.valueOf(String.valueOf(body.get("concurrentUsers")))
        );
        return Result.ok(result);
    }

    /**
     * 压测历史。
     *
     * @return Result<List<PerformanceTestResult>>
     */
    @GetMapping("/history")
    public Result<List<PerformanceTestResult>> history() {
        return Result.ok(performanceTestService.history());
    }

    /**
     * 压测报告。
     *
     * @param testName 测试名
     * @return Result<List<PerformanceTestResult>>
     */
    @GetMapping("/report/{testName}")
    public Result<List<PerformanceTestResult>> report(@PathVariable String testName) {
        return Result.ok(performanceTestService.report(testName));
    }
}
