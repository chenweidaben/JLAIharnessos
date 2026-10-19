/*
 * 健澜科技 jlmedaios - 院感管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.infection_control.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.infection_control.entity.InfectionCase;
import com.jlmedaios.monolith.infection_control.service.InfectionControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 院感管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/infection")
public class InfectionControlController {

    private final InfectionControlService infectionControlService;

    /**
     * 上报院感病例。
     *
     * @param body {patientId, deptCode, infectionType, onsetDate, source, controlMeasures}
     * @return Result<InfectionCase>
     */
    @PostMapping("/report")
    public Result<InfectionCase> report(@RequestBody Map<String, Object> body) {
        InfectionCase ic = infectionControlService.report(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("deptCode")),
                String.valueOf(body.get("infectionType")),
                LocalDate.parse(String.valueOf(body.get("onsetDate"))),
                String.valueOf(body.get("source")),
                String.valueOf(body.get("controlMeasures"))
        );
        return Result.ok(ic);
    }

    /**
     * 按科室查询院感病例。
     *
     * @param deptCode 科室编码
     * @return Result<List<InfectionCase>>
     */
    @GetMapping("/dept/{deptCode}")
    public Result<List<InfectionCase>> listByDept(@PathVariable String deptCode) {
        return Result.ok(infectionControlService.listByDept(deptCode));
    }

    /**
     * 院感月度趋势（mock）。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/trend")
    public Result<Map<String, Object>> trend() {
        return Result.ok(infectionControlService.trend());
    }

    /**
     * 关闭院感病例。
     *
     * @param id 院感病例 ID
     * @return Result<InfectionCase>
     */
    @PutMapping("/{id}/close")
    public Result<InfectionCase> close(@PathVariable Long id) {
        return infectionControlService.close(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 开始调查。
     *
     * @param id 院感病例 ID
     * @return Result<InfectionCase>
     */
    @PutMapping("/{id}/investigate")
    public Result<InfectionCase> investigate(@PathVariable Long id) {
        return infectionControlService.investigate(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 待处理列表。
     *
     * @return Result<List<InfectionCase>>
     */
    @GetMapping("/pending")
    public Result<List<InfectionCase>> pendingList() {
        return Result.ok(infectionControlService.pendingList());
    }

    /**
     * 院感统计（mock）。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(infectionControlService.stats());
    }
}
