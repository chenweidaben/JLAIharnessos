/*
 * 健澜科技 jlmedaios - 医疗设备实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment.entity;

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
 * 医疗设备实体。
 *
 * <p>append-only: 设备档案不可修改，维修留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "medical_equipment")
public class MedicalEquipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_code")
    private String deviceCode;

    @Column(name = "name")
    private String name;

    @Column(name = "model")
    private String model;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "next_maintenance_date")
    private LocalDate nextMaintenanceDate;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
