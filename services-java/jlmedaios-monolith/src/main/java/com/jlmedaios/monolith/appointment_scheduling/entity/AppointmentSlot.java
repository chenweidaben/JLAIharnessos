/*
 * 健澜科技 jlmedaios - 号源实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.appointment_scheduling.entity;

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
 * 号源实体。
 *
 * <p>号源主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "appointment_slot")
public class AppointmentSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_id")
    private String slotId;

    @Column(name = "department")
    private String department;

    // @Sensitive 医生工号，脱敏存储
    @Column(name = "doctor_id")
    private String doctorId;

    @Column(name = "date")
    private LocalDate date;

    @Column(name = "time_slot")
    private String timeSlot;

    @Column(name = "type")
    private String type;

    @Column(name = "total_quota")
    private Integer totalQuota;

    @Column(name = "booked_quota")
    @Builder.Default
    private Integer bookedQuota = 0;

    @Column(name = "status")
    @Builder.Default
    private String status = "OPEN";
}
