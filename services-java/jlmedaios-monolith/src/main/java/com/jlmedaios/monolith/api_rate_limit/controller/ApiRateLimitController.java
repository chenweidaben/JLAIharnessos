/*
 * 健澜科技 jlmedaios - API 限流 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_rate_limit.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.api_rate_limit.entity.RateLimitRule;
import com.jlmedaios.monolith.api_rate_limit.service.ApiRateLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * API 限流 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ratelimit")
public class ApiRateLimitController {

    private final ApiRateLimitService apiRateLimitService;

    /**
     * 限流规则列表。
     *
     * @return Result<List<RateLimitRule>>
     */
    @GetMapping("/rules")
    public Result<List<RateLimitRule>> ruleList() {
        return Result.ok(apiRateLimitService.ruleList());
    }

    /**
     * 创建规则。
     *
     * @param body {ruleCode, path, method, limitPerMinute, limitPerDay, action}
     * @return Result<RateLimitRule>
     */
    @PostMapping("/rule")
    public Result<RateLimitRule> createRule(@RequestBody Map<String, Object> body) {
        RateLimitRule rule = apiRateLimitService.createRule(
                String.valueOf(body.get("ruleCode")),
                String.valueOf(body.get("path")),
                String.valueOf(body.get("method")),
                Integer.valueOf(String.valueOf(body.get("limitPerMinute"))),
                Integer.valueOf(String.valueOf(body.get("limitPerDay"))),
                String.valueOf(body.get("action"))
        );
        return Result.ok(rule);
    }

    /**
     * 启用/停用。
     *
     * @param ruleCode 规则编码
     * @return Result<RateLimitRule>
     */
    @PutMapping("/{ruleCode}/toggle")
    public Result<RateLimitRule> toggleRule(@PathVariable String ruleCode) {
        return Result.ok(apiRateLimitService.toggleRule(ruleCode));
    }
}
