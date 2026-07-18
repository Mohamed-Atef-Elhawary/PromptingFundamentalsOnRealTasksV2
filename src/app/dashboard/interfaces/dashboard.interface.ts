export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

export interface Alert {
  id: number;
  message: string;
}

export interface SaveResponse {
  success: boolean;
  message: string;
}
