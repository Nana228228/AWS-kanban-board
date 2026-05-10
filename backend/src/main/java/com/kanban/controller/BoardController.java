package com.kanban.controller;

import com.kanban.dto.request.BoardCreateRequest;
import com.kanban.dto.response.BoardResponse;
import com.kanban.dto.response.BurndownDataResponse;
import com.kanban.service.BoardService;
import com.kanban.service.BurndownService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;
    private final BurndownService burndownService;

    @PostMapping("/projects/{projectId}/boards")
    public ResponseEntity<BoardResponse> create(@PathVariable Long projectId,
                                                @Valid @RequestBody BoardCreateRequest request) {
        BoardResponse response = boardService.create(projectId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/projects/{projectId}/boards")
    public ResponseEntity<List<BoardResponse>> findByProjectId(@PathVariable Long projectId) {
        return ResponseEntity.ok(boardService.findByProjectId(projectId));
    }

    @GetMapping("/boards/{id}")
    public ResponseEntity<BoardResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(boardService.findById(id));
    }

    @PutMapping("/boards/{id}")
    public ResponseEntity<BoardResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody BoardCreateRequest request) {
        return ResponseEntity.ok(boardService.update(id, request));
    }

    @DeleteMapping("/boards/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        boardService.delete(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/boards/{id}/burndown-data")
    public ResponseEntity<BurndownDataResponse> getBurndownData(@PathVariable Long id) {
        return ResponseEntity.ok(burndownService.getBurndownData(id));
    }
}
