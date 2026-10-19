/*
 * 健澜科技 jlmedaios - 床位实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.ward.entity;

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

/**
 * 床位实体。
 * status 默认 "AVAILABLE"，取值 AVAILABLE/OCCUPIED；patientId 可空。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "bed")
public class Bed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bed_code")
    private String bedCode;

    @Column(name = "ward_name")
    private String wardName;

    @Column(name = "status")
    @Builder.Default
    private String status = "AVAILABLE";

    @Column(name = "patient_id")
    private Long patientId;
}
