/*
 * 健澜科技 jlmedaios - 科研数据 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.research_data.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.research_data.entity.ResearchDataExport;
import com.jlmedaios.monolith.research_data.entity.ResearchDataset;
import com.jlmedaios.monolith.research_data.entity.ResearchProject;
import com.jlmedaios.monolith.research_data.service.ResearchDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 科研数据 Controller。
 *
 * <p>科研数据必须脱敏，禁止导出直接 PHI</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/research")
public class ResearchDataController {

    private final ResearchDataService researchDataService;

    /**
     * 创建科研项目。
     *
     * @param body {projectCode, projectName, principalInvestigator, startDate, endDate, ethicsApprovalNo}
     * @return Result<ResearchProject>
     */
    @PostMapping("/project")
    public Result<ResearchProject> createProject(@RequestBody Map<String, Object> body) {
        ResearchProject project = researchDataService.createProject(
                String.valueOf(body.get("projectCode")),
                String.valueOf(body.get("projectName")),
                String.valueOf(body.get("principalInvestigator")),
                LocalDate.parse(String.valueOf(body.get("startDate"))),
                LocalDate.parse(String.valueOf(body.get("endDate"))),
                String.valueOf(body.get("ethicsApprovalNo"))
        );
        return Result.ok(project);
    }

    /**
     * 科研数据申请（脱敏视图）。
     *
     * @param body {projectId, patientCount, fieldsIncluded, purpose, approvedBy}
     * @return Result<ResearchDataExport>
     */
    @PostMapping("/data-request")
    public Result<ResearchDataExport> requestData(@RequestBody Map<String, Object> body) {
        ResearchDataExport export = researchDataService.requestData(
                Long.valueOf(String.valueOf(body.get("projectId"))),
                Integer.valueOf(String.valueOf(body.get("patientCount"))),
                String.valueOf(body.get("fieldsIncluded")),
                String.valueOf(body.get("purpose")),
                String.valueOf(body.get("approvedBy"))
        );
        return Result.ok(export);
    }

    /**
     * 项目数据汇总（mock）。
     *
     * @param projectCode 项目编码
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/project/{projectCode}/data")
    public Result<Map<String, Object>> projectDataSummary(@PathVariable String projectCode) {
        return Result.ok(researchDataService.projectDataSummary(projectCode));
    }

    /**
     * 全部项目列表。
     *
     * @return Result<List<ResearchProject>>
     */
    @GetMapping("/projects")
    public Result<List<ResearchProject>> allProjects() {
        return Result.ok(researchDataService.allProjects());
    }

    /**
     * 项目数据集列表。
     *
     * @param code 项目编码
     * @return Result<List<ResearchDataset>>
     */
    @GetMapping("/project/{code}/datasets")
    public Result<List<ResearchDataset>> projectDatasets(@PathVariable String code) {
        return Result.ok(researchDataService.projectDatasets(code));
    }
}
