/*
 * 健澜科技 jlmedaios - 护理工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.nursing_workstation.entity.NursingHandover;
import com.jlmedaios.monolith.nursing_workstation.service.NursingWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 护理工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/nursing")
public class NursingWorkstationController {

    private final NursingWorkstationService nursingWorkstationService;

    /**
     * 今日护理任务。
     *
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/today/tasks")
    public Result<List<Map<String, Object>>> todayTasks() {
        return Result.ok(nursingWorkstationService.todayTasks());
    }

    /**
     * 创建交班记录。
     *
     * @param body {handoverNo, wardCode, shiftType, nurseIn, nurseOut, patientCount}
     * @return Result<NursingHandover>
     */
    @PostMapping("/handover/create")
    public Result<NursingHandover> createHandover(@RequestBody Map<String, Object> body) {
        NursingHandover handover = nursingWorkstationService.createHandover(
                String.valueOf(body.get("handoverNo")),
                String.valueOf(body.get("wardCode")),
                String.valueOf(body.get("shiftType")),
                String.valueOf(body.get("nurseIn")),
                String.valueOf(body.get("nurseOut")),
                Integer.valueOf(String.valueOf(body.get("patientCount")))
        );
        return Result.ok(handover);
    }

    /**
     * 交班历史。
     *
     * @param wardCode 病区编码
     * @return Result<List<NursingHandover>>
     */
    @GetMapping("/handover/{wardCode}")
    public Result<List<NursingHandover>> handoverHistory(@PathVariable String wardCode) {
        return Result.ok(nursingWorkstationService.handoverHistory(wardCode));
    }

    /**
     * 执行医嘱。
     *
     * @param id 医嘱 ID
     * @return Result<Map<String, Object>>
     */
    @PutMapping("/order/{id}/execute")
    public Result<Map<String, Object>> executeOrder(@PathVariable Long id) {
        return Result.ok(nursingWorkstationService.executeOrder(id));
    }
}
