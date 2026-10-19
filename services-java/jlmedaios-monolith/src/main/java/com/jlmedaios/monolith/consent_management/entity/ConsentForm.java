/*
 * 健澜科技 jlmedaios - 知情同意书实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consent_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 知情同意书实体。
 *
 * <p>append-only: 知情同意书不可修改；对接电子签名模块，病历 append-only</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "consent_form")
public class ConsentForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "form_no")
    private String formNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "form_type")
    private String formType;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "sign_time")
    private LocalDateTime signTime;

    @Column(name = "patient_signature")
    private String patientSignature;

    @Column(name = "doctor_signature")
    private String doctorSignature;

    @Column(name = "status")
    @Builder.Default
    private String status = "DRAFT";
}
