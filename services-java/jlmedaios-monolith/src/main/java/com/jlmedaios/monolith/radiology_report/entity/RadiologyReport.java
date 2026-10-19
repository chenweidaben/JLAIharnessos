/*
 * 健澜科技 jlmedaios - 放射报告实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_report.entity;

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
 * 放射报告实体。
 *
 * <p>append-only: 放射报告审核后不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "radiology_report")
public class RadiologyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_id")
    private Long examId;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "study_type")
    private String studyType;

    @Column(name = "study_date")
    private LocalDate studyDate;

    @Column(name = "indication", columnDefinition = "TEXT")
    private String indication;

    @Column(name = "findings", columnDefinition = "TEXT")
    private String findings;

    @Column(name = "impression", columnDefinition = "TEXT")
    private String impression;

    // @Sensitive 放射科医生工号，脱敏存储
    @Column(name = "radiologist_id")
    private String radiologistId;

    @Column(name = "status")
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
