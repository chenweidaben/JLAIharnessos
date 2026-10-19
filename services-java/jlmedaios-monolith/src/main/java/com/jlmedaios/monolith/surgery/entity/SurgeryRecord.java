/*
 * 健澜科技 jlmedaios - 手术记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 手术记录实体。
 *
 * <p>append-only: 手术记录一旦生成不可修改，只能追加手术记录修订</p>
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

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "surgery_name")
    private String surgeryName;

    @Column(name = "doctor_name")
    private String doctorName;

    @Column(name = "anesthesiologist")
    private String anesthesiologist;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "status")
    @Builder.Default
    private String status = "SCHEDULED";

    // 麻醉前三方核对
    @Column(name = "safety_check_pre_anesthesia")
    @Builder.Default
    private Boolean safetyCheckPreAnesthesia = false;

    // 手术前三方核对
    @Column(name = "safety_check_pre_surgery")
    @Builder.Default
    private Boolean safetyCheckPreSurgery = false;

    // 离室前三方核对
    @Column(name = "safety_check_before_exit")
    @Builder.Default
    private Boolean safetyCheckBeforeExit = false;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
