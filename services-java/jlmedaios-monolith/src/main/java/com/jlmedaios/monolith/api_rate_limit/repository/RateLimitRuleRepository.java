/*
 * 健澜科技 jlmedaios - 限流规则 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_rate_limit.repository;

import com.jlmedaios.monolith.api_rate_limit.entity.RateLimitRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 限流规则 Repository。
 */
@Repository
public interface RateLimitRuleRepository extends JpaRepository<RateLimitRule, Long> {

    /**
     * 按状态查询限流规则。
     *
     * @param status 状态
     * @return 限流规则列表
     */
    List<RateLimitRule> findByStatus(String status);

    /**
     * 按路径查询限流规则。
     *
     * @param path 路径
     * @return 限流规则列表
     */
    List<RateLimitRule> findByPath(String path);
}
