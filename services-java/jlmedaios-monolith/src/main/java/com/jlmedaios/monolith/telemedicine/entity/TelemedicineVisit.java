/*
 * 健澜科技 jlmedaios - 远程问诊实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.telemedicine.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 远程问诊实体。
 *
 * <p>append-only: 远程问诊记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "telemedicine_visit")
public class TelemedicineVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visit_no")
    private String visitNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    // @Sensitive 医生工号，脱敏存储
    @Column(name = "doctor_id")
    private String doctorId;

    @Column(name = "department")
    private String department;

    @Column(name = "visit_type")
    private String visitType;

    @Column(name = "status")
    @Builder.Default
    private String status = "WAITING";

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "prescription_issued")
    @Builder.Default
    private Boolean prescriptionIssued = false;
}
