/*
 * 健澜科技 jlmedaios - 药学咨询实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_service.entity;

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
 * 药学咨询实体。
 *
 * <p>append-only: 药学咨询记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "pharmacy_consult")
public class PharmacyConsult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "drug_name")
    private String drugName;

    // 用药咨询/不良反应/药物重整/药学门诊
    @Column(name = "consult_type")
    private String consultType;

    @Column(name = "question_text", columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    // @Sensitive 药师工号，脱敏存储
    @Column(name = "pharmacist_id")
    private String pharmacistId;

    @Column(name = "consult_time")
    @Builder.Default
    private LocalDateTime consultTime = LocalDateTime.now();

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
