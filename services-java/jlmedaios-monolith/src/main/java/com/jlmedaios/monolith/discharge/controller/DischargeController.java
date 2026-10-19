/*
 * 健澜科技 jlmedaios - 出院结算 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.discharge.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.discharge.entity.DischargeOrder;
import com.jlmedaios.monolith.discharge.service.DischargeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 出院结算 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/discharge")
public class DischargeController {

    private final DischargeService dischargeService;

    /**
     * 出院申请。
     *
     * @param body {visitId}
     * @return Result<DischargeOrder>
     */
    @PostMapping("/apply")
    public Result<DischargeOrder> apply(@RequestBody Map<String, Object> body) {
        Long visitId = Long.valueOf(String.valueOf(body.get("visitId")));
        return Result.ok(dischargeService.apply(visitId));
    }

    /**
     * 出院结算。
     *
     * @param body {visitId}
     * @return Result<DischargeOrder>
     */
    @PostMapping("/settle")
    public Result<DischargeOrder> settle(@RequestBody Map<String, Object> body) {
        Long visitId = Long.valueOf(String.valueOf(body.get("visitId")));
        return dischargeService.settle(visitId)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "出院医嘱不存在"));
    }
}
