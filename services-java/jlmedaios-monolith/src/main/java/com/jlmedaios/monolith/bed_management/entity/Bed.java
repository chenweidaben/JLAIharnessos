/*
 * 健澜科技 jlmedaios - 床位实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.bed_management.entity;

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
 * 床位实体。
 *
 * <p>床位主数据，状态实时变更</p>
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

    @Column(name = "bed_no")
    private String bedNo;

    @Column(name = "ward_code")
    private String wardCode;

    @Column(name = "room_number")
    private String roomNumber;

    @Column(name = "bed_type")
    private String bedType;

    @Column(name = "status")
    @Builder.Default
    private String status = "AVAILABLE";

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "admission_time")
    private LocalDateTime admissionTime;
}
