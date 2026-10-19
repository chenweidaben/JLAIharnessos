/*
 * 健澜科技 jlmedaios - 急诊就诊记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.er_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 急诊就诊记录实体。
 *
 * <p>append-only: 急诊就诊记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "er_visit")
public class ERVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visit_no")
    private String visitNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "triage_level")
    private String triageLevel;

    @Column(name = "arrival_time")
    @Builder.Default
    private LocalDateTime arrivalTime = LocalDateTime.now();

    @Column(name = "triage_time")
    private LocalDateTime triageTime;

    // @Sensitive 接诊医生 ID，脱敏存储
    @Column(name = "doctor")
    private String doctor;

    @Column(name = "room")
    private String room;

    @Column(name = "status")
    @Builder.Default
    private String status = "WAITING";
}
