/*
 * 健澜科技 jlmedaios - 医疗废物记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_waste.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 医疗废物记录实体。
 *
 * <p>append-only: 医疗废物记录不可修改；对接医疗废物集中处置中心，转运联单可追溯</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "waste_record")
public class WasteRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_no")
    private String recordNo;

    @Column(name = "waste_type")
    private String wasteType;

    @Column(name = "weight_kg")
    private BigDecimal weightKg;

    @Column(name = "generate_department")
    private String generateDepartment;

    @Column(name = "generate_date")
    @Builder.Default
    private LocalDate generateDate = LocalDate.now();

    @Column(name = "collection_date")
    private LocalDate collectionDate;

    @Column(name = "transport_company")
    private String transportCompany;

    @Column(name = "disposal_location")
    private String disposalLocation;

    @Column(name = "status")
    @Builder.Default
    private String status = "STORED";
}
