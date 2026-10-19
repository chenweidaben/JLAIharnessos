/*
 * 健澜科技 jlmedaios - 满意度评分实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_satisfaction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 满意度评分实体。
 *
 * <p>append-only: 满意度评分不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "survey_response")
public class SurveyResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "response_no")
    private String responseNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "department")
    private String department;

    @Column(name = "satisfaction_score")
    private Integer satisfactionScore;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "survey_date")
    @Builder.Default
    private LocalDate surveyDate = LocalDate.now();
}
