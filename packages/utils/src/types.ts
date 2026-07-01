// Shared domain types used by both the API and the web app.

export interface User {
  id: string;
  email: string;
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}
