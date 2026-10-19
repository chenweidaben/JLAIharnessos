/*
 * 健澜科技 jlmedaios - CDS 规则实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CDS 规则实体。
 *
 * <p>CDS 规则主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cds_rule")
public class CDSRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_code")
    private String ruleCode;

    @Column(name = "rule_name")
    private String ruleName;

    @Column(name = "trigger_condition", columnDefinition = "TEXT")
    private String triggerCondition;

    @Column(name = "action_type")
    private String actionType;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "severity")
    private String severity;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";
}
