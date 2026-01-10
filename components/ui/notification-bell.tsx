"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, X, Check, CheckCheck, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTypeLabel, formatRelative } from '@/lib/notification-format'

interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'STATUS_UPDATE'
  isRead: boolean
  createdAt: string
  serviceOrder?: {
    id: string
    orderNumber: string
  }
}

interface NotificationBellProps {
  userId?: string
  clientId?: string
}

export function NotificationBell({ userId, clientId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Buscar notificações
  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (clientId) params.append('clientId', clientId)
      params.append('limit', '10')

      const response = await fetch(`/api/notifications?${params}`, {
        credentials: 'include',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.isRead).length || 0)
      }
    } catch (error) {
      const isAbort = typeof error === 'object' && error && String(error).includes('AbortError')
      if (!isAbort) {
        console.error('Erro ao buscar notificações:', error)
      }
    }
  }, [userId, clientId])

  // Marcar notificação como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isRead: true })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      setLoading(true)
      const body: { userId?: string; clientId?: string } = {}
      if (userId) body.userId = userId
      if (clientId) body.clientId = clientId

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Buscar notificações ao montar o componente
  useEffect(() => {
    const controller = new AbortController()
    fetchNotifications(controller.signal)
    const interval = setInterval(() => fetchNotifications(), 30000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [fetchNotifications])

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'text-green-600'
      case 'WARNING': return 'text-yellow-600'
      case 'ERROR': return 'text-red-600'
      case 'STATUS_UPDATE': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getNotificationIcon = (type: string) => {
    const cls = `h-4 w-4 ${getNotificationColor(type)}`
    switch (type) {
      case 'SUCCESS': return <CheckCircle className={cls} />
      case 'WARNING': return <AlertTriangle className={cls} />
      case 'ERROR': return <XCircle className={cls} />
      case 'STATUS_UPDATE': return <Info className={cls} />
      default: return <Info className={cls} />
    }
  }

  const isToday = (ds: string) => {
    const d = new Date(ds)
    const n = new Date()
    return d.toDateString() === n.toDateString()
  }

  const isYesterday = (ds: string) => {
    const d = new Date(ds)
    const y = new Date()
    y.setDate(y.getDate() - 1)
    return d.toDateString() === y.toDateString()
  }

  const grouped = {
    hoje: notifications.filter(n => isToday(n.createdAt)),
    ontem: notifications.filter(n => isYesterday(n.createdAt)),
    anteriores: notifications.filter(n => !isToday(n.createdAt) && !isYesterday(n.createdAt)),
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Notificações</CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {grouped.hoje.length > 0 && (
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Hoje</div>
                  )}
                  {grouped.hoje.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                        !notification.isRead ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatRelative(notification.createdAt)}
                            </span>
                            {notification.serviceOrder && (
                              <Badge variant="outline" className="text-xs">
                                {notification.serviceOrder.orderNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {grouped.ontem.length > 0 && (
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Ontem</div>
                  )}
                  {grouped.ontem.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                        !notification.isRead ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatRelative(notification.createdAt)}
                            </span>
                            {notification.serviceOrder && (
                              <Badge variant="outline" className="text-xs">
                                {notification.serviceOrder.orderNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {grouped.anteriores.length > 0 && (
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Dias anteriores</div>
                  )}
                  {grouped.anteriores.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                        !notification.isRead ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatRelative(notification.createdAt)}
                            </span>
                            {notification.serviceOrder && (
                              <Badge variant="outline" className="text-xs">
                                {notification.serviceOrder.orderNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
