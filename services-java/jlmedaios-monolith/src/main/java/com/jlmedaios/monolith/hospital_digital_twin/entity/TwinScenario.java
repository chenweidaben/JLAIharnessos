/*
 * 健澜科技 jlmedaios - 仿真场景实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_digital_twin.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 仿真场景实体。
 *
 * <p>仿真场景主数据；生产接 AnyLogic/SimPy 离散事件仿真，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "twin_scenario")
public class TwinScenario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scenario_code")
    private String scenarioCode;

    @Column(name = "scenario_name")
    private String scenarioName;

    @Column(name = "scenario_type")
    private String scenarioType;

    @Column(name = "parameters_json", columnDefinition = "TEXT")
    private String parametersJSON;

    @Column(name = "result_json", columnDefinition = "TEXT")
    private String resultJSON;

    @Column(name = "status")
    @Builder.Default
    private String status = "CREATED";
}
