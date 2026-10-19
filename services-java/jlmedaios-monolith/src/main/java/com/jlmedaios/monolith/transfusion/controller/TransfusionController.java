/*
 * 健澜科技 jlmedaios - 输血 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.transfusion.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.transfusion.entity.TransfusionRecord;
import com.jlmedaios.monolith.transfusion.service.TransfusionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 输血 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/transfusion")
public class TransfusionController {

    private final TransfusionService transfusionService;

    /**
     * 申请输血。
     *
     * @param body {patientId, bloodType, componentType, volumeML, donorNumber}
     * @return Result<TransfusionRecord>
     */
    @PostMapping("/request")
    public Result<TransfusionRecord> request(@RequestBody Map<String, Object> body) {
        TransfusionRecord record = transfusionService.request(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("bloodType")),
                String.valueOf(body.get("componentType")),
                Integer.valueOf(String.valueOf(body.get("volumeML"))),
                String.valueOf(body.get("donorNumber"))
        );
        return Result.ok(record);
    }

    /**
     * 核对发血。
     *
     * @param body {id}
     * @return Result<TransfusionRecord>
     */
    @PostMapping("/verify")
    public Result<TransfusionRecord> verify(@RequestBody Map<String, Object> body) {
        Long id = Long.valueOf(String.valueOf(body.get("id")));
        return transfusionService.verify(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "输血记录不存在"));
    }

    /**
     * 输血反应记录。
     *
     * @param body {id, note}
     * @return Result<TransfusionRecord>
     */
    @PostMapping("/reaction")
    public Result<TransfusionRecord> reaction(@RequestBody Map<String, Object> body) {
        Long id = Long.valueOf(String.valueOf(body.get("id")));
        String note = String.valueOf(body.get("note"));
        return transfusionService.reaction(id, note)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "输血记录不存在"));
    }
}
