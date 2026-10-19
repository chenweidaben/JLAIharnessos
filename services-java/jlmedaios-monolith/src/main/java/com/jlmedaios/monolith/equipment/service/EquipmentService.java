/*
 * 健澜科技 jlmedaios - 医疗设备 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment.service;

import com.jlmedaios.monolith.equipment.entity.MedicalEquipment;
import com.jlmedaios.monolith.equipment.repository.MedicalEquipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 医疗设备 Service。
 *
 * <p>append-only: 设备档案不可修改，维修留痕</p>
 */
@Service
@RequiredArgsConstructor
public class EquipmentService {

    private final MedicalEquipmentRepository medicalEquipmentRepository;

    /**
     * 添加新设备。
     *
     * @param deviceCode           设备编码
     * @param name                 设备名称
     * @param model                型号
     * @param deptCode             科室编码
     * @param purchaseDate         采购日期
     * @param nextMaintenanceDate  下次保养日期
     * @return 已持久化的设备
     */
    public MedicalEquipment add(String deviceCode, String name, String model,
                                 String deptCode, LocalDate purchaseDate,
                                 LocalDate nextMaintenanceDate) {
        MedicalEquipment equipment = MedicalEquipment.builder()
                .deviceCode(deviceCode)
                .name(name)
                .model(model)
                .deptCode(deptCode)
                .purchaseDate(purchaseDate)
                .nextMaintenanceDate(nextMaintenanceDate)
                .build();
        return medicalEquipmentRepository.save(equipment);
    }

    /**
     * 按科室查询设备。
     *
     * @param deptCode 科室编码
     * @return 设备列表
     */
    public List<MedicalEquipment> listByDept(String deptCode) {
        return medicalEquipmentRepository.findByDeptCode(deptCode);
    }

    /**
     * 设备保养（设 status=MAINTENANCE）。
     *
     * @param id 设备 ID
     * @return 已更新的设备
     */
    public Optional<MedicalEquipment> maintenance(Long id) {
        Optional<MedicalEquipment> opt = medicalEquipmentRepository.findById(id);
        if (opt.isPresent()) {
            MedicalEquipment equipment = opt.get();
            equipment.setStatus("MAINTENANCE");
            equipment.setUpdatedAt(LocalDateTime.now());
            medicalEquipmentRepository.save(equipment);
        }
        return opt;
    }

    /**
     * 待保养设备列表。
     *
     * @return 待保养设备列表
     */
    public List<MedicalEquipment> maintenanceDue() {
        return medicalEquipmentRepository.findByNextMaintenanceDateBefore(LocalDate.now().plusDays(7));
    }
}
