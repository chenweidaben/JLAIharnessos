/*
 * 健澜科技 jlmedaios - 病案实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_record.entity;

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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 病案实体。
 *
 * <p>append-only: 病案归档后不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "medical_record")
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "visit_id")
    private Long visitId;

    @Column(name = "record_type")
    private String recordType;

    @Column(name = "icd_principal")
    private String icdPrincipal;

    @Column(name = "icd_other")
    private String icdOther;

    @Column(name = "operation_codes")
    private String operationCodes;

    @Column(name = "admission_date")
    private LocalDate admissionDate;

    @Column(name = "discharge_date")
    private LocalDate dischargeDate;

    @Column(name = "attending_doctor")
    private String attendingDoctor;

    @Column(name = "quality_check_status")
    @Builder.Default
    private String qualityCheckStatus = "PENDING";

    @Column(name = "archived_status")
    @Builder.Default
    private String archivedStatus = "UNARCHIVED";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
