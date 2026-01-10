import { useEffect, useState, useCallback } from 'react'

export type SortDirection = 'asc' | 'desc'

export function usePaginatedList<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      params.set('sortField', sortField)
      params.set('sortDirection', sortDirection)
      const res = await fetch(`${endpoint}?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        setError('Erro ao carregar lista')
        return
      }
      const data = await res.json()
      const list = data.items || data.serviceOrders || data.clients || data.technicians || data
      setItems(Array.isArray(list) ? list : [])
      if (data.pagination) {
        setTotal(data.pagination.total || 0)
        setPages(data.pagination.pages || 1)
      } else {
        setTotal(Array.isArray(list) ? list.length : 0)
        setPages(1)
      }
    } catch (e) {
      setError('Erro ao carregar lista')
    } finally {
      setLoading(false)
    }
  }, [endpoint, page, limit, search, sortField, sortDirection])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return {
    items, total, pages,
    page, setPage,
    limit, setLimit,
    search, setSearch,
    sortField, setSortField,
    sortDirection, setSortDirection,
    loading, error,
    refresh: fetchList,
  }
}
