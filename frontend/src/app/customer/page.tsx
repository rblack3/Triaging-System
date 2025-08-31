'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, MessageCircle, Clock, CheckCircle } from 'lucide-react'
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

export default function CustomerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const userId = parseInt(searchParams.get('userId') || '1')
  
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTicketForm, setShowNewTicketForm] = useState(false)
  const [newTicket, setNewTicket] = useState({ title: '', description: '' })

  useEffect(() => {
    fetchTickets()
    
    // WebSocket connection for real-time updates
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/${userId}`)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'ticket_resolved' || data.type === 'ticket_assigned') {
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
      setTickets(data)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (ticketId: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticketId}/messages?user_id=${userId}`)
      const data = await response.json()
      // Ensure data is always an array
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      setMessages([]) // Set empty array on error
    }
  }

  const createTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          title: newTicket.title,
          description: newTicket.description,
          customer_id: userId.toString()
        })
      })

      if (response.ok) {
        setNewTicket({ title: '', description: '' })
        setShowNewTicketForm(false)
        fetchTickets()
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800'
      case 'business_assigned': return 'bg-blue-100 text-blue-800'
      case 'vendor_contacted': return 'bg-orange-100 text-orange-800'
      case 'vendor_responded': return 'bg-purple-100 text-purple-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />
      case 'resolved': return <CheckCircle className="w-4 h-4" />
      default: return <MessageCircle className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
              <h1 className="text-xl font-semibold text-gray-900">Customer Dashboard</h1>
            </div>
            <button
              onClick={() => setShowNewTicketForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Ticket</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">My Support Tickets</h2>
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                  No tickets yet. Create your first support ticket!
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`bg-white p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-200 ${
                      selectedTicket?.id === ticket.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{ticket.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)} flex items-center space-x-1`}>
                        {getStatusIcon(ticket.status)}
                        <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket Details */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedTicket.title}</h2>
                      <p className="text-gray-600 mb-4">{selectedTicket.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                        {selectedTicket.business && (
                          <span>Assigned to: {selectedTicket.business.username}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTicket.status)} flex items-center space-x-1`}>
                      {getStatusIcon(selectedTicket.status)}
                      <span className="capitalize">{selectedTicket.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Communication History</h3>
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No messages yet. Your ticket is being processed.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg ${
                            message.sender.role === 'customer' 
                              ? 'bg-blue-50 ml-8' 
                              : 'bg-gray-50 mr-8'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium text-sm">
                              {message.sender.username} 
                              <span className="text-xs text-gray-500 ml-2 capitalize">({message.sender.role})</span>
                              {message.message_type !== 'general' && (
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded ml-2">
                                  {message.message_type.replace('_', ' ')}
                                </span>
                              )}
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
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Ticket</h3>
                <p className="text-gray-500">Choose a ticket from the list to view its details and communication history.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Support Ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of your issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                  placeholder="Detailed description of your issue..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={createTicket}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Create Ticket
              </button>
              <button
                onClick={() => {
                  setShowNewTicketForm(false)
                  setNewTicket({ title: '', description: '' })
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
