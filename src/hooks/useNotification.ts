/**
 * Notification Hook
 * Manages global notification state and provides functions to show notifications
 */

import { useState, useCallback } from 'react';
import { NotificationData } from '../components/Notification';

interface UseNotificationReturn {
  notifications: NotificationData[];
  showNotification: (notification: Omit<NotificationData, 'id'>) => void;
  showSuccess: (title: string, message?: string, options?: Partial<NotificationData>) => void;
  showError: (title: string, message?: string, options?: Partial<NotificationData>) => void;
  showWarning: (title: string, message?: string, options?: Partial<NotificationData>) => void;
  showInfo: (title: string, message?: string, options?: Partial<NotificationData>) => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export function useNotification(): UseNotificationReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const showNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = generateId();
    const newNotification: NotificationData = {
      id,
      duration: 5000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after max duration to prevent memory leaks
    if (!newNotification.persistent) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, (newNotification.duration || 5000) + 1000);
    }
  }, []);

  const showSuccess = useCallback((title: string, message?: string, options?: Partial<NotificationData>) => {
    showNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string, options?: Partial<NotificationData>) => {
    showNotification({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer duration for errors
      ...options
    });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<NotificationData>) => {
    showNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
      ...options
    });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<NotificationData>) => {
    showNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [showNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissNotification,
    clearAll
  };
}