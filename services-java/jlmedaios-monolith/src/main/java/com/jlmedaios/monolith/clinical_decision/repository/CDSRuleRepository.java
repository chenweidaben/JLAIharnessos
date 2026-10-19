/*
 * 健澜科技 jlmedaios - CDS 规则 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision.repository;

import com.jlmedaios.monolith.clinical_decision.entity.CDSRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * CDS 规则 Repository。
 */
@Repository
public interface CDSRuleRepository extends JpaRepository<CDSRule, Long> {

    /**
     * 按状态查询规则。
     *
     * @param status 状态
     * @return 规则列表
     */
    List<CDSRule> findByStatus(String status);
}
