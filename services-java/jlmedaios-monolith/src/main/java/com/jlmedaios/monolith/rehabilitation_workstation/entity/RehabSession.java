/*
 * 健澜科技 jlmedaios - 康复治疗记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 康复治疗记录实体。
 *
 * <p>append-only: 康复治疗记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "rehab_session")
public class RehabSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_no")
    private String sessionNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "therapy_type")
    private String therapyType;

    // @Sensitive 治疗师 ID，脱敏存储
    @Column(name = "therapist")
    private String therapist;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "status")
    @Builder.Default
    private String status = "SCHEDULED";
}
