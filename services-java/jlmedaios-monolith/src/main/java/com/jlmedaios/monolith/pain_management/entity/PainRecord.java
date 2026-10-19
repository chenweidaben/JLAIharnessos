/*
 * 健澜科技 jlmedaios - 疼痛评估记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pain_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 疼痛评估记录实体。
 *
 * <p>append-only: 疼痛评估记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "pain_record")
public class PainRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_no")
    private String recordNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "pain_site")
    private String painSite;

    @Column(name = "pain_score")
    private Integer painScore;

    @Column(name = "pain_type")
    private String painType;

    @Column(name = "treatment_type")
    private String treatmentType;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;
}
