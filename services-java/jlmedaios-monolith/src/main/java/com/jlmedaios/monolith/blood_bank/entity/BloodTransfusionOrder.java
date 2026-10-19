/*
 * 健澜科技 jlmedaios - 输血申请实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_bank.entity;

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
 * 输血申请实体。
 *
 * <p>append-only: 输血申请记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "blood_transfusion_order")
public class BloodTransfusionOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "blood_type_required")
    private String bloodTypeRequired;

    @Column(name = "volume_ml")
    private Integer volumeML;

    @Column(name = "indication", columnDefinition = "TEXT")
    private String indication;

    @Column(name = "order_time")
    @Builder.Default
    private LocalDateTime orderTime = LocalDateTime.now();

    @Column(name = "issue_time")
    private LocalDateTime issueTime;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "crossmatch_result")
    private String crossmatchResult;
}
