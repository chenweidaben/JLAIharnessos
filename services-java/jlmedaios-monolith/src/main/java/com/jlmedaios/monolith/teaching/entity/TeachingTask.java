/*
 * 健澜科技 jlmedaios - 教学任务实体
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
import java.time.LocalDateTime;

/**
 * 教学任务实体。
 *
 * <p>append-only: 教学任务记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "teaching_task")
public class TeachingTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_type")
    private String taskType;

    @Column(name = "topic")
    private String topic;

    // @Sensitive 教师工号，脱敏存储
    @Column(name = "teacher_id")
    private String teacherId;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "date")
    private LocalDate date;

    @Column(name = "duration_hours")
    private BigDecimal durationHours;

    @Column(name = "student_count")
    private Integer studentCount;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
