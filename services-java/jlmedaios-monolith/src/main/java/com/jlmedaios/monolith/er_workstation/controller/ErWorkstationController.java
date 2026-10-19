/*
 * 健澜科技 jlmedaios - 急诊工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.er_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.er_workstation.entity.ERVisit;
import com.jlmedaios.monolith.er_workstation.service.ErWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 急诊工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/er")
public class ErWorkstationController {

    private final ErWorkstationService erWorkstationService;

    /**
     * 今日急诊列表。
     *
     * @return Result<List<ERVisit>>
     */
    @GetMapping("/today")
    public Result<List<ERVisit>> todayVisits() {
        return Result.ok(erWorkstationService.todayVisits());
    }

    /**
     * 急诊分诊。
     *
     * @param body {visitNo, triageLevel}
     * @return Result<ERVisit>
     */
    @PostMapping("/triage")
    public Result<ERVisit> triage(@RequestBody Map<String, Object> body) {
        ERVisit visit = erWorkstationService.triage(
                String.valueOf(body.get("visitNo")),
                String.valueOf(body.get("triageLevel"))
        );
        return Result.ok(visit);
    }

    /**
     * 接诊。
     *
     * @param visitNo 就诊编号
     * @param body    {doctor, room}
     * @return Result<ERVisit>
     */
    @PutMapping("/{visitNo}/admit")
    public Result<ERVisit> admit(@PathVariable String visitNo,
                                  @RequestBody Map<String, Object> body) {
        return Result.ok(erWorkstationService.admit(visitNo,
                String.valueOf(body.get("doctor")),
                String.valueOf(body.get("room"))));
    }

    /**
     * 离院（转归）。
     *
     * @param visitNo 就诊编号
     * @param body    {outcome}
     * @return Result<ERVisit>
     */
    @PutMapping("/{visitNo}/discharge")
    public Result<ERVisit> discharge(@PathVariable String visitNo,
                                      @RequestBody Map<String, Object> body) {
        return Result.ok(erWorkstationService.discharge(visitNo,
                String.valueOf(body.get("outcome"))));
    }
}
