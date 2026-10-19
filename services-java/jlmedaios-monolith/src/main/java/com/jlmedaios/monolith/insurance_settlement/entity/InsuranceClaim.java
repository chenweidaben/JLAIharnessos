/*
 * 健澜科技 jlmedaios - 医保结算实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance_settlement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

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

    @Column(name = "claim_no")
    private String claimNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "medical_record_no")
    private String medicalRecordNo;

    @Column(name = "insurance_type")
    private String insuranceType;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(name = "insurance_pay")
    private BigDecimal insurancePay;

    @Column(name = "self_pay")
    private BigDecimal selfPay;

    @Column(name = "claim_status")
    @Builder.Default
    private String claimStatus = "SUBMITTED";

    @Column(name = "submit_date")
    @Builder.Default
    private LocalDate submitDate = LocalDate.now();
}
