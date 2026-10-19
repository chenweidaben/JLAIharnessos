/*
 * 健澜科技 jlmedaios - 设备维护记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 设备维护记录实体。
 *
 * <p>append-only: 维护记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "equipment_maintenance")
public class EquipmentMaintenance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "maintenance_no")
    private String maintenanceNo;

    @Column(name = "equipment_code")
    private String equipmentCode;

    @Column(name = "maintenance_type")
    private String maintenanceType;

    @Column(name = "maintenance_date")
    @Builder.Default
    private LocalDate maintenanceDate = LocalDate.now();

    @Column(name = "maintenance_vendor")
    private String maintenanceVendor;

    @Column(name = "cost")
    private BigDecimal cost;

    @Column(name = "next_maintenance_date")
    private LocalDate nextMaintenanceDate;
}
