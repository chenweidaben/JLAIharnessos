/*
 * 健澜科技 jlmedaios - 随访任务实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup.entity;

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
 * 随访任务实体。
 *
 * <p>append-only: 随访记录不可修改，满意度评分审计</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "followup_task")
public class FollowupTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "discharge_date")
    private LocalDate dischargeDate;

    @Column(name = "plan_date")
    private LocalDate planDate;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "questionnaire_content", columnDefinition = "TEXT")
    private String questionnaireContent;

    @Column(name = "feedback_text")
    private String feedbackText;

    // 满意度评分（1-5 分）
    @Column(name = "satisfaction")
    private Integer satisfaction;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
