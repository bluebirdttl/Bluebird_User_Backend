# PWA Backend

This is the backend server for the PWA system, built with Node.js and Express. It manages API requests, authentication, and database interactions using both MySQL and Supabase.

## 🚀 Tech Stack

- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express.js](https://expressjs.com/)
- **Database:**
  - [MySQL](https://www.mysql.com/) (via `mysql2`)
  - [Supabase](https://supabase.com/) (via `@supabase/supabase-js`)
- **Utilities:**
  - `dotenv` for environment variable management
  - `cors` for Cross-Origin Resource Sharing
  - `axios` for making HTTP requests

## 📂 Project Structure

```
tata_pwa_modified_backend/
├── controllers/      # Logic for handling API requests
├── db/               # Database connection configurations
├── routes/           # API route definitions
├── index.js          # Entry point of the application
├── .env              # Environment variables (not committed)
└── package.json      # Dependencies and scripts
```

## 🛠️ Setup & Installation

1.  **Clone the repository** (if you haven't already).
2.  **Navigate to the backend directory:**
    ```bash
    cd tata_pwa_modified_backend
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add your configuration details (e.g., DB credentials, API keys).
    ```env
    PORT=5000
    # Add other necessary variables here
    ```
5.  **Start the server:**
    ```bash
    npm start
    ```
    The server will typically run on `http://localhost:5000` (or the port specified in your `.env`).

## 📜 Scripts

- `npm start`: Runs the application using `node index.js`.
