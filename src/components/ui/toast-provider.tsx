'use client';

/**
 * Toast notification system using Flowbite React Toast
 * Provides a context-based API for showing success, error, warning, and info toasts
 */

import { Toast } from "flowbite-react";
import { FiCheckCircle } from "react-icons/fi";
import { LuTriangleAlert } from "react-icons/lu";
import { AiOutlineCloseCircle, AiOutlineClose } from "react-icons/ai";
import { HiOutlineInformationCircle } from "react-icons/hi";
import React, { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (
    type: ToastType,
    title: string,
    message?: string,
    duration?: number
  ) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      type: ToastType,
      title: string,
      message?: string,
      duration = 5000
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast("success", title, message, duration);
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast("error", title, message, duration);
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast("warning", title, message, duration);
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast("info", title, message, duration);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}) {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <FiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case "error":
        return <AiOutlineCloseCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case "warning":
        return <LuTriangleAlert className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      case "info":
        return <HiOutlineInformationCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "warning":
        return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <Toast className={`${getBgColor()} border`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">{getIcon()}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {toast.title}
          </div>
          {toast.message && (
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {toast.message}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          className="ml-2 shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label="Close"
        >
          <AiOutlineClose className="h-4 w-4" />
        </button>
      </div>
    </Toast>
  );
}
