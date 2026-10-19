/*
 * 健澜科技 jlmedaios - 麻醉记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.anesthesia_management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 麻醉记录实体。
 *
 * <p>append-only: 麻醉记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "anesthesia_record")
public class AnesthesiaRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_no")
    private String recordNo;

    @Column(name = "schedule_no")
    private String scheduleNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "anesthesia_type")
    private String anesthesiaType;

    @Column(name = "anesthesia_plan", columnDefinition = "TEXT")
    private String anesthesiaPlan;

    @Column(name = "monitoring_data_json", columnDefinition = "TEXT")
    private String monitoringDataJSON;

    @Column(name = "complications", columnDefinition = "TEXT")
    private String complications;

    @Column(name = "recovery_time")
    private LocalDateTime recoveryTime;
}
