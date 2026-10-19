/*
 * 健澜科技 jlmedaios - ICU 管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_management.service;

import com.jlmedaios.monolith.icu_management.entity.ICUMonitoring;
import com.jlmedaios.monolith.icu_management.entity.ICUPatient;
import com.jlmedaios.monolith.icu_management.repository.ICUMonitoringRepository;
import com.jlmedaios.monolith.icu_management.repository.ICUPatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ICU 管理 Service。
 *
 * <p>append-only: ICU 监测数据不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class ICUManagementService {

    private final ICUPatientRepository icuPatientRepository;
    private final ICUMonitoringRepository icuMonitoringRepository;

    /**
     * 转入 ICU。
     *
     * @param patientId    患者 ID
     * @param bedNo        床号
     * @param diagnosis     诊断
     * @param primaryNurse  责任护士
     * @return 已持久化的 ICU 患者
     */
    public ICUPatient admit(String patientId, String bedNo, String diagnosis, String primaryNurse) {
        ICUPatient patient = ICUPatient.builder()
                .patientId(patientId)
                .bedNo(bedNo)
                .diagnosis(diagnosis)
                .primaryNurse(primaryNurse)
                .build();
        return icuPatientRepository.save(patient);
    }

    /**
     * 转出 ICU（status=TRANSFERRED）。
     *
     * @param patientId 患者 ID
     * @return 已更新的 ICU 患者
     */
    public Optional<ICUPatient> discharge(Long patientId) {
        List<ICUPatient> patients = icuPatientRepository.findByPatientId(String.valueOf(patientId));
        if (!patients.isEmpty()) {
            ICUPatient patient = patients.get(0);
            patient.setStatus("TRANSFERRED");
            icuPatientRepository.save(patient);
            return Optional.of(patient);
        }
        return Optional.empty();
    }

    /**
     * 记录生命体征。
     *
     * @param patientId       患者 ID
     * @param heartRate       心率
     * @param bloodPressure   血压
     * @param respiratoryRate 呼吸频率
     * @param spo2            血氧
     * @param temperature     体温
     * @return 已持久化的监测数据
     */
    public ICUMonitoring monitor(String patientId, Integer heartRate, String bloodPressure,
                                   Integer respiratoryRate, Integer spo2, BigDecimal temperature) {
        ICUMonitoring monitoring = ICUMonitoring.builder()
                .patientId(patientId)
                .heartRate(heartRate)
                .bloodPressure(bloodPressure)
                .respiratoryRate(respiratoryRate)
                .spo2(spo2)
                .temperature(temperature)
                .build();
        return icuMonitoringRepository.save(monitoring);
    }

    /**
     * ICU 床位状态。
     *
     * @return 床位状态
     */
    public Map<String, Object> bedStatus() {
        long total = 20;
        long occupied = icuPatientRepository.findByStatus("IN_BED").size();
        Map<String, Object> result = new HashMap<>();
        result.put("total_beds", total);
        result.put("occupied", occupied);
        result.put("available", total - occupied);
        return result;
    }
}
