/*
 * 健澜科技 jlmedaios - CDSS 规则 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision_support.repository;

import com.jlmedaios.monolith.clinical_decision_support.entity.CDSSRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * CDSS 规则 Repository。
 */
@Repository
public interface CDSSRuleRepository extends JpaRepository<CDSSRule, Long> {

    /**
     * 按状态查询 CDSS 规则。
     *
     * @param status 状态
     * @return CDSS 规则列表
     */
    List<CDSSRule> findByStatus(String status);

    /**
     * 按科室查询 CDSS 规则。
     *
     * @param department 科室
     * @return CDSS 规则列表
     */
    List<CDSSRule> findByDepartment(String department);
}
