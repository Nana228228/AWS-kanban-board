package com.kanban.service;

import com.kanban.dto.request.BoardCreateRequest;
import com.kanban.dto.response.BoardResponse;
import com.kanban.dto.response.CardResponse;
import com.kanban.dto.response.ColumnResponse;
import com.kanban.exception.DateOverlapException;
import com.kanban.exception.ResourceNotFoundException;
import com.kanban.exception.ValidationException;
import com.kanban.model.Board;
import com.kanban.model.Card;
import com.kanban.model.KanbanColumn;
import com.kanban.model.Project;
import com.kanban.repository.BoardRepository;
import com.kanban.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BoardService {

    private final BoardRepository boardRepository;
    private final ProjectRepository projectRepository;

    public BoardResponse create(Long projectId, BoardCreateRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projeto", projectId));

        String trimmedTitle = validateAndTrimTitle(request.getTitle());

        LocalDate startDate = request.getStartDate();
        int durationDays = request.getDurationDays();
        LocalDate endDate = startDate.plusDays(durationDays - 1);

        checkDateOverlap(projectId, startDate, endDate, null);

        Board board = new Board();
        board.setProject(project);
        board.setTitle(trimmedTitle);
        board.setStartDate(startDate);
        board.setEndDate(endDate);
        board.setDurationDays(durationDays);

        Board saved = boardRepository.save(board);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BoardResponse> findByProjectId(Long projectId) {
        projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Projeto", projectId));

        return boardRepository.findByProjectIdOrderByStartDateAsc(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BoardResponse findById(Long id) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quadro", id));

        return mapToResponseWithColumns(board);
    }

    public BoardResponse update(Long id, BoardCreateRequest request) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quadro", id));

        String trimmedTitle = validateAndTrimTitle(request.getTitle());

        LocalDate startDate = request.getStartDate();
        int durationDays = request.getDurationDays();
        LocalDate endDate = startDate.plusDays(durationDays - 1);

        checkDateOverlap(board.getProject().getId(), startDate, endDate, id);

        board.setTitle(trimmedTitle);
        board.setStartDate(startDate);
        board.setEndDate(endDate);
        board.setDurationDays(durationDays);

        Board saved = boardRepository.save(board);
        return mapToResponse(saved);
    }

    public void delete(Long id) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quadro", id));

        boardRepository.delete(board);
    }

    private String validateAndTrimTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new ValidationException("O título do quadro é obrigatório");
        }
        String trimmed = title.trim();
        if (trimmed.length() > 100) {
            throw new ValidationException("O título do quadro deve ter no máximo 100 caracteres");
        }
        return trimmed;
    }

    private void checkDateOverlap(Long projectId, LocalDate startDate, LocalDate endDate, Long excludeId) {
        List<Board> overlapping;
        if (excludeId != null) {
            overlapping = boardRepository.findOverlappingBoards(projectId, startDate, endDate, excludeId);
        } else {
            overlapping = boardRepository.findOverlappingBoards(projectId, startDate, endDate);
        }
        if (!overlapping.isEmpty()) {
            throw new DateOverlapException("As datas se sobrepõem com o quadro: " + overlapping.get(0).getTitle());
        }
    }

    private BoardResponse mapToResponse(Board board) {
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

    private BoardResponse mapToResponseWithColumns(Board board) {
        List<ColumnResponse> columnResponses = board.getColumns().stream()
                .map(this::mapColumnToResponse)
                .collect(Collectors.toList());

        return BoardResponse.builder()
                .id(board.getId())
                .projectId(board.getProject().getId())
                .title(board.getTitle())
                .startDate(board.getStartDate())
                .endDate(board.getEndDate())
                .durationDays(board.getDurationDays())
                .createdAt(board.getCreatedAt())
                .updatedAt(board.getUpdatedAt())
                .columns(columnResponses)
                .build();
    }

    private ColumnResponse mapColumnToResponse(KanbanColumn column) {
        List<CardResponse> cardResponses = column.getCards().stream()
                .map(this::mapCardToResponse)
                .collect(Collectors.toList());

        return ColumnResponse.builder()
                .id(column.getId())
                .boardId(column.getBoard().getId())
                .title(column.getTitle())
                .position(column.getPosition())
                .isDoneColumn(column.isDoneColumn())
                .createdAt(column.getCreatedAt())
                .updatedAt(column.getUpdatedAt())
                .cards(cardResponses)
                .build();
    }

    private CardResponse mapCardToResponse(Card card) {
        return CardResponse.builder()
                .id(card.getId())
                .columnId(card.getColumn().getId())
                .title(card.getTitle())
                .description(card.getDescription())
                .storyPoints(card.getStoryPoints())
                .position(card.getPosition())
                .completedAt(card.getCompletedAt())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}
