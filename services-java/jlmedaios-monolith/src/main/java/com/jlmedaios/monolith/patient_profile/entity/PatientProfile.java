/*
 * 健澜科技 jlmedaios - 患者画像实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_profile.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 患者画像实体。
 *
 * <p>患者 360 度画像；汇总患者所有诊疗数据，生产接数据中台</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "patient_profile")
public class PatientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "demographics_json", columnDefinition = "TEXT")
    private String demographicsJson;

    @Column(name = "diagnoses_json", columnDefinition = "TEXT")
    private String diagnosesJson;

    @Column(name = "medications_json", columnDefinition = "TEXT")
    private String medicationsJson;

    @Column(name = "lab_trends_json", columnDefinition = "TEXT")
    private String labTrendsJson;

    @Column(name = "allergies_json", columnDefinition = "TEXT")
    private String allergiesJson;

    @Column(name = "last_visit_date")
    private LocalDate lastVisitDate;

    @Column(name = "risk_score")
    private BigDecimal riskScore;
}
