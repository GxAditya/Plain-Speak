/**
 * Notification System
 * Minimal toast notifications following PlainSpeak design system
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationProps {
  notifications: NotificationData[];
  onDismiss: (id: string) => void;
}

export function Notification({ notifications, onDismiss }: NotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!notification.persistent && notification.duration !== 0) {
      const duration = notification.duration || 4000;
      const timer = setTimeout(() => handleDismiss(), duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.persistent]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onDismiss(notification.id), 150);
  };

  const typeStyles = {
    success: 'bg-white border-emerald-200',
    error: 'bg-white border-red-200',
    warning: 'bg-white border-amber-200',
    info: 'bg-white border-bolt-gray-200'
  };

  const iconStyles = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-bolt-blue-500'
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const Icon = icons[notification.type];

  return (
    <div 
      className={`
        relative p-3 rounded-md border shadow-sm transition-all duration-150
        ${typeStyles[notification.type]}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}
      `}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconStyles[notification.type]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-bolt-gray-900">{notification.title}</p>
          {notification.message && (
            <p className="text-xs text-bolt-gray-500 mt-0.5">{notification.message}</p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-0.5 rounded hover:bg-bolt-gray-100 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-bolt-gray-400" />
        </button>
      </div>
    </div>
  );
}