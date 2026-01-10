"use client"

import { Toast } from './toast'

export async function fetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) {
    let message = 'Erro na solicitação'
    try {
      const data = await res.json()
      message = data?.error || data?.message || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  try {
    return await res.json()
  } catch {
    // Some endpoints may return no body on success
    return undefined as T
  }
}

export async function crudFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  successMessage?: string
): Promise<T> {
  try {
    const data = await fetchJson<T>(input, init)
    if (successMessage) {
      Toast.success(successMessage)
    }
    return data
  } catch (err) {
    Toast.apiError(err)
    throw err
  }
}