/*
 * 健澜科技 jlmedaios - 性能基准测试 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance_test.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.performance_test.entity.BenchmarkResult;
import com.jlmedaios.monolith.performance_test.service.BenchmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 性能基准测试 Controller。
 *
 * <p>生产环境禁用，仅开发/压测环境使用</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/benchmark")
public class BenchmarkController {

    private final BenchmarkService benchmarkService;

    /**
     * 运行基准测试（mock）。
     *
     * @param body {testName, concurrency}
     * @return Result<BenchmarkResult>
     */
    @PostMapping("/run")
    public Result<BenchmarkResult> run(@RequestBody Map<String, Object> body) {
        BenchmarkResult result = benchmarkService.run(
                String.valueOf(body.get("testName")),
                Integer.valueOf(String.valueOf(body.get("concurrency")))
        );
        return Result.ok(result);
    }

    /**
     * 历史测试结果。
     *
     * @return Result<List<BenchmarkResult>>
     */
    @GetMapping("/history")
    public Result<List<BenchmarkResult>> history() {
        return Result.ok(benchmarkService.history());
    }
}
