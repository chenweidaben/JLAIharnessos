/*
 * 健澜科技 jlmedaios - 眼科检查记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ophthalmology_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 眼科检查记录实体。
 *
 * <p>append-only: 眼科检查记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "eye_exam_record")
public class EyeExamRecord {

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

    @Column(name = "visual_sc_od")
    private String visualScOD;

    @Column(name = "visual_sc_os")
    private String visualScOS;

    @Column(name = "intraocular_pressure_od")
    private BigDecimal intraocularPressureOD;

    @Column(name = "intraocular_pressure_os")
    private BigDecimal intraocularPressureOS;

    @Column(name = "lens_exam", columnDefinition = "TEXT")
    private String lensExam;

    @Column(name = "fundus_exam", columnDefinition = "TEXT")
    private String fundusExam;

    @Column(name = "diagnosis")
    private String diagnosis;

    @Column(name = "prescription")
    private String prescription;
}
