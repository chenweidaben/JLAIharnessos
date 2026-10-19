/*
 * 健澜科技 jlmedaios - 科研数据 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.research_data.service;

import com.jlmedaios.monolith.research_data.entity.ResearchDataExport;
import com.jlmedaios.monolith.research_data.entity.ResearchDataset;
import com.jlmedaios.monolith.research_data.entity.ResearchProject;
import com.jlmedaios.monolith.research_data.repository.ResearchDataExportRepository;
import com.jlmedaios.monolith.research_data.repository.ResearchDatasetRepository;
import com.jlmedaios.monolith.research_data.repository.ResearchProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 科研数据 Service。
 *
 * <p>科研数据需脱敏视图+伦理审批，禁止直连生产 PHI 库</p>
 */
@Service
@RequiredArgsConstructor
public class ResearchDataService {

    private final ResearchProjectRepository researchProjectRepository;
    private final ResearchDataExportRepository researchDataExportRepository;
    private final ResearchDatasetRepository researchDatasetRepository;

    /**
     * 创建科研项目。
     *
     * @param projectCode        项目编码
     * @param projectName        项目名称
     * @param principalInvestigator 负责人
     * @param startDate          开始日期
     * @param endDate            结束日期
     * @param ethicsApprovalNo 伦理批件号
     * @return 已持久化的科研项目
     */
    public ResearchProject createProject(String projectCode, String projectName,
                                        String principalInvestigator, LocalDate startDate,
                                        LocalDate endDate, String ethicsApprovalNo) {
        ResearchProject project = ResearchProject.builder()
                .projectCode(projectCode)
                .projectName(projectName)
                .principalInvestigator(principalInvestigator)
                .startDate(startDate)
                .endDate(endDate)
                .ethicsApprovalNo(ethicsApprovalNo)
                .build();
        return researchProjectRepository.save(project);
    }

    /**
     * 科研数据申请（脱敏视图）。
     *
     * @param projectId       项目 ID
     * @param patientCount    患者数
     * @param fieldsIncluded  包含字段（逗号分隔）
     * @param purpose         用途
     * @param approvedBy      审批人
     * @return 已持久化的导出记录
     */
    public ResearchDataExport requestData(Long projectId, int patientCount,
                                         String fieldsIncluded, String purpose,
                                         String approvedBy) {
        // 科研数据必须脱敏，禁止导出直接 PHI
        ResearchDataExport export = ResearchDataExport.builder()
                .projectId(projectId)
                .patientCount(patientCount)
                .exportDate(LocalDate.now())
                .fieldsIncluded(fieldsIncluded)
                .purpose(purpose)
                .approvedBy(approvedBy)
                .build();
        return researchDataExportRepository.save(export);
    }

    /**
     * 项目数据汇总（mock）。
     *
     * @param projectCode 项目编码
     * @return 汇总数据
     */
    public Map<String, Object> projectDataSummary(String projectCode) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("patientCount", 120);
        summary.put("fields", List.of("age", "gender", "diagnosis", "labs"));
        summary.put("ethicsApproved", true);
        return summary;
    }

    /**
     * 全部项目列表。
     *
     * @return 项目列表
     */
    public List<ResearchProject> allProjects() {
        return researchProjectRepository.findAll();
    }

    /**
     * 项目数据集列表。
     *
     * @param projectCode 项目编码
     * @return 数据集列表
     */
    public List<ResearchDataset> projectDatasets(String projectCode) {
        return researchDatasetRepository.findByProjectCode(projectCode);
    }
}
