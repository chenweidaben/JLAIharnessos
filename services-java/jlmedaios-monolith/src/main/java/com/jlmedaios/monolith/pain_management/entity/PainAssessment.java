/*
 * 健澜科技 jlmedaios - 疼痛评估实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pain_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 疼痛评估实体。
 *
 * <p>append-only: 疼痛评估记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "pain_assessment")
public class PainAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assessment_no")
    private String assessmentNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "assessment_time")
    @Builder.Default
    private LocalDateTime assessmentTime = LocalDateTime.now();

    @Column(name = "pain_score")
    private Integer painScore;

    @Column(name = "pain_location")
    private String painLocation;

    @Column(name = "pain_character")
    private String painCharacter;

    @Column(name = "medication_given")
    private String medicationGiven;

    @Column(name = "relief_score")
    private Integer reliefScore;
}
