// Response shapes returned by the Flask API (guideline FE-01). Keep in sync with backend schema.py files.

export type Role = "admin" | "member";

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};
export type UserBrief = { id: string; name: string };

export type Card = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  order: number;
  assignee: UserBrief | null;
  created_by: string | null;
  column_entered_at: string;
  created_at: string;
  updated_at: string;
};

export type Column = {
  id: string;
  board_id: string;
  name: string;
  order: number;
  is_done: boolean;
  cards: Card[];
};

export type Member = {
  user_id: string;
  name: string;
  email: string;
  role: Role;
};

export type BoardSummary = {
  id: string;
  name: string;
  owner_id: string;
  role: Role;
  member_count: number;
  created_at: string;
  updated_at: string;
};

export type BoardDetail = BoardSummary & {
  members: Member[];
  columns: Column[];
};

export type TaskCard = Card & {
  board: { id: string; name: string };
  column: { id: string; name: string };
};

export type Comment = {
  id: string;
  card_id: string;
  content: string;
  author: UserBrief;
  created_at: string;
  updated_at: string;
};

export type AppNotification = {
  id: string;
  type: "welcome" | "card_assigned" | "comment_added" | "member_added";
  message: string;
  card_id: string | null;
  board_id: string | null;
  read: boolean;
  created_at: string;
};

export type NotificationPage = {
  items: AppNotification[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
  unread_count: number;
};

export type LoginResult = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: User;
};

export type MoveResult = { card: Card; rebalanced: boolean };

export type Analytics = {
  board_id: string;
  week_start: string;
  cards_per_column: {
    column_id: string;
    name: string;
    order: number;
    card_count: number;
  }[];
  completed_this_week: number;
  member_activity: {
    user_id: string;
    name: string;
    role: Role;
    cards_assigned: number;
    cards_completed: number;
    comments_made: number;
  }[];
};
