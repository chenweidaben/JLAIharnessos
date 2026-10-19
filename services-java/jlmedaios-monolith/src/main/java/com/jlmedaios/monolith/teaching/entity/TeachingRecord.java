/*
 * 健澜科技 jlmedaios - 教学记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.teaching.entity;

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

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 教学记录实体。
 *
 * <p>append-only: 教学记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "teaching_record")
public class TeachingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_id")
    private Long planId;

    @Column(name = "trainee_name")
    private String traineeName;

    @Column(name = "course_name")
    private String courseName;

    @Column(name = "course_date")
    private LocalDate courseDate;

    @Column(name = "course_content", columnDefinition = "TEXT")
    private String courseContent;

    @Column(name = "evaluation_score")
    private BigDecimal evaluationScore;
}
