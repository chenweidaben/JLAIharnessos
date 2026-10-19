/*
 * 健澜科技 jlmedaios - 查房记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.mobile_rounds.entity;

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
 * 查房记录实体。
 *
 * <p>append-only: 查房记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "round_record")
public class RoundRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "round_no")
    private String roundNo;

    @Column(name = "patient_id")
    private Long patientId;

    // @Sensitive 护士工号，脱敏存储
    @Column(name = "nurse_id")
    private String nurseId;

    @Column(name = "ward_code")
    private String wardCode;

    // @Sensitive 医生工号，脱敏存储
    @Column(name = "doctor_id")
    private String doctorId;

    @Column(name = "round_type")
    private String roundType;

    @Column(name = "findings", columnDefinition = "TEXT")
    private String findings;

    @Column(name = "plan", columnDefinition = "TEXT")
    private String plan;

    @Column(name = "round_time")
    @Builder.Default
    private LocalDateTime roundTime = LocalDateTime.now();

    @Column(name = "temperature")
    private BigDecimal temperature;

    @Column(name = "blood_pressure")
    private String bloodPressure;

    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "spo2")
    private Integer spo2;

    @Column(name = "nurse_notes", columnDefinition = "TEXT")
    private String nurseNotes;
}
