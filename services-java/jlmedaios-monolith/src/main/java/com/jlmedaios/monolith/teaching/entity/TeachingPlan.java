/*
 * 健澜科技 jlmedaios - 教学计划实体
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

import java.time.LocalDate;

/**
 * 教学计划实体。
 *
 * <p>教学计划主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "teaching_plan")
public class TeachingPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_title")
    private String planTitle;

    @Column(name = "trainee_type")
    private String traineeType;

    @Column(name = "department")
    private String department;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    // @Sensitive 导师工号，脱敏存储
    @Column(name = "supervisor_id")
    private String supervisorId;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";
}
