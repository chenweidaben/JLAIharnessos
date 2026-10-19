/*
 * 健澜科技 jlmedaios - 随访计划实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup_plan.entity;

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
 * 随访计划实体。
 *
 * <p>append-only: 随访计划不可修改，执行留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "followup_plan")
public class FollowupPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_no")
    private String planNo;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "visit_id")
    private Long visitId;

    @Column(name = "disease_code")
    private String diseaseCode;

    @Column(name = "followup_type")
    private String followupType;

    @Column(name = "plan_type")
    private String planType;

    @Column(name = "planned_date")
    private LocalDate plannedDate;

    @Column(name = "followup_date")
    private LocalDate followupDate;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "channel")
    private String channel;

    @Column(name = "contact_method")
    private String contactMethod;

    @Column(name = "execute_note", columnDefinition = "TEXT")
    private String executeNote;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
