/*
 * 健澜科技 jlmedaios - CDSS 规则实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision_support.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CDSS 规则实体。
 *
 * <p>CDSS 规则主数据；与 ai_prescription_review.py 形成 Java 规则引擎+AI 辅助双保险</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cdss_rule")
public class CDSSRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_code")
    private String ruleCode;

    @Column(name = "rule_name")
    private String ruleName;

    @Column(name = "department")
    private String department;

    @Column(name = "trigger_condition", columnDefinition = "TEXT")
    private String triggerCondition;

    @Column(name = "action", columnDefinition = "TEXT")
    private String action;

    @Column(name = "warning_level")
    private String warningLevel;

    @Column(name = "status")
    @Builder.Default
    private String status = "ENABLED";
}
