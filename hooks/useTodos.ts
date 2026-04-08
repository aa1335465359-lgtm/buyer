import { useCallback, useEffect, useRef, useState } from 'react';
import { Todo } from '../types';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('buyer_todos');
    const parsed = saved ? JSON.parse(saved) : [];

    return parsed
      .filter((t: any) => t.aiStatus !== 'processing')
      .map((t: any) => ({
        ...t,
        status: t.status || (t.isCompleted ? 'done' : 'todo'),
      }));
  });

  const [lastDeleted, setLastDeleted] = useState<Todo | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('buyer_todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        window.clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handleAddTodos = useCallback((newTodos: Todo[]) => {
    setTodos(prev => [...newTodos, ...prev]);
  }, []);

  const handleToggleTodo = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const newStatus = t.status === 'done' ? 'todo' : 'done';
        return {
          ...t,
          status: newStatus,
          isCompleted: newStatus === 'done',
          completedAt: newStatus === 'done' ? Date.now() : undefined,
        };
      }),
    );
  }, []);

  const handleUpdateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        if (updates.status !== undefined) {
          updated.isCompleted = updates.status === 'done';
          if (updates.status === 'done' && !updated.completedAt) updated.completedAt = Date.now();
          else if (updates.status !== 'done') updated.completedAt = undefined;
        }
        return updated;
      }),
    );
  }, []);

  const handleDeleteTodo = useCallback(
    (id: string) => {
      const todoToDelete = todos.find(t => t.id === id);

      if (todoToDelete) {
        setLastDeleted(todoToDelete);
        setShowUndo(true);
        if (undoTimeoutRef.current) {
          window.clearTimeout(undoTimeoutRef.current);
        }
        undoTimeoutRef.current = window.setTimeout(() => setShowUndo(false), 8000);
      }

      setTodos(prev => prev.filter(t => t.id !== id));
    },
    [todos],
  );

  const handleUndoDelete = useCallback(() => {
    if (lastDeleted) {
      setTodos(prev => [...prev, lastDeleted]);
      setShowUndo(false);
      setLastDeleted(null);
    }
  }, [lastDeleted]);

  return {
    todos,
    setTodos,
    showUndo,
    handleAddTodos,
    handleToggleTodo,
    handleUpdateTodo,
    handleDeleteTodo,
    handleUndoDelete,
  };
};
