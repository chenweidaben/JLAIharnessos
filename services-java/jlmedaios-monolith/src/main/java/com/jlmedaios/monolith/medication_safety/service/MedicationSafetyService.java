/*
 * 健澜科技 jlmedaios - 用药安全 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medication_safety.service;

import com.jlmedaios.monolith.medication_safety.entity.MedicationAlert;
import com.jlmedaios.monolith.medication_safety.repository.MedicationAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 用药安全 Service。
 *
 * <p>append-only: 用药安全预警不可修改；与 drug_interaction 模块互补，本模块侧重实时预警</p>
 */
@Service
@RequiredArgsConstructor
public class MedicationSafetyService {

    private final MedicationAlertRepository medicationAlertRepository;

    /**
     * 用药安全预警列表。
     *
     * @return 用药安全预警列表
     */
    public List<MedicationAlert> alertList() {
        return medicationAlertRepository.findAll();
    }

    /**
     * 用药安全检查（mock 返回触发预警）。
     *
     * @param patientId 患者 ID
     * @param medications 用药列表
     * @return 触发的用药安全预警列表
     */
    public List<MedicationAlert> check(Long patientId, String medications) {
        return medicationAlertRepository.findByStatus("PENDING");
    }

    /**
     * 确认预警。
     *
     * @param alertCode 预警编码
     * @return 已确认的用药安全预警
     */
    public MedicationAlert acknowledge(String alertCode) {
        List<MedicationAlert> alerts = medicationAlertRepository.findAll();
        for (MedicationAlert alert : alerts) {
            if (alertCode.equals(alert.getAlertCode())) {
                alert.setStatus("ACKNOWLEDGED");
                return medicationAlertRepository.save(alert);
            }
        }
        return null;
    }
}
