# Aurevia Commerce Operations Platform

A production-style direct-to-consumer order management platform built with FastAPI, SQLAlchemy, PostgreSQL, and React.

## Features

- Admin + customer auth with JWT and role enforcement
- Product catalogue with admin CRUD
- Customer management
- Inventory, stock adjustment, and transaction history
- Order creation with validation and transactional stock updates
- Dashboard analytics and fast-moving product metrics
- Low-stock and stock-out alerting
- Responsive React frontend

## Stack

- Backend: Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic
- Frontend: React, Vite, TypeScript, Tailwind CSS, Recharts

## Environment configuration

Create environment files from the included examples before starting the app.

- Root example: `.env.example` (project-level template)
- Backend example: `backend/.env.example` (used by the FastAPI app)
- Frontend example: `frontend/.env.example` (used by Vite)

Use placeholder values only in examples. Do not commit real credentials, tokens, or secrets.

## Backend setup

1. Install PostgreSQL and create the database and role used by your local environment. For the default local superuser, run:
   - `psql -U postgres -c "CREATE DATABASE d2c_order_management;"`
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` to your PostgreSQL credentials. For example:
   - `DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/d2c_order_management`
   - `SECRET_KEY=change-this-in-production`
3. Activate the environment and install dependencies:
   - `cd backend`
   - `..\.venv\Scripts\Activate.ps1` (Windows) or `source ../.venv/bin/activate` (Unix)
   - `pip install -r requirements.txt`
4. Apply the initial PostgreSQL schema:
   - `alembic upgrade head`
5. Seed development data:
   - `python -m scripts.seed`
6. Start app:
   - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

The seed creates one admin (`admin@example.com` / `admin1234`), five customers, twelve products, twenty historical orders, inventory transactions, low-stock conditions, and alerts. It clears existing development records before recreating them.

## Frontend setup

1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend URL if needed.
4. `npm run dev`

## API docs

Swagger is available at `http://localhost:8000/docs`.

## Demo credentials

The project includes a local demo dataset with development-only credentials:

- Admin: `admin@example.com` / `admin1234`
- Customer: `ava.sharma@example.com` / `customer123`

These credentials are for local development only and must not be used in production.

## Database tables

The initial Alembic revision creates `users`, `customers`, `products`, `orders`, `order_items`, `inventory`, `inventory_transactions`, and `alerts`, including foreign keys, unique indexes for user/customer email, SKU, and order number, timestamps, and non-negative quantity/price checks.
