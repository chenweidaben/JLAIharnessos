/*
 * 健澜科技 jlmedaios - 医院数字孪生 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_digital_twin;

import com.jlmedaios.monolith.hospital_digital_twin.entity.TwinScenario;
import com.jlmedaios.monolith.hospital_digital_twin.service.HospitalDigitalTwinService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医院数字孪生 Service 测试。
 */
@SpringBootTest
public class HospitalDigitalTwinServiceTest {

    @Autowired
    private HospitalDigitalTwinService hospitalDigitalTwinService;

    @Test
    void testScenarioList() {
        List<TwinScenario> list = hospitalDigitalTwinService.scenarioList();
        assertNotNull(list);
    }

    @Test
    void testRunSimulation() {
        TwinScenario scenario = hospitalDigitalTwinService.runSimulation(
                "TWIN-001", "门诊高峰仿真", "门诊仿真", "{\"arrivalRate\":\"200/h\"}");
        assertNotNull(scenario.getId());
        assertEquals("COMPLETED", scenario.getStatus());
    }

    @Test
    void testSimulationResult() {
        TwinScenario scenario = hospitalDigitalTwinService.simulationResult("TWIN-001");
        // 可能为空（H2 内存库无预置数据）
    }
}
