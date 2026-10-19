/*
 * 健澜科技 jlmedaios - 在线咨询实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.online_consultation.entity;

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
 * 在线咨询实体。
 *
 * <p>append-only: 在线咨询记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "online_consultation")
public class OnlineConsultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "consultation_no")
    private String consultationNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    // @Sensitive 医生工号，脱敏存储
    @Column(name = "doctor_id")
    private String doctorId;

    @Column(name = "department_code")
    private String departmentCode;

    @Column(name = "symptom_description", columnDefinition = "TEXT")
    private String symptomDescription;

    @Column(name = "consult_time")
    @Builder.Default
    private LocalDateTime consultTime = LocalDateTime.now();

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "prescription_generated")
    @Builder.Default
    private Boolean prescriptionGenerated = false;

    @Column(name = "fee")
    private BigDecimal fee;
}
