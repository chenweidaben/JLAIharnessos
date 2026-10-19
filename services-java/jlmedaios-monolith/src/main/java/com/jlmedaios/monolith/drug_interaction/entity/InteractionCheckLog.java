/*
 * 健澜科技 jlmedaios - 相互作用检查日志实体
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

import java.time.LocalDateTime;

/**
 * 相互作用检查日志实体。
 *
 * <p>append-only: 相互作用检查日志不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "interaction_check_log")
public class InteractionCheckLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "medications_json", columnDefinition = "TEXT")
    private String medicationsJSON;

    @Column(name = "check_time")
    @Builder.Default
    private LocalDateTime checkTime = LocalDateTime.now();

    @Column(name = "result")
    private String result;

    @Column(name = "matched_rules_json", columnDefinition = "TEXT")
    private String matchedRulesJSON;
}
