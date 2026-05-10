package com.kanban.service;

import com.kanban.dto.request.ColumnCreateRequest;
import com.kanban.dto.request.ReorderRequest;
import com.kanban.dto.response.ColumnResponse;
import com.kanban.exception.ResourceNotFoundException;
import com.kanban.exception.ValidationException;
import com.kanban.model.Board;
import com.kanban.model.KanbanColumn;
import com.kanban.repository.BoardRepository;
import com.kanban.repository.ColumnRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ColumnService {

    private final ColumnRepository columnRepository;
    private final BoardRepository boardRepository;

    public ColumnResponse create(Long boardId, ColumnCreateRequest request) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Quadro", boardId));

        String trimmedTitle = validateAndTrimTitle(request.getTitle());

        int nextPosition = columnRepository.findByBoardIdOrderByPositionAsc(boardId).size();

        KanbanColumn column = new KanbanColumn();
        column.setBoard(board);
        column.setTitle(trimmedTitle);
        column.setPosition(nextPosition);
        column.setDoneColumn(false);

        KanbanColumn saved = columnRepository.save(column);
        return mapToResponse(saved);
    }

    public ColumnResponse updateTitle(Long id, ColumnCreateRequest request) {
        KanbanColumn column = columnRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coluna", id));

        String trimmedTitle = validateAndTrimTitle(request.getTitle());

        column.setTitle(trimmedTitle);
        KanbanColumn saved = columnRepository.save(column);
        return mapToResponse(saved);
    }

    public List<ColumnResponse> reorder(Long boardId, ReorderRequest request) {
        boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Quadro", boardId));

        List<Long> orderedIds = request.getOrderedIds();

        for (int i = 0; i < orderedIds.size(); i++) {
            Long columnId = orderedIds.get(i);
            KanbanColumn column = columnRepository.findById(columnId)
                    .orElseThrow(() -> new ResourceNotFoundException("Coluna", columnId));
            column.setPosition(i);
            columnRepository.save(column);
        }

        return columnRepository.findByBoardIdOrderByPositionAsc(boardId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void delete(Long id) {
        KanbanColumn column = columnRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coluna", id));

        columnRepository.delete(column);
    }

    public ColumnResponse markAsDoneColumn(Long id) {
        KanbanColumn column = columnRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coluna", id));

        List<KanbanColumn> allColumns = columnRepository.findByBoardIdOrderByPositionAsc(
                column.getBoard().getId());

        for (KanbanColumn col : allColumns) {
            if (col.isDoneColumn()) {
                col.setDoneColumn(false);
                columnRepository.save(col);
            }
        }

        column.setDoneColumn(true);
        KanbanColumn saved = columnRepository.save(column);
        return mapToResponse(saved);
    }

    private String validateAndTrimTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new ValidationException("O título da coluna é obrigatório");
        }
        String trimmed = title.trim();
        if (trimmed.length() > 100) {
            throw new ValidationException("O título da coluna deve ter no máximo 100 caracteres");
        }
        return trimmed;
    }

    private ColumnResponse mapToResponse(KanbanColumn column) {
        return ColumnResponse.builder()
                .id(column.getId())
                .boardId(column.getBoard().getId())
                .title(column.getTitle())
                .position(column.getPosition())
                .isDoneColumn(column.isDoneColumn())
                .createdAt(column.getCreatedAt())
                .updatedAt(column.getUpdatedAt())
                .build();
    }
}
