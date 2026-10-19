/*
 * 健澜科技 jlmedaios - 医务人员实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin.entity;

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
 * 医务人员实体。
 *
 * <p>append-only: 人员档案不可修改，职称变更留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "medical_staff")
public class MedicalStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "dept")
    private String dept;

    @Column(name = "title")
    private String title;

    // 医师/护士/药师/技师
    @Column(name = "employee_type")
    private String employeeType;

    // @Sensitive 执业证号，脱敏存储
    @Column(name = "license_no")
    private String licenseNo;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
