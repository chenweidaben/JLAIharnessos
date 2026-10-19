/*
 * 健澜科技 jlmedaios - 医技检查预约实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment.entity;

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
 * 医技检查预约实体。
 *
 * <p>append-only: 预约记录不可修改，取消留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "appointment")
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    // CT/MRI/超声/内镜/心电图
    @Column(name = "exam_type")
    private String examType;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;

    @Column(name = "status")
    @Builder.Default
    private String status = "BOOKED";

    @Column(name = "room_number")
    private String roomNumber;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
