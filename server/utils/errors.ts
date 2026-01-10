/**
 * Representa um erro de API com código HTTP e detalhes opcionais.
 * @param status Código HTTP a ser retornado
 * @param code Código de erro interno legível
 * @param message Mensagem de erro compreensível
 * @param details Dados adicionais para troubleshooting
 */
export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Cria um erro 400 de validação
 * @param message Mensagem de erro
 * @param details Detalhes (ex.: issues do Zod)
 */
export function validationError(message: string, details?: unknown) {
  return new ApiError(400, 'validation_error', message, details)
}

/**
 * Cria um erro 401 de autenticação
 * @param message Mensagem de erro
 */
export function unauthorized(message = 'Não autorizado') {
  return new ApiError(401, 'unauthorized', message)
}

/**
 * Cria um erro 404 de recurso não encontrado
 * @param message Mensagem de erro
 */
export function notFound(message = 'Recurso não encontrado') {
  return new ApiError(404, 'not_found', message)
}

/**
 * Cria um erro 500 genérico
 * @param message Mensagem de erro
 * @param details Detalhes para diagnóstico
 */
export function internalError(message = 'Erro interno do servidor', details?: unknown) {
  return new ApiError(500, 'internal_error', message, details)
}
