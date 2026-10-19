/*
 * 健澜科技 jlmedaios - 院感管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.infection_control.service;

import com.jlmedaios.monolith.infection_control.entity.InfectionCase;
import com.jlmedaios.monolith.infection_control.repository.InfectionCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 院感管理 Service。
 *
 * <p>append-only: 院感病例上报不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class InfectionControlService {

    private final InfectionCaseRepository infectionCaseRepository;

    /**
     * 上报院感病例。
     *
     * @param patientId      患者 ID
     * @param deptCode       科室编码
     * @param infectionType  感染类型
     * @param onsetDate      发病日期
     * @param source         感染源
     * @param controlMeasures 控制措施
     * @return 已持久化的院感病例
     */
    public InfectionCase report(Long patientId, String deptCode, String infectionType,
                                LocalDate onsetDate, String source, String controlMeasures) {
        InfectionCase ic = InfectionCase.builder()
                .patientId(patientId)
                .deptCode(deptCode)
                .infectionType(infectionType)
                .onsetDate(onsetDate)
                .source(source)
                .controlMeasures(controlMeasures)
                .build();
        return infectionCaseRepository.save(ic);
    }

    /**
     * 按科室查询院感病例。
     *
     * @param deptCode 科室编码
     * @return 院感病例列表
     */
    public List<InfectionCase> listByDept(String deptCode) {
        return infectionCaseRepository.findByDeptCode(deptCode);
    }

    /**
     * 院感月度趋势（mock）。
     *
     * @return 趋势数据
     */
    public Map<String, Object> trend() {
        Map<String, Object> trend = new HashMap<>();
        trend.put("monthly", List.of(Map.of("month", "2026-09", "cases", 5)));
        return trend;
    }

    /**
     * 关闭院感病例（设 status=CLOSED）。
     *
     * @param id 院感病例 ID
     * @return 已更新的院感病例
     */
    public Optional<InfectionCase> close(Long id) {
        Optional<InfectionCase> opt = infectionCaseRepository.findById(id);
        if (opt.isPresent()) {
            InfectionCase ic = opt.get();
            ic.setStatus("CLOSED");
            ic.setUpdatedAt(LocalDateTime.now());
            infectionCaseRepository.save(ic);
        }
        return opt;
    }
}
