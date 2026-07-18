// interfaces/dashboard-interface.ts

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

export interface UserDetail extends User {
  address: {
    street: string;
    city: string;
  };
  phone: string;
  company: {
    name: string;
  };
}

export interface Post {
  id?: number;
  userId: number;
  title: string;
  body: string;
}

export interface AlertItem {
  id: number;
  message: string;
  status: 'pending' | 'read';
}
