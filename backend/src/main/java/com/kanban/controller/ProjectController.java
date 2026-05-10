package com.kanban.controller;

import com.kanban.dto.request.ProjectCreateRequest;
import com.kanban.dto.response.ProjectResponse;
import com.kanban.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectResponse> create(@Valid @RequestBody ProjectCreateRequest request) {
        ProjectResponse response = projectService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> findAll() {
        return ResponseEntity.ok(projectService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> update(@PathVariable Long id, @Valid @RequestBody ProjectCreateRequest request) {
        return ResponseEntity.ok(projectService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.ok().build();
    }
}
