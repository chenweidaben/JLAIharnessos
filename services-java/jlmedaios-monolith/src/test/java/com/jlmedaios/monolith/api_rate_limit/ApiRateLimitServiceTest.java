/*
 * 健澜科技 jlmedaios - API 限流 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_rate_limit;

import com.jlmedaios.monolith.api_rate_limit.entity.RateLimitRule;
import com.jlmedaios.monolith.api_rate_limit.service.ApiRateLimitService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * API 限流 Service 测试。
 */
@SpringBootTest
public class ApiRateLimitServiceTest {

    @Autowired
    private ApiRateLimitService apiRateLimitService;

    @Test
    void testRuleList() {
        List<RateLimitRule> list = apiRateLimitService.ruleList();
        assertNotNull(list);
    }

    @Test
    void testCreateRule() {
        RateLimitRule rule = apiRateLimitService.createRule(
                "RL-LOGIN", "/api/auth/login", "POST", 10, 100, "block");
        assertNotNull(rule.getId());
        assertEquals("ENABLED", rule.getStatus());
    }

    @Test
    void testToggleRule() {
        apiRateLimitService.createRule("RL-QUERY", "/api/patient/query", "GET", 60, 1000, "warn");
        RateLimitRule toggled = apiRateLimitService.toggleRule("RL-QUERY");
        assertNotNull(toggled);
        assertEquals("DISABLED", toggled.getStatus());
    }
}
