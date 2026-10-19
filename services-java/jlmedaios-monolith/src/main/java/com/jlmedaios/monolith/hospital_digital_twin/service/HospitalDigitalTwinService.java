/*
 * 健澜科技 jlmedaios - 医院数字孪生 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_digital_twin.service;

import com.jlmedaios.monolith.hospital_digital_twin.entity.TwinScenario;
import com.jlmedaios.monolith.hospital_digital_twin.repository.TwinScenarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 医院数字孪生 Service。
 *
 * <p>仿真场景主数据；生产接 AnyLogic/SimPy 离散事件仿真，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class HospitalDigitalTwinService {

    private final TwinScenarioRepository twinScenarioRepository;

    /**
     * 仿真场景列表。
     *
     * @return 仿真场景列表
     */
    public List<TwinScenario> scenarioList() {
        return twinScenarioRepository.findAll();
    }

    /**
     * 运行仿真。
     *
     * @param scenarioCode   场景编码
     * @param scenarioName   场景名称
     * @param scenarioType   场景类型
     * @param parametersJSON 参数 JSON
     * @return 已完成的仿真场景
     */
    public TwinScenario runSimulation(String scenarioCode, String scenarioName,
                                       String scenarioType, String parametersJSON) {
        TwinScenario scenario = TwinScenario.builder()
                .scenarioCode(scenarioCode)
                .scenarioName(scenarioName)
                .scenarioType(scenarioType)
                .parametersJSON(parametersJSON)
                .status("COMPLETED")
                .resultJSON("{\"avgWaitTime\":\"25分钟\",\"maxQueue\":45}")
                .build();
        return twinScenarioRepository.save(scenario);
    }

    /**
     * 仿真结果。
     *
     * @param scenarioCode 场景编码
     * @return 仿真场景
     */
    public TwinScenario simulationResult(String scenarioCode) {
        return twinScenarioRepository.findAll().stream()
                .filter(s -> scenarioCode.equals(s.getScenarioCode()))
                .findFirst()
                .orElse(null);
    }
}
