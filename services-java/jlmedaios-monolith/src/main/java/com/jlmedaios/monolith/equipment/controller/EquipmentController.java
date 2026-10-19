/*
 * 健澜科技 jlmedaios - 医疗设备 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.equipment.entity.MedicalEquipment;
import com.jlmedaios.monolith.equipment.service.EquipmentService;
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
 * 医疗设备 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentService equipmentService;

    /**
     * 添加新设备。
     *
     * @param body {deviceCode, name, model, deptCode, purchaseDate, nextMaintenanceDate}
     * @return Result<MedicalEquipment>
     */
    @PostMapping("/add")
    public Result<MedicalEquipment> add(@RequestBody Map<String, Object> body) {
        MedicalEquipment equipment = equipmentService.add(
                String.valueOf(body.get("deviceCode")),
                String.valueOf(body.get("name")),
                String.valueOf(body.get("model")),
                String.valueOf(body.get("deptCode")),
                LocalDate.parse(String.valueOf(body.get("purchaseDate"))),
                LocalDate.parse(String.valueOf(body.get("nextMaintenanceDate")))
        );
        return Result.ok(equipment);
    }

    /**
     * 按科室查询设备。
     *
     * @param deptCode 科室编码
     * @return Result<List<MedicalEquipment>>
     */
    @GetMapping("/dept/{deptCode}")
    public Result<List<MedicalEquipment>> listByDept(@PathVariable String deptCode) {
        return Result.ok(equipmentService.listByDept(deptCode));
    }

    /**
     * 设备保养。
     *
     * @param id 设备 ID
     * @return Result<MedicalEquipment>
     */
    @PutMapping("/{id}/maintenance")
    public Result<MedicalEquipment> maintenance(@PathVariable Long id) {
        return equipmentService.maintenance(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 待保养设备列表。
     *
     * @return Result<List<MedicalEquipment>>
     */
    @GetMapping("/maintenance-due")
    public Result<List<MedicalEquipment>> maintenanceDue() {
        return Result.ok(equipmentService.maintenanceDue());
    }
}
