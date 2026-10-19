/*
 * 健澜科技 jlmedaios - 患者教育 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_education.service;

import com.jlmedaios.monolith.patient_education.entity.EducationDelivery;
import com.jlmedaios.monolith.patient_education.entity.EducationMaterial;
import com.jlmedaios.monolith.patient_education.repository.EducationDeliveryRepository;
import com.jlmedaios.monolith.patient_education.repository.EducationMaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 患者教育 Service。
 *
 * <p>教育材料主数据，推送记录 append-only</p>
 */
@Service
@RequiredArgsConstructor
public class PatientEducationService {

    private final EducationMaterialRepository educationMaterialRepository;
    private final EducationDeliveryRepository educationDeliveryRepository;

    /**
     * 教育材料列表。
     *
     * @return 教育材料列表
     */
    public List<EducationMaterial> materials() {
        return educationMaterialRepository.findAll();
    }

    /**
     * 推送教育材料。
     *
     * @param materialCode 材料编码
     * @param patientId    患者 ID
     * @param encounterId  就诊 ID
     * @return 已持久化的推送记录
     */
    public EducationDelivery deliver(String materialCode, Long patientId, Long encounterId) {
        EducationDelivery delivery = EducationDelivery.builder()
                .materialCode(materialCode)
                .patientId(patientId)
                .encounterId(encounterId)
                .build();
        return educationDeliveryRepository.save(delivery);
    }

    /**
     * 患者已接收材料列表。
     *
     * @param patientId 患者 ID
     * @return 推送记录列表
     */
    public List<EducationDelivery> patientMaterials(Long patientId) {
        return educationDeliveryRepository.findByPatientId(patientId);
    }
}
