/*
 * 健澜科技 jlmedaios - 挂号实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.reg.entity;

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
 * 挂号实体。
 *
 * <p>append-only: 本记录创建后不可修改，只能新增修订记录</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "reg_register")
public class Register {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "doctor_name")
    private String doctorName;

    @Column(name = "appointment_date")
    private LocalDate appointmentDate;

    @Column(name = "status")
    @Builder.Default
    private String status = "BOOKED";

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
