/*
 * 健澜科技 jlmedaios - 抗菌药物记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.antibiotic.entity;

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
 * 抗菌药物记录实体。
 *
 * <p>append-only: 抗菌药物记录不可修改，特殊使用级需会诊</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "antibiotic_record")
public class AntibioticRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "drug_name")
    private String drugName;

    @Column(name = "dose")
    private String dose;

    @Column(name = "reason")
    private String reason;

    // RESTRICTED 限制使用 / SPECIAL 特殊使用
    @Column(name = "level")
    private String level;

    @Column(name = "review_status")
    @Builder.Default
    private String reviewStatus = "PENDING";

    @Column(name = "pharmacist_name")
    private String pharmacistName;

    // 特殊使用级会诊要求
    @Column(name = "consultation_required")
    @Builder.Default
    private Boolean consultationRequired = false;

    @Column(name = "consultation_note")
    private String consultationNote;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
