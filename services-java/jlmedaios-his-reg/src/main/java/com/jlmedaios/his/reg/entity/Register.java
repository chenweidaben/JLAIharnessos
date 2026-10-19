/*
 * 健澜科技 jlmedaios - 挂号记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.reg.entity;

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
 * 挂号记录实体。
 * status 默认 "BOOKED"。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "register")
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
}
