/*
 * 健澜科技 jlmedaios - 口腔科检查记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.dental_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 口腔科检查记录实体。
 *
 * <p>append-only: 口腔科检查记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "dental_record")
public class DentalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_no")
    private String recordNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "visit_type")
    private String visitType;

    @Column(name = "exam_type")
    private String examType;

    @Column(name = "teeth_condition_json", columnDefinition = "TEXT")
    private String teethConditionJSON;

    @Column(name = "diagnosis")
    private String diagnosis;

    @Column(name = "treatment_plan", columnDefinition = "TEXT")
    private String treatmentPlan;
}
