/*
 * 健澜科技 jlmedaios - 会诊实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consultation.entity;

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
 * 会诊实体。
 *
 * <p>append-only: 会诊记录不可修改，全过程留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "consultation")
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_dept")
    private String requestDept;

    @Column(name = "target_dept")
    private String targetDept;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "request_time")
    @Builder.Default
    private LocalDateTime requestTime = LocalDateTime.now();

    @Column(name = "consult_time")
    private LocalDateTime consultTime;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "consult_result", columnDefinition = "TEXT")
    private String consultResult;

    @Column(name = "request_doctor")
    private String requestDoctor;

    @Column(name = "consult_doctor")
    private String consultDoctor;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
