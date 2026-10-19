/*
 * 健澜科技 jlmedaios - 退费申请实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_refund.entity;

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
 * 退费申请实体。
 *
 * <p>append-only: 退费申请不可修改，审核留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "refund_request")
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "refund_no")
    private String refundNo;

    @Column(name = "original_charge_no")
    private String originalChargeNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "refund_amount")
    private BigDecimal refundAmount;

    @Column(name = "refund_reason", columnDefinition = "TEXT")
    private String refundReason;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    // @Sensitive 申请人工号，脱敏存储
    @Column(name = "applied_by")
    private String appliedBy;

    // @Sensitive 审批人工号，脱敏存储
    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "apply_time")
    @Builder.Default
    private LocalDateTime applyTime = LocalDateTime.now();

    @Column(name = "approve_time")
    private LocalDateTime approveTime;
}
