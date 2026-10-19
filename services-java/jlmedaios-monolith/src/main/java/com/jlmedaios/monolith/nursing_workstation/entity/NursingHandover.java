/*
 * 健澜科技 jlmedaios - 护理交班记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_workstation.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 护理交班记录实体。
 *
 * <p>append-only: 护理交班记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "nursing_handover")
public class NursingHandover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "handover_no")
    private String handoverNo;

    @Column(name = "ward_code")
    private String wardCode;

    @Column(name = "shift_type")
    private String shiftType;

    // @Sensitive 交班护士 ID，脱敏存储
    @Column(name = "nurse_in")
    private String nurseIn;

    // @Sensitive 接班护士 ID，脱敏存储
    @Column(name = "nurse_out")
    private String nurseOut;

    @Column(name = "patient_count")
    private Integer patientCount;

    @Column(name = "key_events_json", columnDefinition = "TEXT")
    private String keyEventsJSON;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";
}
