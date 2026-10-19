/*
 * 健澜科技 jlmedaios - 药品相互作用规则实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_interaction.entity;

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
 * 药品相互作用规则实体。
 *
 * <p>药品相互作用规则主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "drug_interaction_rule")
public class DrugInteractionRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "drug_code_a")
    private String drugCodeA;

    @Column(name = "drug_code_b")
    private String drugCodeB;

    @Column(name = "interaction_type")
    private String interactionType;

    @Column(name = "severity")
    private String severity;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "clinical_advice", columnDefinition = "TEXT")
    private String clinicalAdvice;
}
