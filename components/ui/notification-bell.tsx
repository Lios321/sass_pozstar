"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (clientId) params.append('clientId', clientId)
      params.append('limit', '10')

      const response = await fetch(`/api/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.isRead).length || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
    }
  }, [userId, clientId])

  // Marcar notificação como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
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
    fetchNotifications()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Obter cor do badge baseado no tipo
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'bg-green-500'
      case 'WARNING': return 'bg-yellow-500'
      case 'ERROR': return 'bg-red-500'
      case 'STATUS_UPDATE': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return 'Agora há pouco'
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`
    } else {
      return date.toLocaleDateString('pt-BR')
    }
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
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                        !notification.isRead ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getNotificationColor(notification.type)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
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
                              {formatDate(notification.createdAt)}
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