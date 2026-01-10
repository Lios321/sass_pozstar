"use client"

import { toast } from 'sonner'

export type ToastOptions = {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export const showSuccess = (message: string, options?: ToastOptions) => {
  return toast.success(message, options)
}

export const showError = (message: string, options?: ToastOptions) => {
  return toast.error(message, options)
}

export const showInfo = (message: string, options?: ToastOptions) => {
  return toast.message(message, options)
}

export const showWarning = (message: string, options?: ToastOptions) => {
  return toast.warning(message, options)
}

export function showPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string }
) {
  return toast.promise(promise, messages)
}

export function showApiError(err: unknown, fallbackMessage = 'Ocorreu um erro inesperado') {
  if (process.env.NODE_ENV !== 'production') {
    // Log técnico apenas em desenvolvimento
    // eslint-disable-next-line no-console
    console.error('API error:', err)
  }
  return toast.error(fallbackMessage)
}

export const Toast = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  promise: showPromise,
  apiError: showApiError,
}
