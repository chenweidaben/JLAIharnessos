/*
 * 健澜科技 jlmedaios - API 限流 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_rate_limit.service;

import com.jlmedaios.monolith.api_rate_limit.entity.RateLimitRule;
import com.jlmedaios.monolith.api_rate_limit.repository.RateLimitRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * API 限流 Service。
 *
 * <p>限流规则主数据；生产接 Redis+Sentinel，H2 下 mock；等保三级要求防暴力破解</p>
 */
@Service
@RequiredArgsConstructor
public class ApiRateLimitService {

    private final RateLimitRuleRepository rateLimitRuleRepository;

    /**
     * 限流规则列表。
     *
     * @return 限流规则列表
     */
    public List<RateLimitRule> ruleList() {
        return rateLimitRuleRepository.findAll();
    }

    /**
     * 创建规则。
     *
     * @param ruleCode        规则编码
     * @param path            路径
     * @param method          方法
     * @param limitPerMinute   每分钟限制
     * @param limitPerDay     每日限制
     * @param action          动作
     * @return 已持久化的限流规则
     */
    public RateLimitRule createRule(String ruleCode, String path, String method,
                                     Integer limitPerMinute, Integer limitPerDay, String action) {
        RateLimitRule rule = RateLimitRule.builder()
                .ruleCode(ruleCode)
                .path(path)
                .method(method)
                .limitPerMinute(limitPerMinute)
                .limitPerDay(limitPerDay)
                .action(action)
                .build();
        return rateLimitRuleRepository.save(rule);
    }

    /**
     * 启用/停用。
     *
     * @param ruleCode 规则编码
     * @return 已更新的限流规则
     */
    public RateLimitRule toggleRule(String ruleCode) {
        List<RateLimitRule> rules = rateLimitRuleRepository.findAll();
        for (RateLimitRule rule : rules) {
            if (ruleCode.equals(rule.getRuleCode())) {
                rule.setStatus("DISABLED".equals(rule.getStatus()) ? "ENABLED" : "DISABLED");
                return rateLimitRuleRepository.save(rule);
            }
        }
        return null;
    }
}
