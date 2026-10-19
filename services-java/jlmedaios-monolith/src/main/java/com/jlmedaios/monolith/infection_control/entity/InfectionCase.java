/*
 * 健澜科技 jlmedaios - 院感病例实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.infection_control.entity;

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
 * 院感病例实体。
 *
 * <p>append-only: 院感病例上报不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "infection_case")
public class InfectionCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "infection_type")
    private String infectionType;

    @Column(name = "onset_date")
    private LocalDate onsetDate;

    @Column(name = "source")
    private String source;

    @Column(name = "control_measures", columnDefinition = "TEXT")
    private String controlMeasures;

    @Column(name = "status")
    @Builder.Default
    private String status = "REPORTED";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
