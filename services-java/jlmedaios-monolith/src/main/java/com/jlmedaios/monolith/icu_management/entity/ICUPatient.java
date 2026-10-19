/*
 * 健澜科技 jlmedaios - ICU 患者实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ICU 患者实体。
 *
 * <p>ICU 患者主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "icu_patient")
public class ICUPatient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "bed_no")
    private String bedNo;

    @Column(name = "admit_time")
    @Builder.Default
    private LocalDateTime admitTime = LocalDateTime.now();

    @Column(name = "diagnosis")
    private String diagnosis;

    @Column(name = "apache_ii_score")
    private BigDecimal apacheIIScore;

    @Column(name = "status")
    @Builder.Default
    private String status = "IN_BED";

    // @Sensitive 责任护士工号，脱敏存储
    @Column(name = "primary_nurse")
    private String primaryNurse;
}
