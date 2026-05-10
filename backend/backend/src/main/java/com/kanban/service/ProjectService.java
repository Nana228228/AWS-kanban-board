package com.kanban.service;

import com.kanban.dto.request.ProjectCreateRequest;
import com.kanban.dto.response.BoardResponse;
import com.kanban.dto.response.ProjectResponse;
import com.kanban.exception.ResourceNotFoundException;
import com.kanban.exception.ValidationException;
import com.kanban.model.Board;
import com.kanban.model.Project;
import com.kanban.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectResponse create(ProjectCreateRequest request) {
        String trimmedName = validateAndTrimName(request.getName());

        Project project = new Project();
        project.setName(trimmedName);

        Project saved = projectRepository.save(project);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> findAll() {
        return projectRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponse findById(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Projeto", id));

        return mapToResponseWithBoards(project);
    }

    public ProjectResponse update(Long id, ProjectCreateRequest request) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Projeto", id));

        String trimmedName = validateAndTrimName(request.getName());
        project.setName(trimmedName);

        Project saved = projectRepository.save(project);
        return mapToResponse(saved);
    }

    public void delete(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Projeto", id));

        projectRepository.delete(project);
    }

    private String validateAndTrimName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new ValidationException("O nome do projeto é obrigatório");
        }
        String trimmed = name.trim();
        if (trimmed.length() > 100) {
            throw new ValidationException("O nome do projeto deve ter no máximo 100 caracteres");
        }
        return trimmed;
    }

    private ProjectResponse mapToResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private ProjectResponse mapToResponseWithBoards(Project project) {
        List<BoardResponse> boardResponses = project.getBoards().stream()
                .map(this::mapBoardToResponse)
                .collect(Collectors.toList());

        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .boards(boardResponses)
                .build();
    }

    private BoardResponse mapBoardToResponse(Board board) {
        return BoardResponse.builder()
                .id(board.getId())
                .projectId(board.getProject().getId())
                .title(board.getTitle())
                .startDate(board.getStartDate())
                .endDate(board.getEndDate())
                .durationDays(board.getDurationDays())
                .createdAt(board.getCreatedAt())
                .updatedAt(board.getUpdatedAt())
                .build();
    }
}
