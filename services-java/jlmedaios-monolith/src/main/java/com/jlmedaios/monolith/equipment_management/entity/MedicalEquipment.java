/*
 * 健澜科技 jlmedaios - 设备实体
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
 * 设备实体。
 *
 * <p>设备主数据</p>
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

    @Column(name = "equipment_code")
    private String equipmentCode;

    @Column(name = "equipment_name")
    private String equipmentName;

    @Column(name = "model")
    private String model;

    @Column(name = "manufacturer")
    private String manufacturer;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "warranty_end_date")
    private LocalDate warrantyEndDate;

    @Column(name = "price")
    private BigDecimal price;

    @Column(name = "status")
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "location")
    private String location;

    @Column(name = "department")
    private String department;
}
