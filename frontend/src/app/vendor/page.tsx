'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, Clock, CheckCircle, AlertTriangle, User, Building } from 'lucide-react'
import Link from 'next/link'

interface Ticket {
  id: number
  title: string
  description: string
  status: string
  created_at: string
  customer: { id: number; username: string }
  business: { id: number; username: string } | null
  vendor: { id: number; username: string } | null
}

interface Message {
  id: number
  content: string
  message_type: string
  created_at: string
  sender: { id: number; username: string; role: string }
  recipient: { id: number; username: string; role: string } | null
}

export default function VendorPage() {
  const searchParams = useSearchParams()
  const userId = parseInt(searchParams.get('userId') || '3')
  
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  
  // Chat state
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    fetchTickets()
    
    // WebSocket connection for real-time updates
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/${userId}`)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('Vendor WebSocket message:', data)
      if (data.type === 'vendor_contacted') {
        fetchTickets()
      }
    }

    return () => ws.close()
  }, [userId])

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id)
    }
  }, [selectedTicket])

  const fetchTickets = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${userId}`)
      const data = await response.json()
      setTickets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (ticketId: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticketId}/messages?user_id=${userId}`)
      const data = await response.json()
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      setMessages([])
    }
  }

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return

    setSendingMessage(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${selectedTicket.id}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          sender_id: userId.toString(),
          content: newMessage
        })
      })

      if (response.ok) {
        setNewMessage('')
        fetchMessages(selectedTicket.id)
        fetchTickets() // Refresh to update status if needed
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vendor_contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'vendor_responded': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'vendor_contacted': return <AlertTriangle className="w-4 h-4" />
      case 'vendor_responded': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getPriorityLevel = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const hoursDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    
    if (hoursDiff < 2) return { level: 'normal', color: 'text-gray-600', text: 'Normal' }
    if (hoursDiff < 6) return { level: 'high', color: 'text-orange-600', text: 'High Priority' }
    return { level: 'urgent', color: 'text-red-600', text: 'Urgent' }
  }

  const getVendorRequest = (messages: Message[]) => {
    return messages.find(msg => msg.message_type === 'vendor_request')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Vendor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Pending: {tickets.filter(t => t.status === 'vendor_contacted').length} requests
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request List */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Vendor Requests</h2>
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                  No vendor requests yet.
                </div>
              ) : (
                tickets.map((ticket) => {
                  const priority = getPriorityLevel(ticket.created_at)
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`bg-white p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-200 ${
                        selectedTicket?.id === ticket.id ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 truncate flex-1">{ticket.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)} flex items-center space-x-1 ml-2`}>
                          {getStatusIcon(ticket.status)}
                          <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          <span>{ticket.customer.username}</span>
                        </div>
                        <span className={`text-xs font-medium ${priority.color}`}>
                          {priority.text}
                        </span>
                      </div>
                      
                      {ticket.business && (
                        <div className="text-xs text-gray-500 flex items-center space-x-1 mb-2">
                          <Building className="w-3 h-3" />
                          <span>via {ticket.business.username}</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        {new Date(ticket.created_at).toLocaleString()}
                      </div>

                      {ticket.status === 'vendor_contacted' && (
                        <div className="mt-2 text-xs bg-yellow-50 text-yellow-700 p-2 rounded border">
                          ⏰ Response needed
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Request Details */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedTicket.title}</h2>
                      <p className="text-gray-600 mb-4">{selectedTicket.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>Customer: {selectedTicket.customer.username}</span>
                        <span>Business: {selectedTicket.business?.username}</span>
                        <span>Received: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedTicket.status)} flex items-center space-x-1`}>
                        {getStatusIcon(selectedTicket.status)}
                        <span className="capitalize">{selectedTicket.status.replace('_', ' ')}</span>
                      </span>
                      <div className="mt-2">
                        {(() => {
                          const priority = getPriorityLevel(selectedTicket.created_at)
                          return (
                            <span className={`text-sm font-medium ${priority.color}`}>
                              {priority.text}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages and Chat */}
                <div className="p-6">
                  <div className="space-y-6">
                    {/* Vendor Request */}
                    {(() => {
                      const vendorRequest = getVendorRequest(messages)
                      if (!vendorRequest) return null
                      
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-2 text-blue-900">Request from Business</h3>
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium text-sm text-blue-800">
                              {vendorRequest.sender.username}
                              <span className="text-xs text-blue-600 ml-2">
                                {new Date(vendorRequest.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-blue-900">{vendorRequest.content}</p>
                        </div>
                      )
                    })()}

                    {/* Chat Input */}
                    {selectedTicket.status !== 'resolved' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-4 text-amber-900">Send Message to Business</h3>
                        <div className="space-y-4">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              className="flex-1 px-4 py-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                              placeholder="Type your message to the business..."
                              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button
                              onClick={sendMessage}
                              disabled={!newMessage.trim() || sendingMessage}
                              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                              <Send className="w-4 h-4" />
                              <span>{sendingMessage ? 'Sending...' : 'Send'}</span>
                            </button>
                          </div>
                          <p className="text-xs text-amber-700">
                            💡 You can send multiple messages back and forth with the business team
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Full Message History */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Full Communication History</h3>
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No messages yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`p-4 rounded-lg border ${
                                message.sender.role === 'vendor' 
                                  ? 'bg-amber-50 border-amber-200 ml-8' 
                                  : message.sender.role === 'business'
                                  ? 'bg-green-50 border-green-200 mr-8'
                                  : 'bg-blue-50 border-blue-200 mr-8'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="font-medium text-sm">
                                  {message.sender.username}
                                  <span className="text-xs text-gray-500 ml-2 capitalize">({message.sender.role})</span>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {new Date(message.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-700">{message.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Request</h3>
                <p className="text-gray-500">Choose a vendor request from the list to review and respond.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}