/*
 * 健澜科技 jlmedaios - ICU 监护记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ICU 监护记录实体。
 *
 * <p>append-only: ICU 监护记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "icu_record")
public class ICURecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_no")
    private String recordNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "bed_number")
    private String bedNumber;

    @Column(name = "record_time")
    @Builder.Default
    private LocalDateTime recordTime = LocalDateTime.now();

    @Column(name = "vitals_json", columnDefinition = "TEXT")
    private String vitalsJSON;

    @Column(name = "vasopressor")
    private String vasopressor;

    @Column(name = "ventilator_settings")
    private String ventilatorSettings;

    // @Sensitive 责任护士 ID，脱敏存储
    @Column(name = "nurse_in_charge")
    private String nurseInCharge;
}
