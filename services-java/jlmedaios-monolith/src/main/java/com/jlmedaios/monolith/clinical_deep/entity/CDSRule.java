/*
 * 健澜科技 jlmedaios - CDS 规则实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_deep.entity;

import jakarta.persistence.*;
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

    @Column(name = "condition", columnDefinition = "TEXT")
    private String condition;

    @Column(name = "priority")
    private Integer priority;

    @Column(name = "action", columnDefinition = "TEXT")
    private String action;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "category")
    private String category;
}
