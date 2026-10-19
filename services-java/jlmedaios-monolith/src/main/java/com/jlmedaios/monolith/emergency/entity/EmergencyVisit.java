/*
 * 健澜科技 jlmedaios - 急诊就诊实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emergency.entity;

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
 * 急诊就诊实体。
 *
 * <p>append-only: 急诊就诊记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "emergency_visit")
public class EmergencyVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "arrival_time")
    @Builder.Default
    private LocalDateTime arrivalTime = LocalDateTime.now();

    @Column(name = "triage_level")
    private String triageLevel;

    @Column(name = "chief_complaint")
    private String chiefComplaint;

    @Column(name = "departure_type")
    private String departureType;

    @Column(name = "departure_time")
    private LocalDateTime departureTime;

    @Column(name = "attending_doctor")
    private String attendingDoctor;

    @Column(name = "status")
    @Builder.Default
    private String status = "ONGOING";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
