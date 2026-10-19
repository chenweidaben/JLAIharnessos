/*
 * 健澜科技 jlmedaios - 手术记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery_advanced.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 手术记录实体。
 *
 * <p>append-only: 手术记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "surgery_record")
public class SurgeryRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "schedule_no")
    private String scheduleNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "actual_start")
    private LocalDateTime actualStart;

    @Column(name = "actual_end")
    private LocalDateTime actualEnd;

    @Column(name = "pre_op_diagnosis")
    private String preOpDiagnosis;

    @Column(name = "post_op_diagnosis")
    private String postOpDiagnosis;

    @Column(name = "surgery_description", columnDefinition = "TEXT")
    private String surgeryDescription;

    @Column(name = "bleeding_amount")
    private BigDecimal bleedingAmount;

    @Column(name = "transfusion")
    private String transfusion;

    @Column(name = "complications", columnDefinition = "TEXT")
    private String complications;
}
