import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { ApiError } from '../utils/errors'

/**
 * Cria resposta JSON padronizada com sucesso
 * @param data Dados a serem retornados
 * @param status Código HTTP (default 200)
 */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data as unknown, { status })
}

/**
 * Cria resposta JSON de erro padronizada
 * @param error Erro ApiError contendo status e metadados
 */
export function fail(error: ApiError) {
  logger.warn('API error', { code: error.code, message: error.message, status: error.status })
  return NextResponse.json({ error: error.code, message: error.message, details: error.details }, { status: error.status })
}
