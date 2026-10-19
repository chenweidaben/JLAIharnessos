/*
 * 健澜科技 jlmedaios - 手术排班实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operation_schedule.entity;

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
 * 手术排班实体。
 *
 * <p>append-only: 手术排班不可修改，取消留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "operation_schedule")
public class OperationSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_code")
    private String roomCode;

    // @Sensitive 主刀医生工号，脱敏存储
    @Column(name = "surgeon_id")
    private String surgeonId;

    // @Sensitive 助手工号，脱敏存储
    @Column(name = "assistant_id")
    private String assistantId;

    // @Sensitive 麻醉师工号，脱敏存储
    @Column(name = "anesthesiologist_id")
    private String anesthesiologistId;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "procedure_name")
    private String procedureName;

    @Column(name = "scheduled_start")
    private LocalDateTime scheduledStart;

    @Column(name = "scheduled_end")
    private LocalDateTime scheduledEnd;

    @Column(name = "status")
    @Builder.Default
    private String status = "SCHEDULED";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
