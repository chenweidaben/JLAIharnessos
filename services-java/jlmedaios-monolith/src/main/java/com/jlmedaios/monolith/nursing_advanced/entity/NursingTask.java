/*
 * 健澜科技 jlmedaios - 护理任务实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_advanced.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 护理任务实体。
 *
 * <p>append-only: 护理任务不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "nursing_task")
public class NursingTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_no")
    private String taskNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "task_type")
    private String taskType;

    @Column(name = "planned_time")
    private LocalDateTime plannedTime;

    @Column(name = "executed_time")
    private LocalDateTime executedTime;

    // @Sensitive 护士工号，脱敏存储
    @Column(name = "nurse_id")
    private String nurseId;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";
}
