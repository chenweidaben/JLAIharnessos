/*
 * 健澜科技 jlmedaios - 员工实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hr_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 员工实体。
 *
 * <p>员工主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "employee")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_no")
    private String employeeNo;

    @Column(name = "name")
    private String name;

    @Column(name = "gender")
    private String gender;

    @Column(name = "department")
    private String department;

    @Column(name = "position")
    private String position;

    @Column(name = "title")
    private String title;

    @Column(name = "hire_date")
    private LocalDate hireDate;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";

    // @Sensitive 手机号，脱敏存储
    @Column(name = "phone")
    private String phone;
}
