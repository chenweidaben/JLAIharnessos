/*
 * 健澜科技 jlmedaios - 医保结算实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance.entity;

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

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 医保结算实体。
 *
 * <p>append-only: 医保结算记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "insurance_claim")
public class InsuranceClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "visit_id")
    private Long visitId;

    // @Sensitive 主诊断，脱敏存储
    @Column(name = "principal_diagnosis")
    private String principalDiagnosis;

    @Column(name = "other_diagnoses")
    private String otherDiagnoses;

    @Column(name = "procedures")
    private String procedures;

    @Column(name = "total_cost", precision = 10, scale = 2)
    private BigDecimal totalCost;

    // DRG 分组，如 AH1
    @Column(name = "drg_group")
    private String drgGroup;

    // DIP 分组
    @Column(name = "dip_group")
    private String dipGroup;

    @Column(name = "estimated_reimburse", precision = 10, scale = 2)
    private BigDecimal estimatedReimburse;

    @Column(name = "actual_reimburse", precision = 10, scale = 2)
    private BigDecimal actualReimburse;

    @Column(name = "status")
    @Builder.Default
    private String status = "SUBMITTED";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
