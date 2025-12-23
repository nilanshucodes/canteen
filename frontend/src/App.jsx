import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import './App.css'

function Toast({ message, show }) {
  if (!show) return null
  return <div className="toast">{message}</div>
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const showMsg = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { role: 'customer' } }
        })
        if (error) throw error
        
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            role: 'customer'
          })
          showMsg('Account created! Logging in...')
        }
      }
    } catch (error) {
      showMsg('Error: ' + error.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <Toast message={msg} show={!!msg} />
      <div className="auth-container">
        <h2>Campus Canteen</h2>
        <p className="auth-subtitle">Order food quickly and easily</p>
        <form onSubmit={handleAuth}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password (min 6 chars)" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            minLength={6}
            required 
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        <p className="auth-switch" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up" : 'Have an account? Login'}
        </p>
      </div>
    </div>
  )
}

function Menu({ items, cart, setCart, search, setSearch, filter, setFilter, showMsg }) {
  const categories = ['All', ...new Set(items.map(i => i.category))]
  const filtered = items.filter(i => 
    i.available !== false &&
    (filter === 'All' || i.category === filter) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (item) => {
    const exists = cart.find(c => c.id === item.id)
    if (exists) {
      setCart(cart.map(c => c.id === item.id ? {...c, qty: c.qty + 1} : c))
    } else {
      setCart([...cart, {...item, qty: 1}])
    }
    showMsg(`Added ${item.name}`)
  }

  return (
    <div className="menu">
      <h2>Menu</h2>
      <div className="filters">
        <input 
          placeholder="Search food..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      
      {filtered.length === 0 ? (
        <p className="no-items">No items found</p>
      ) : (
        <div className="items-grid">
          {filtered.map(item => (
            <div key={item.id} className="item-card">
              <img src={item.image_url || 'https://via.placeholder.com/150?text=Food'} alt={item.name} />
              <h3>{item.name}</h3>
              <p className="item-category">{item.category}</p>
              <p className="item-price">${Number(item.price).toFixed(2)}</p>
              <button onClick={() => addToCart(item)}>Add to Cart +</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Cart({ cart, setCart, user, onOrder, showMsg }) {
  const [loading, setLoading] = useState(false)
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

  const updateQty = (id, delta) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQty = c.qty + delta
        return newQty > 0 ? {...c, qty: newQty} : c
      }
      return c
    }).filter(c => c.qty > 0))
  }

  const removeItem = (id) => {
    setCart(cart.filter(c => c.id !== id))
    showMsg('Item removed')
  }
  
  const placeOrder = async () => {
    if (cart.length === 0) {
      showMsg('Cart is empty!')
      return
    }

    setLoading(true)
    
    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      items: cart,
      total: total,
      status: 'placed'
    })
    
    if (error) {
      showMsg('Error: ' + error.message)
    } else {
      showMsg('Order placed successfully!')
      setCart([])
      onOrder()
    }
    
    setLoading(false)
  }

  return (
    <div className="cart">
      <h2>Cart ({cart.reduce((sum, i) => sum + i.qty, 0)})</h2>
      
      {cart.length === 0 ? (
        <p className="empty-cart">Your cart is empty</p>
      ) : (
        <>
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <span className="cart-item-name">{item.name}</span>
                <span className="cart-item-price">${(item.price * item.qty).toFixed(2)}</span>
              </div>
              <div className="cart-item-controls">
                <button onClick={() => updateQty(item.id, -1)}>-</button>
                <span>{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)}>+</button>
                <button className="remove-btn" onClick={() => removeItem(item.id)}>Remove</button>
              </div>
            </div>
          ))}
          
          <div className="cart-total">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button onClick={placeOrder} className="order-btn" disabled={loading}>
              {loading ? 'Placing order...' : `Place Order - $${total.toFixed(2)}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function OrderTracker({ status }) {
  const steps = ['placed', 'preparing', 'ready', 'completed']
  const currentIndex = steps.indexOf(status)
  
  const stepLabels = {
    placed: '📝 Placed',// this emoji is placed by nilanshu (NOT AI)
    preparing: '👨‍🍳 Preparing',
    ready: '✅ Ready',
    completed: '🎉 Completed'
  }

  return (
    <div className="order-tracker">
      {steps.map((step, index) => (
        <div key={step} className="tracker-step-container">
          <div className={`tracker-step ${index <= currentIndex ? 'active' : ''} ${index === currentIndex ? 'current' : ''}`}>
            <div className="step-icon"></div>
            <div className="step-label">{stepLabels[step]}</div>
          </div>
          {index < steps.length - 1 && (
            <div className={`tracker-line ${index < currentIndex ? 'active' : ''}`}></div>
          )}
        </div>
      ))}
    </div>
  )
}

function Orders({ orders }) {
  const activeOrders = orders.filter(o => o.status !== 'completed')
  const pastOrders = orders.filter(o => o.status === 'completed')

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="orders">
      <h2>My Orders</h2>
      
      {orders.length === 0 ? (
        <p className="no-orders">No orders yet. Start ordering!</p>
      ) : (
        <>
          {activeOrders.length > 0 && (
            <div className="orders-section">
              <h3>Active Orders</h3>
              {activeOrders.map(order => (
                <div key={order.id} className="order-card active">
                  <div className="order-header">
                    <span className="order-id">Order #{order.id.slice(0,8)}</span>
                    <span className="order-time">{formatDate(order.created_at)}</span>
                  </div>
                  
                  <OrderTracker status={order.status} />
                  
                  <div className="order-items-list">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="order-item-tag">
                        {item.name} × {item.qty}
                      </span>
                    ))}
                  </div>
                  
                  <div className="order-footer">
                    <span className="order-total">Total: ${Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pastOrders.length > 0 && (
            <div className="orders-section">
              <h3>Order History</h3>
              {pastOrders.map(order => (
                <div key={order.id} className="order-card completed">
                  <div className="order-header">
                    <span className="order-id">Order #{order.id.slice(0,8)}</span>
                    <span className="order-time">{formatDate(order.created_at)}</span>
                  </div>
                  
                  <div className="order-items-list">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="order-item-tag">
                        {item.name} × {item.qty}
                      </span>
                    ))}
                  </div>
                  
                  <div className="order-footer">
                    <span className="order-total">Total: ${Number(order.total).toFixed(2)}</span>
                    <span className="order-status completed">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AdminDashboard({ orders, items, refreshData, showMsg }) {
  const [newItem, setNewItem] = useState({ 
    name: '', 
    price: '', 
    category: 'Main', 
    image_url: '' 
  })
  const [editingItem, setEditingItem] = useState(null)
  const [activeTab, setActiveTab] = useState('orders')

  const statusFlow = ['placed', 'preparing', 'ready', 'completed']
  const statusColors = { 
    placed: '#ffc107', 
    preparing: '#17a2b8', 
    ready: '#28a745', 
    completed: '#6c757d' 
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) {
      showMsg('Error updating status')
    } else {
      showMsg(`Order marked as ${status}`)
      refreshData()
    }
  }

  const nextStatus = (currentStatus) => {
    const currentIndex = statusFlow.indexOf(currentStatus)
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1]
    }
    return null
  }

  const addItem = async (e) => {
    e.preventDefault()
    if (!newItem.name || !newItem.price) {
      showMsg('Please fill name and price')
      return
    }

    const { error } = await supabase.from('menu_items').insert({ 
      ...newItem, 
      price: parseFloat(newItem.price),
      available: true
    })
    
    if (error) {
      showMsg('Error: ' + error.message)
    } else {
      showMsg('Item added!')
      setNewItem({ name: '', price: '', category: 'Main', image_url: '' })
      refreshData()
    }
  }

  const updateItem = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('menu_items')
      .update({ 
        name: editingItem.name,
        price: parseFloat(editingItem.price),
        category: editingItem.category,
        image_url: editingItem.image_url,
        available: editingItem.available
      })
      .eq('id', editingItem.id)
    
    if (error) {
      showMsg('Error updating item')
    } else {
      showMsg('Item updated!')
      setEditingItem(null)
      refreshData()
    }
  }

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) {
      showMsg('Error deleting item')
    } else {
      showMsg('Item deleted!')
      refreshData()
    }
  }

  const toggleAvailability = async (id, currentStatus) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ available: !currentStatus })
      .eq('id', id)
    
    if (!error) {
      showMsg(`Item ${!currentStatus ? 'available' : 'unavailable'}`)
      refreshData()
    }
  }

  const activeOrders = orders.filter(o => o.status !== 'completed')
  const completedOrders = orders.filter(o => o.status === 'completed')

  return (
    <div className="admin">
      <h2>Admin Dashboard</h2>
      
      <div className="admin-tabs">
        <button 
          className={activeTab === 'orders' ? 'active' : ''} 
          onClick={() => setActiveTab('orders')}
        >
          Orders ({activeOrders.length})
        </button>
        <button 
          className={activeTab === 'menu' ? 'active' : ''} 
          onClick={() => setActiveTab('menu')}
        >
          Menu Items ({items.length})
        </button>
        <button 
          className={activeTab === 'history' ? 'active' : ''} 
          onClick={() => setActiveTab('history')}
        >
          History ({completedOrders.length})
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="admin-section">
          <h3>Active Orders</h3>
          {activeOrders.length === 0 ? (
            <p className="no-items">No active orders</p>
          ) : (
            <div className="admin-orders-grid">
              {activeOrders.map(order => (
                <div key={order.id} className="admin-order-card" style={{borderLeft: `4px solid ${statusColors[order.status]}`}}>
                  <div className="admin-order-header">
                    <span className="order-id">#{order.id.slice(0,8)}</span>
                    <span className="order-status" style={{background: statusColors[order.status]}}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="admin-order-items">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="admin-order-item">
                        <span>{item.name}</span>
                        <span>× {item.qty}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="admin-order-footer">
                    <span className="order-total">${Number(order.total).toFixed(2)}</span>
                    <span className="order-time">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="admin-order-actions">
                    <select 
                      value={order.status} 
                      onChange={e => updateStatus(order.id, e.target.value)}
                    >
                      {statusFlow.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                    
                    {nextStatus(order.status) && (
                      <button 
                        className="next-status-btn"
                        onClick={() => updateStatus(order.id, nextStatus(order.status))}
                      >
                        Next: {nextStatus(order.status)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="admin-section">
          <div className="admin-form-section">
            <h3>Add New Item</h3>
            <form onSubmit={addItem} className="admin-form">
              <input 
                placeholder="Item name" 
                value={newItem.name} 
                onChange={e => setNewItem({...newItem, name: e.target.value})} 
                required 
              />
              <input 
                placeholder="Price" 
                type="number" 
                step="0.01" 
                min="0"
                value={newItem.price} 
                onChange={e => setNewItem({...newItem, price: e.target.value})} 
                required 
              />
              <select 
                value={newItem.category} 
                onChange={e => setNewItem({...newItem, category: e.target.value})}
              >
                <option>Main</option>
                <option>Sides</option>
                <option>Drinks</option>
                <option>Dessert</option>
              </select>
              <input 
                placeholder="Image URL (optional)" 
                value={newItem.image_url} 
                onChange={e => setNewItem({...newItem, image_url: e.target.value})} 
              />
              <button type="submit">Add Item</button>
            </form>
          </div>

          {editingItem && (
            <div className="modal-overlay" onClick={() => setEditingItem(null)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>Edit Item</h3>
                <form onSubmit={updateItem} className="admin-form">
                  <input 
                    placeholder="Item name" 
                    value={editingItem.name} 
                    onChange={e => setEditingItem({...editingItem, name: e.target.value})} 
                    required 
                  />
                  <input 
                    placeholder="Price" 
                    type="number" 
                    step="0.01" 
                    value={editingItem.price} 
                    onChange={e => setEditingItem({...editingItem, price: e.target.value})} 
                    required 
                  />
                  <select 
                    value={editingItem.category} 
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                  >
                    <option>Main</option>
                    <option>Sides</option>
                    <option>Drinks</option>
                    <option>Dessert</option>
                  </select>
                  <input 
                    placeholder="Image URL" 
                    value={editingItem.image_url || ''} 
                    onChange={e => setEditingItem({...editingItem, image_url: e.target.value})} 
                  />
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={editingItem.available} 
                      onChange={e => setEditingItem({...editingItem, available: e.target.checked})}
                    />
                    Available
                  </label>
                  <div className="modal-buttons">
                    <button type="submit">Save Changes</button>
                    <button type="button" onClick={() => setEditingItem(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="admin-items-section">
            <h3>Menu Items</h3>
            <div className="admin-items-grid">
              {items.map(item => (
                <div key={item.id} className={`admin-item-card ${!item.available ? 'unavailable' : ''}`}>
                  <img src={item.image_url || 'https://via.placeholder.com/100?text=Food'} alt={item.name} />
                  <div className="admin-item-info">
                    <h4>{item.name}</h4>
                    <p>${Number(item.price).toFixed(2)} • {item.category}</p>
                    <span className={`availability ${item.available !== false ? 'available' : 'not-available'}`}>
                      {item.available !== false ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div className="admin-item-actions">
                    <button onClick={() => setEditingItem(item)}>Edit</button>
                    <button onClick={() => toggleAvailability(item.id, item.available !== false)}>
                      {item.available !== false ? 'Off' : 'On'}
                    </button>
                    <button onClick={() => deleteItem(item.id, item.name)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="admin-section">
          <h3>Completed Orders</h3>
          {completedOrders.length === 0 ? (
            <p className="no-items">No completed orders yet</p>
          ) : (
            <div className="history-list">
              {completedOrders.slice(0, 20).map(order => (
                <div key={order.id} className="history-item">
                  <span>#{order.id.slice(0,8)}</span>
                  <span>{order.items.map(i => `${i.name}(${i.qty})`).join(', ')}</span>
                  <span>${Number(order.total).toFixed(2)}</span>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('menu')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  const showMsg = (text) => {
    setToast(text)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      // Get menu
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
      setItems(menuData || [])
      
      if (user) {
        let { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (!profileData) {
          await supabase.from('profiles').insert({ 
            id: user.id, 
            email: user.email, 
            role: 'customer' 
          })
          profileData = { id: user.id, email: user.email, role: 'customer' }
        }
        
        setProfile(profileData)
        
        let ordersQuery = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (profileData?.role !== 'admin') {
          ordersQuery = ordersQuery.eq('user_id', user.id)
        }
        
        const { data: ordersData } = await ordersQuery
        setOrders(ordersData || [])
      }
    }

    loadData()
    const subscription = supabase
      .channel('orders-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, () => {
        loadData()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [user])

  const refreshData = async () => {
    const { data: menuData } = await supabase.from('menu_items').select('*').order('category')
    setItems(menuData || [])
    
    if (user) {
      let ordersQuery = supabase.from('orders').select('*').order('created_at', { ascending: false })
      
      if (profile?.role !== 'admin') {
        ordersQuery = ordersQuery.eq('user_id', user.id)
      }
      
      const { data: ordersData } = await ordersQuery
      setOrders(ordersData || [])
    }
  }
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <div className="app">
      <Toast message={toast} show={!!toast} />
      
      <nav>
        <h1>Canteen</h1>
        <div className="nav-links">
          <button 
            onClick={() => setView('menu')} 
            className={view === 'menu' ? 'active' : ''}
          >
            Menu
          </button>
          <button 
            onClick={() => setView('orders')} 
            className={view === 'orders' ? 'active' : ''}
          >
            Orders {orders.filter(o => o.status !== 'completed').length > 0 && 
              <span className="badge">{orders.filter(o => o.status !== 'completed').length}</span>
            }
          </button>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setView('admin')} 
              className={view === 'admin' ? 'active' : ''}
            >
              Admin
            </button>
          )}
          <button onClick={() => supabase.auth.signOut()} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>

      <main>
        {view === 'menu' && (
          <div className="menu-view">
            <Menu 
              items={items} 
              cart={cart} 
              setCart={setCart} 
              search={search} 
              setSearch={setSearch} 
              filter={filter} 
              setFilter={setFilter} 
              showMsg={showMsg} 
            />
            <Cart 
              cart={cart} 
              setCart={setCart} 
              user={user} 
              onOrder={refreshData} 
              showMsg={showMsg} 
            />
          </div>
        )}
        {view === 'orders' && <Orders orders={orders} />}
        {view === 'admin' && profile?.role === 'admin' && (
          <AdminDashboard 
            orders={orders} 
            items={items} 
            refreshData={refreshData} 
            showMsg={showMsg} 
          />
        )}
      </main>
    </div>
  )
}
