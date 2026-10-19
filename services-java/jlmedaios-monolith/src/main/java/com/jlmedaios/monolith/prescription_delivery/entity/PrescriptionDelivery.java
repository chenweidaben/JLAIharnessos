/*
 * 健澜科技 jlmedaios - 处方配送实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.prescription_delivery.entity;

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
 * 处方配送实体。
 *
 * <p>append-only: 处方配送记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "prescription_delivery")
public class PrescriptionDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prescription_no")
    private String prescriptionNo;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "drug_list_json", columnDefinition = "TEXT")
    private String drugListJSON;

    // @Sensitive 收件人姓名，脱敏存储
    @Column(name = "recipient_name")
    private String recipientName;

    // @Sensitive 收件人电话，脱敏存储
    @Column(name = "recipient_phone")
    private String recipientPhone;

    @Column(name = "address")
    private String address;

    @Column(name = "delivery_fee")
    private BigDecimal deliveryFee;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "tracking_no")
    private String trackingNo;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
