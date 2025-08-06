# 🗺️ Property Activity Tracker – Backend API

A real-time backend system for tracking, replaying, and broadcasting property-related activities performed by sales representatives. Built using **NestJS** and **MongoDB**.

---

## 🚀 Features

- 🔴 Live tracking of sales rep activities on a shared map
- ⏪ Replay activities missed while offline
- 📡 Real-time notifications when reps reach specific scores or perform critical activities
- 🔒 JWT-based authentication
- 🧱 Modular architecture with REST + WebSocket support
- 📖 API documentation with Swagger

---

## 📦 Tech Stack

| Layer          | Tech                          |
|---------------|-------------------------------|
| Language       | TypeScript                    |
| Framework      | [NestJS](https://nestjs.com)  |
| Database       | MongoDB + Mongoose            |
| Realtime       | WebSocket (via Socket.IO)     |
| Auth           | JWT                           |
| API Docs       | Swagger (via `@nestjs/swagger`) |

---

## 🧱 Entities & Models

### 🧍 SalesRep
- `id` (ObjectId)
- `name` (string)
- `isOnline` (boolean)
- `score` (number – accumulated)

### 🏘️ Property
- `id` (ObjectId)
- `propertyName` (string)
- `address` (string)
- `location` (lat/lng)

### 📝 Activity
- `id` (ObjectId)
- `salesRepId` (ref to SalesRep)
- `propertyId` (ref to Property)
- `activityType` (`visit` | `call` | `inspection` | `follow-up` | `note`)
- `timestamp` (Date)
- `location` (lat/lng)
- `note` (optional)
- `weight` (number)

---

## 🧭 Map Display Logic

### 🔴 Live Activities
Activities appear instantly on a shared map using real-time events via WebSockets.

| Type        | Description              | Display              | Weight |
|-------------|--------------------------|----------------------|--------|
| `visit`     | Visited property         | Marker/pin drop      | 10     |
| `call`      | Called contact           | Phone icon flash     | 8      |
| `inspection`| Physical inspection      | Checklist icon       | 6      |
| `follow-up` | Follow-up action         | Clock/arrow icon     | 4      |
| `note`      | Left a note              | Sticky note popup    | 2      |

### ⏪ Replay Activities
When a rep comes back online:
- Missed activities are fetched chronologically
- Replayed on the map at accelerated speed (e.g., 10x)
- Stored persistently in DB

---

## 🔔 Notification Logic

- 🔢 When a rep's **score reaches 100**:
  > “🎉 [RepName] reached 100 points!”

- 📌 When a **high-weight activity** is done:
  > “⚡ [RepName] had an opportunity!”

Delivered to all users via WebSocket in real-time.

---

## 🧪 Getting Started

### 🔧 Prerequisites
- Node.js v18+
- MongoDB installed locally or Atlas cluster

### 📥 Installation

```bash
git clone https://github.com/PanseeBadry/property-activity-tracker.git
cd property-activity-tracker
npm install
