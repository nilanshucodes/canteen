# Campus Canteen Order Management System

A real-time ordering platform designed for high-efficiency campus environments. This system allows students to browse menus, place orders, and track preparation status live, while providing canteen staff with a robust dashboard for inventory and order fulfillment.

---

##  Features

- **Live Order Tracking:** Real-time status updates (Placed → Preparing → Ready → Completed) using WebSocket-driven state.
- **Dynamic Menu:** Search and filterable items with instant inventory toggle for admins.
- **Cart Management:** Persistent local state for handling multiple items and quantities.
- **Role-Based Access:** Secure Admin and Customer dashboards powered by JWT authentication.
- **Unified Inventory:** Admins can perform full CRUD (Create, Read, Update, Delete) operations on the menu catalogue.

---

##  Tech Stack

- **Frontend:** React.js (Vite)
- **Backend-as-a-Service:** Supabase (PostgreSQL + Auth + Realtime)
- **Styling:** Custom CSS (Humanized Yellow Theme, Sharp Edge UI)
- **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`)
- **Real-time Engine:** Supabase Broadcast & DB Listeners (WebSockets)

---

##  Why This Stack?

In modern web development, speed-to-market and scalability are key. Here is why we chose this architecture over the traditional **MERN (Mongo, Express, React, Node)** stack:

### 1. Supabase vs. Traditional Node/Express
Instead of writing thousands of lines of boilerplate for an Express.js API, we used **Supabase**.
*   **Built-in Auth:** Supabase provides production-ready JWT authentication out of the box. No need to manage salts, hashes, or session tokens manually.
*   **Auto-Generated REST API:** By defining our PostgreSQL schema, Supabase instantly provides a secure API, reducing backend development time by ~70%.

### 2. PostgreSQL vs. MongoDB
While MongoDB is flexible, Canteen systems are inherently **relational**.
*   **Data Integrity:** Orders must link to specific Profiles, and Menu Items must exist before being ordered. PostgreSQL's Foreign Key constraints prevent "orphan" orders.
*   **JSONB Support:** We used Postgres's `JSONB` column type to store cart items. This gives us the "NoSQL" flexibility of a document store within a structured SQL database.

### 3. Real-time WebSockets vs. HTTP Polling
Traditional apps often "poll" the server every few seconds to check if an order is ready, which is expensive for servers.
*   **Efficiency:** We used **Postgres Changes**. The frontend "subscribes" to the database. When an admin updates an order status in the DB, the DB "pushes" that change to the customer instantly.

---

##  Database Architecture

The system relies on three core tables in a relational PostgreSQL schema:

1.  **`profiles`**: Links to Supabase Auth. Stores user roles (`admin` vs `customer`).
2.  **`menu_items`**: The catalogue. Stores prices, categories, and availability.
3.  **`orders`**: The transaction log.
    *   Stores `items` as a JSONB array.
    *   Stores `status` as an ENUM-like string for progress tracking.

---

##  Key Code Logic: Real-time Sync

The "magic" of the live tracking happens in this `useEffect` hook. Instead of a manual refresh, the app listens to the database heartbeat:

```javascript
useEffect(() => {
  // 1. Initial Data Load
  loadData();

  // 2. Setup Real-time Listener
  const subscription = supabase
    .channel('orders-update')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'orders' 
    }, (payload) => {
      // Logic runs automatically when any order row changes
      loadData(); 
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [user]);
```

---

##  Design Philosophy
This application utilizes a **Yellow Theme**. 
*   **Color Palette:** `#fff9e6` (Warm Yellow) and `#3b2b10` (Deep Brown) to reduce eye strain and provide a "cafe" feel.
*   **Sharp-Edge UI:** All `border-radius` properties are set to `0`. This creates a high-contrast, professional, and modern "brutalist" aesthetic that focuses purely on functionality and content.

---

##  Installation & Deployment

1.  **Clone:** `git clone <repo-url>`
2.  **Install:** `npm install`
3.  **Environment Variables:** Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4.  **Database Setup:** Execute the SQL schema provided in the `/sql` directory within the Supabase SQL Editor.
5.  **Run:** `npm run dev`
