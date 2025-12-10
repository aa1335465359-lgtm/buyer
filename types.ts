
export enum Priority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4'
}

export type TodoStatus = 'todo' | 'in_progress' | 'done';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TodoStatus; // Replaces isCompleted boolean logic
  isCompleted?: boolean; // Deprecated, kept for backward compat during migration if needed
  createdAt: number;
  completedAt?: number; // Timestamp when status became 'done'
  deadline?: number; // timestamp in ms
  notificationSent?: boolean;
  
  // Specific fields for Buyers
  shopId?: string;      // 店铺ID
  quantity?: string;    // 多少个
  actionTime?: string;  // 什么时候 (text description)

  // AI Processing State
  aiStatus?: 'idle' | 'processing' | 'done' | 'error'; 
}

export interface AITaskResponse {
  tasks: {
    title: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
    estimatedMinutes?: number;
    shopId?: string;
    quantity?: string;
    actionTime?: string;
  }[];
}

export interface WorkSummary {
  rangeLabel: string;
  stats: {
    total: number;
    completed: number;
    completionRate: string;
    overdue: number;
  };
  themes: {
    title: string;
    actions: string[];
  }[];
  suggestions: string[];
}
