'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, UserCheck, Send, CheckCircle, AlertCircle, Clock, User, Building } from 'lucide-react'
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

interface User {
  id: number
  username: string
  role: string
}

export default function BusinessPage() {
  const searchParams = useSearchParams()
  const userId = parseInt(searchParams.get('userId') || '2')
  
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  // Forms state
  const [showVendorForm, setShowVendorForm] = useState(false)
  const [showResolutionForm, setShowResolutionForm] = useState(false)
  const [vendorRequest, setVendorRequest] = useState('')
  const [resolution, setResolution] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<User | null>(null)
  
  // Chat state
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    fetchTickets()
    fetchUsers()
    
    // WebSocket connection for real-time updates
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/${userId}`)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_ticket' || data.type === 'vendor_response') {
        fetchTickets()
        if (selectedTicket) {
          fetchMessages(selectedTicket.id)
        }
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

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`)
      const data = await response.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
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

  const assignTicket = async (ticketId: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          business_id: userId.toString()
        })
      })

      if (response.ok) {
        fetchTickets()
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error)
    }
  }

  const contactVendor = async () => {
    if (!selectedTicket || !selectedVendor || !vendorRequest.trim()) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${selectedTicket.id}/contact-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          vendor_id: selectedVendor.id.toString(),
          message: vendorRequest
        })
      })

      if (response.ok) {
        setShowVendorForm(false)
        setVendorRequest('')
        setSelectedVendor(null)
        fetchTickets()
        fetchMessages(selectedTicket.id)
      }
    } catch (error) {
      console.error('Failed to contact vendor:', error)
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
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const resolveTicket = async () => {
    if (!selectedTicket || !resolution.trim()) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${selectedTicket.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          business_id: userId.toString(),
          resolution: resolution
        })
      })

      if (response.ok) {
        setShowResolutionForm(false)
        setResolution('')
        fetchTickets()
        fetchMessages(selectedTicket.id)
      }
    } catch (error) {
      console.error('Failed to resolve ticket:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200'
      case 'business_assigned': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'vendor_contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'vendor_responded': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionButton = (ticket: Ticket) => {
    if (ticket.status === 'open') {
      return (
        <button
          onClick={() => assignTicket(ticket.id)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
        >
          <UserCheck className="w-4 h-4" />
          <span>Assign to Me</span>
        </button>
      )
    }
    
    if (ticket.status === 'business_assigned' && ticket.business?.id === userId) {
      return (
        <button
          onClick={() => {
            setSelectedTicket(ticket)
            setShowVendorForm(true)
          }}
          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 flex items-center space-x-1"
        >
          <Send className="w-4 h-4" />
          <span>Contact Vendor</span>
        </button>
      )
    }
    
    if (ticket.status === 'vendor_responded' && ticket.business?.id === userId) {
      return (
        <button
          onClick={() => {
            setSelectedTicket(ticket)
            setShowResolutionForm(true)
          }}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Resolve Ticket</span>
        </button>
      )
    }
    
    return null
  }

  const vendors = users.filter(user => user.role === 'vendor')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
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
              <h1 className="text-xl font-semibold text-gray-900">Business Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Tickets: {tickets.filter(t => t.status !== 'resolved').length} active
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Support Queue</h2>
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                  No tickets in queue.
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`bg-white p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-200 ${
                      selectedTicket?.id === ticket.id ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 truncate flex-1">{ticket.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)} flex items-center space-x-1 ml-2`}>
                        {ticket.status === 'open' && <AlertCircle className="w-3 h-3" />}
                        {ticket.status === 'vendor_responded' && <CheckCircle className="w-3 h-3" />}
                        {['business_assigned', 'vendor_contacted'].includes(ticket.status) && <Clock className="w-3 h-3" />}
                        <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{ticket.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{ticket.customer.username}</span>
                      </div>
                      {getActionButton(ticket)}
                    </div>
                    
                    {ticket.business && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                        <Building className="w-3 h-3" />
                        <span>Assigned to: {ticket.business.username}</span>
                      </div>
                    )}
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
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedTicket.title}</h2>
                      <p className="text-gray-600 mb-4">{selectedTicket.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>Customer: {selectedTicket.customer.username}</span>
                        <span>Created: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                        {selectedTicket.business && (
                          <span>Assigned: {selectedTicket.business.username}</span>
                        )}
                        {selectedTicket.vendor && (
                          <span>Vendor: {selectedTicket.vendor.username}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedTicket.status)} flex items-center space-x-1`}>
                        <span className="capitalize">{selectedTicket.status.replace('_', ' ')}</span>
                      </span>
                      <div className="mt-2">
                        {getActionButton(selectedTicket)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Communication Thread</h3>
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
                            message.sender.role === 'business' 
                              ? 'bg-green-50 border-green-200 ml-8' 
                              : message.sender.role === 'customer'
                              ? 'bg-blue-50 border-blue-200 mr-8'
                              : 'bg-amber-50 border-amber-200 mr-8'
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

                  {/* Chat Input */}
                  {selectedTicket?.vendor && selectedTicket.status !== 'resolved' && (
                    <div className="mt-6 border-t pt-4">
                      <h4 className="font-semibold text-sm mb-2">Send Message to Vendor</h4>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Message to vendor..."
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sendingMessage}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingMessage ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Ticket</h3>
                <p className="text-gray-500">Select a ticket to manage.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Vendor Modal */}
      {showVendorForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Contact Vendor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor</label>
                <select
                  value={selectedVendor?.id || ''}
                  onChange={(e) => {
                    const vendor = vendors.find(v => v.id === parseInt(e.target.value))
                    setSelectedVendor(vendor || null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Choose a vendor...</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Message</label>
                <textarea
                  value={vendorRequest}
                  onChange={(e) => setVendorRequest(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 h-24"
                  placeholder="Message to vendor..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={contactVendor}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                disabled={!selectedVendor || !vendorRequest.trim()}
              >
                Send Request
              </button>
              <button
                onClick={() => {
                  setShowVendorForm(false)
                  setVendorRequest('')
                  setSelectedVendor(null)
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {showResolutionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Resolve Ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Message</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 h-32"
                  placeholder="Resolution message..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={resolveTicket}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                disabled={!resolution.trim()}
              >
                Send Resolution
              </button>
              <button
                onClick={() => {
                  setShowResolutionForm(false)
                  setResolution('')
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