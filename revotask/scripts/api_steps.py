"""One ordered request sequence covering every blueprint. Source for the Postman collection and api_smoke.py.

Each step: folder (blueprint), name, method, path, optional body, expected status, and `save` (variable name ->
dotted path into the response JSON). `{var}` placeholders are filled from saved variables.
"""

from __future__ import annotations

PASSWORD = "Passw0rd1"

STEPS: list[dict] = [
    {"folder": "health", "name": "Health check", "method": "GET", "path": "/health", "status": 200, "auth": False},
    {"folder": "auth", "name": "Register", "method": "POST", "path": "/auth/register", "auth": False, "status": 201,
     "body": {"name": "Postman User", "email": "{email}", "password": PASSWORD}},
    {"folder": "auth", "name": "Login", "method": "POST", "path": "/auth/login", "auth": False, "status": 200,
     "body": {"email": "{email}", "password": PASSWORD}, "save": {"token": "data.access_token", "userId": "data.user.id"}},
    {"folder": "users", "name": "Get my profile", "method": "GET", "path": "/users/me", "status": 200},
    {"folder": "users", "name": "Update my profile", "method": "PATCH", "path": "/users/me", "status": 200, "body": {"name": "Postman Renamed"}},
    {"folder": "boards", "name": "Create board", "method": "POST", "path": "/boards", "status": 201, "body": {"name": "Postman Board"}, "save": {"boardId": "data.id"}},
    {"folder": "boards", "name": "List boards", "method": "GET", "path": "/boards", "status": 200},
    {"folder": "boards", "name": "Rename board", "method": "PATCH", "path": "/boards/{boardId}", "status": 200, "body": {"name": "Postman Board v2"}},
    {"folder": "columns", "name": "Add column (To Do)", "method": "POST", "path": "/boards/{boardId}/columns", "status": 201, "body": {"name": "To Do"}, "save": {"columnId": "data.id"}},
    {"folder": "columns", "name": "Add column (Done)", "method": "POST", "path": "/boards/{boardId}/columns", "status": 201, "body": {"name": "Done", "is_done": True}, "save": {"doneColumnId": "data.id"}},
    {"folder": "columns", "name": "Rename column", "method": "PATCH", "path": "/columns/{columnId}", "status": 200, "body": {"name": "Backlog"}},
    {"folder": "columns", "name": "Reorder columns", "method": "PATCH", "path": "/boards/{boardId}/columns/reorder", "status": 200, "body": {"items": [{"id": "{doneColumnId}", "order": 512.5}]}},
    {"folder": "cards", "name": "Create card", "method": "POST", "path": "/columns/{columnId}/cards", "status": 201, "body": {"title": "Write specs", "assignee_id": "{userId}"}, "save": {"cardId": "data.id"}},
    {"folder": "cards", "name": "My tasks (assignee=me)", "method": "GET", "path": "/cards?assignee=me", "status": 200},
    {"folder": "cards", "name": "Search cards", "method": "GET", "path": "/cards?q=specs&board_id={boardId}", "status": 200},
    {"folder": "cards", "name": "Update card", "method": "PATCH", "path": "/cards/{cardId}", "status": 200, "body": {"description": "Requirements, design, tasks"}},
    {"folder": "cards", "name": "Move card", "method": "PATCH", "path": "/cards/{cardId}/position", "status": 200, "body": {"column_id": "{doneColumnId}", "order": 1024.0}},
    {"folder": "boards", "name": "Get board with columns and cards", "method": "GET", "path": "/boards/{boardId}", "status": 200},
    {"folder": "comments", "name": "Add comment", "method": "POST", "path": "/cards/{cardId}/comments", "status": 201, "body": {"content": "First comment"}, "save": {"commentId": "data.id"}},
    {"folder": "comments", "name": "Add comment without content (400)", "method": "POST", "path": "/cards/{cardId}/comments", "status": 400, "body": {}},
    {"folder": "comments", "name": "Add comment without token (401)", "method": "POST", "path": "/cards/{cardId}/comments", "status": 401, "body": {"content": "x"}, "auth": False},
    {"folder": "comments", "name": "List comments", "method": "GET", "path": "/cards/{cardId}/comments", "status": 200},
    {"folder": "comments", "name": "Edit comment", "method": "PATCH", "path": "/comments/{commentId}", "status": 200, "body": {"content": "Edited comment"}},
    {"folder": "notifications", "name": "List notifications (page, per_page)", "method": "GET", "path": "/notifications?page=1&per_page=20", "status": 200, "save": {"notificationId": "data.items.0.id"}},
    {"folder": "notifications", "name": "Mark notification read", "method": "PATCH", "path": "/notifications/{notificationId}/read", "status": 200},
    {"folder": "analytics", "name": "Board analytics", "method": "GET", "path": "/boards/{boardId}/analytics", "status": 200},
    {"folder": "comments", "name": "Delete comment", "method": "DELETE", "path": "/comments/{commentId}", "status": 200},
    {"folder": "cards", "name": "Delete card", "method": "DELETE", "path": "/cards/{cardId}", "status": 200},
    {"folder": "columns", "name": "Delete column", "method": "DELETE", "path": "/columns/{columnId}", "status": 200},
    {"folder": "boards", "name": "Delete board", "method": "DELETE", "path": "/boards/{boardId}", "status": 200},
]

BLUEPRINT_FOLDERS = ["auth", "boards", "columns", "cards", "comments", "notifications", "analytics", "users"]
