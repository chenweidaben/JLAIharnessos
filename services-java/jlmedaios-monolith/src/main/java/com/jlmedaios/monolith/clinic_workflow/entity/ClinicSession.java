/*
 * 健澜科技 jlmedaios - 门诊就诊会话实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinic_workflow.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 门诊就诊会话实体。
 *
 * <p>append-only: 门诊就诊会话不可修改；串联挂号→就诊→收费→取药全流程</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "clinic_session")
public class ClinicSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_no")
    private String sessionNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "department")
    private String department;

    // @Sensitive 医生工号，脱敏存储
    @Column(name = "doctor_id")
    private String doctorId;

    @Column(name = "registration_time")
    @Builder.Default
    private LocalDateTime registrationTime = LocalDateTime.now();

    @Column(name = "see_doctor_time")
    private LocalDateTime seeDoctorTime;

    @Column(name = "charge_time")
    private LocalDateTime chargeTime;

    @Column(name = "pickup_drug_time")
    private LocalDateTime pickupDrugTime;

    @Column(name = "total_duration_minutes")
    private Integer totalDurationMinutes;

    @Column(name = "status")
    @Builder.Default
    private String status = "REGISTERED";
}
