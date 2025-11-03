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
  const message = (() => {
    if (err instanceof Error) return err.message
    if (typeof err === 'string') return err
    try {
      const maybe = JSON.stringify(err)
      return maybe.length > 2 ? maybe : fallbackMessage
    } catch {
      return fallbackMessage
    }
  })()

  return toast.error(message)
}

export const Toast = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  promise: showPromise,
  apiError: showApiError,
}