'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { User, Building, Truck } from 'lucide-react'

interface User {
  id: number
  username: string
  role: string
}

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`)
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'customer': return <User className="w-8 h-8" />
      case 'business': return <Building className="w-8 h-8" />
      case 'vendor': return <Truck className="w-8 h-8" />
      default: return <User className="w-8 h-8" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'customer': return 'bg-blue-500 hover:bg-blue-600'
      case 'business': return 'bg-green-500 hover:bg-green-600'
      case 'vendor': return 'bg-amber-500 hover:bg-amber-600'
      default: return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Triaging System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect customers, businesses, and vendors. Choose your role to start.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-8">Choose Your Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/${user.role}?userId=${user.id}`}
                className={`${getRoleColor(user.role)} text-white rounded-xl p-8 text-center transition-all duration-200 transform hover:scale-105 shadow-lg`}
              >
                <div className="flex flex-col items-center space-y-4">
                  {getRoleIcon(user.role)}
                  <h3 className="text-2xl font-bold capitalize">{user.role}</h3>
                  <p className="text-lg opacity-90">{user.username}</p>
                  <p className="text-sm opacity-75">
                    {user.role === 'customer' && 'Submit tickets'}
                    {user.role === 'business' && 'Manage tickets'}
                    {user.role === 'vendor' && 'Respond to requests'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-16 bg-white rounded-xl p-8 shadow-lg max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="font-semibold mb-2">Customer</h4>
              <p className="text-sm text-gray-600">Submits a support ticket</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h4 className="font-semibold mb-2">Business</h4>
              <p className="text-sm text-gray-600">Assigns ticket and contacts vendor</p>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-amber-600">3</span>
              </div>
              <h4 className="font-semibold mb-2">Vendor</h4>
              <p className="text-sm text-gray-600">Provides response (async)</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h4 className="font-semibold mb-2">Resolution</h4>
              <p className="text-sm text-gray-600">Business replies to customer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
