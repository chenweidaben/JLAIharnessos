/*
 * 健澜科技 jlmedaios - 护理执行 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.nursing.controller;

import com.jlmedaios.his.nursing.common.Result;
import com.jlmedaios.his.nursing.entity.NursingOrder;
import com.jlmedaios.his.nursing.service.NursingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 护理执行 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/his/nursing")
public class NursingController {

    private final NursingService nursingService;

    /**
     * 开立护理医嘱。
     *
     * @param body {patientId, nursingType, content}
     * @return Result<NursingOrder>
     */
    @PostMapping("/orders")
    public Result<NursingOrder> create(@RequestBody Map<String, Object> body) {
        Long patientId = Long.valueOf(String.valueOf(body.get("patientId")));
        String nursingType = String.valueOf(body.get("nursingType"));
        String content = String.valueOf(body.get("content"));
        return Result.ok(nursingService.create(patientId, nursingType, content));
    }

    /**
     * 按患者 ID 查询护理医嘱列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<NursingOrder>>
     */
    @GetMapping("/orders/patient/{patientId}")
    public Result<List<NursingOrder>> getByPatientId(@PathVariable Long patientId) {
        return Result.ok(nursingService.getByPatientId(patientId));
    }

    /**
     * 执行护理医嘱。
     *
     * @param id   护理医嘱 ID
     * @param body {nurseName}
     * @return Result<NursingOrder>
     */
    @PutMapping("/orders/{id}/execute")
    public Result<NursingOrder> execute(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String nurseName = body.get("nurseName");
        return nursingService.execute(id, nurseName)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "护理医嘱不存在"));
    }
}
