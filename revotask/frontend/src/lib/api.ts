import { apiRequest } from "./apiClient";
import type {
  Analytics,
  BoardDetail,
  BoardSummary,
  Card,
  Column,
  Comment,
  LoginResult,
  Member,
  MoveResult,
  NotificationPage,
  AppNotification,
  Role,
  TaskCard,
  User,
} from "@/types";

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export type Api = ReturnType<typeof createApi>;

/** Typed endpoint methods bound to a token. Used by Server and Client Components alike (FE-02). */
export function createApi(token?: string | null) {
  const call = <T>(path: string, init?: RequestInit) => apiRequest<T>(path, init, token);

  return {
    auth: {
      register: (body: { name: string; email: string; password: string }) =>
        call<{ user: User }>("/auth/register", json("POST", body)),
      login: (body: { email: string; password: string }) => call<LoginResult>("/auth/login", json("POST", body)),
    },
    users: {
      me: () => call<User>("/users/me"),
      updateMe: (body: { name?: string; email?: string }) => call<User>("/users/me", json("PATCH", body)),
    },
    boards: {
      list: () => call<BoardSummary[]>("/boards"),
      get: (id: string) => call<BoardDetail>(`/boards/${id}`),
      create: (name: string) => call<BoardSummary>("/boards", json("POST", { name })),
      rename: (id: string, name: string) => call<BoardSummary>(`/boards/${id}`, json("PATCH", { name })),
      remove: (id: string) => call<{ id: string }>(`/boards/${id}`, json("DELETE")),
      addMember: (id: string, body: { email: string; role: Role }) =>
        call<Member>(`/boards/${id}/members`, json("POST", body)),
      setMemberRole: (id: string, userId: string, role: Role) =>
        call<Member>(`/boards/${id}/members/${userId}`, json("PATCH", { role })),
      removeMember: (id: string, userId: string) =>
        call<{ id: string }>(`/boards/${id}/members/${userId}`, json("DELETE")),
      analytics: (id: string) => call<Analytics>(`/boards/${id}/analytics`),
    },
    columns: {
      create: (boardId: string, body: { name: string; is_done?: boolean }) =>
        call<Column>(`/boards/${boardId}/columns`, json("POST", body)),
      update: (id: string, body: { name?: string; is_done?: boolean }) =>
        call<Column>(`/columns/${id}`, json("PATCH", body)),
      remove: (id: string) => call<{ id: string }>(`/columns/${id}`, json("DELETE")),
      reorder: (boardId: string, items: { id: string; order: number }[]) =>
        call<Column[]>(`/boards/${boardId}/columns/reorder`, json("PATCH", { items })),
    },
    cards: {
      create: (columnId: string, body: { title: string; description?: string; assignee_id?: string | null }) =>
        call<Card>(`/columns/${columnId}/cards`, json("POST", body)),
      update: (id: string, body: { title?: string; description?: string | null; assignee_id?: string | null }) =>
        call<Card>(`/cards/${id}`, json("PATCH", body)),
      remove: (id: string) => call<{ id: string }>(`/cards/${id}`, json("DELETE")),
      move: (id: string, body: { column_id: string; order: number }) =>
        call<MoveResult>(`/cards/${id}/position`, json("PATCH", body)),
      list: (params: { assignee?: "me"; q?: string; board_id?: string; limit?: number }) => {
        const query = new URLSearchParams(
          Object.entries(params).filter(([, value]) => value !== undefined && value !== "") as [string, string][],
        );
        return call<TaskCard[]>(`/cards?${query.toString()}`);
      },
    },
    comments: {
      list: (cardId: string) => call<Comment[]>(`/cards/${cardId}/comments`),
      create: (cardId: string, content: string) =>
        call<Comment>(`/cards/${cardId}/comments`, json("POST", { content })),
      update: (id: string, content: string) => call<Comment>(`/comments/${id}`, json("PATCH", { content })),
      remove: (id: string) => call<{ id: string }>(`/comments/${id}`, json("DELETE")),
    },
    notifications: {
      list: (page = 1, perPage = 20) => call<NotificationPage>(`/notifications?page=${page}&per_page=${perPage}`),
      markRead: (id: string) => call<AppNotification>(`/notifications/${id}/read`, json("PATCH")),
    },
  };
}
