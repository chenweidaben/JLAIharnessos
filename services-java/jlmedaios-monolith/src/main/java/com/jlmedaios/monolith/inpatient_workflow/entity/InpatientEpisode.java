/*
 * 健澜科技 jlmedaios - 住院 episode 实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.inpatient_workflow.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 住院 episode 实体。
 *
 * <p>append-only: 住院episode不可修改；串联入院→医嘱→护理→结算→出院全流程</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "inpatient_episode")
public class InpatientEpisode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "episode_no")
    private String episodeNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "admit_time")
    @Builder.Default
    private LocalDateTime admitTime = LocalDateTime.now();

    @Column(name = "discharge_time")
    private LocalDateTime dischargeTime;

    @Column(name = "admit_department")
    private String admitDepartment;

    @Column(name = "bed_no")
    private String bedNo;

    @Column(name = "total_stay_days")
    private Integer totalStayDays;

    @Column(name = "status")
    @Builder.Default
    private String status = "ADMITTED";
}
