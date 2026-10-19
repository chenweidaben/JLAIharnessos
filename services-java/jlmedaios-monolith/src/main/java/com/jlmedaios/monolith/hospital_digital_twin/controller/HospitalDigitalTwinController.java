/*
 * 健澜科技 jlmedaios - 医院数字孪生 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_digital_twin.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.hospital_digital_twin.entity.TwinScenario;
import com.jlmedaios.monolith.hospital_digital_twin.service.HospitalDigitalTwinService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 医院数字孪生 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/twin")
public class HospitalDigitalTwinController {

    private final HospitalDigitalTwinService hospitalDigitalTwinService;

    /**
     * 仿真场景列表。
     *
     * @return Result<List<TwinScenario>>
     */
    @GetMapping("/scenarios")
    public Result<List<TwinScenario>> scenarioList() {
        return Result.ok(hospitalDigitalTwinService.scenarioList());
    }

    /**
     * 运行仿真。
     *
     * @param body {scenarioCode, scenarioName, scenarioType, parametersJSON}
     * @return Result<TwinScenario>
     */
    @PostMapping("/run")
    public Result<TwinScenario> runSimulation(@RequestBody Map<String, Object> body) {
        TwinScenario scenario = hospitalDigitalTwinService.runSimulation(
                String.valueOf(body.get("scenarioCode")),
                String.valueOf(body.get("scenarioName")),
                String.valueOf(body.get("scenarioType")),
                String.valueOf(body.get("parametersJSON"))
        );
        return Result.ok(scenario);
    }

    /**
     * 仿真结果。
     *
     * @param scenarioCode 场景编码
     * @return Result<TwinScenario>
     */
    @GetMapping("/result/{scenarioCode}")
    public Result<TwinScenario> simulationResult(@PathVariable String scenarioCode) {
        return Result.ok(hospitalDigitalTwinService.simulationResult(scenarioCode));
    }
}
