# iCart — Standalone Backend + SQLite API

**Project Title:** iCart: A Smart Shopping Cart with Barcode Scanning, Voice Assistance, and Budget Monitoring  
**Phase:** Standalone Raspberry Pi deployment

---

## 1. Overview

The **iCart Backend** is a Node.js / Express REST API with an embedded SQLite database. The frontend, API, hardware services, and database can all run on the **Raspberry Pi 3 Model B (1GB RAM)** without a laptop or MongoDB server.

---

## 2. Technology Stack

* **Runtime:** Node.js (v20+)
* **Server Framework:** Express.js (v4.21+)
* **Database:** SQLite via `better-sqlite3` (WAL mode)
* **Security & Auth:** JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
* **Configuration:** `dotenv`
* **CORS:** `cors`

---

## 3. Directory Structure

```text
backend/
│
├── config/
│   ├── db.js             # Embedded SQLite connection and schema
│   └── constants.js      # Tolerances (±5g), status enums, budget logic
│
├── controllers/
│   ├── authController.js       # Admin & user JWT authentication
│   ├── productController.js    # Product queries, barcode lookup, CRUD
│   ├── cartController.js       # Cart lifecycle, barcode addition, budget, weight
│   ├── checkoutController.js   # Checkout processing, stock deduction, transactions
│   └── inventoryController.js  # Stock levels, restock adjustments, low-stock alerts
│
├── middleware/
│   ├── authMiddleware.js       # JWT Bearer verification & Admin role guard
│   └── errorMiddleware.js      # 404 handler & centralized error formatter
│
├── models/
│   ├── User.js           # Admin and Cashier accounts (bcrypt hashing)
│   ├── Product.js        # Products with unique barcode & expected weight
│   ├── Cart.js           # Shopping cart, line items, budget, weight status
│   └── Transaction.js    # Completed checkouts, payments, audit history
│
├── routes/
│   ├── authRoutes.js           # /api/auth
│   ├── productRoutes.js        # /api/products
│   ├── cartRoutes.js           # /api/cart
│   ├── checkoutRoutes.js       # /api/checkout
│   └── inventoryRoutes.js      # /api/inventory
│
├── .env.example          # Template environment file
├── .env                  # Environment configuration (ignored in git)
├── .gitignore            # Git exclusion rules
├── package.json          # Node dependencies and npm scripts
├── seed.js               # Database seeder with authentic grocery data
└── server.js             # Application entrypoint & HTTP server
```

---

## 4. Setup & Installation

### Step 1: Install Dependencies
Open a terminal in the `backend/` directory:
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=5000
SQLITE_DB_PATH=./data/icart.db
JWT_SECRET=icart_secret_jwt_key_2026_capstone
WEIGHT_TOLERANCE_GRAMS=5
```
The database is a local file; no separate database service is required.

### Step 3: Seed Database
Populate the database with default accounts and 12 sample supermarket items:
```bash
npm run seed
```
This sets up:
* **Admin Account:** `admin@icart.com` / `Admin@12345`
* **Cashier Account:** `cashier@icart.com` / `Cashier@12345`
* **Sample Cart:** `ICART-001` (Active with initial items and ₱500 budget)
* Sample products with realistic barcodes and weights in grams (e.g., Del Monte Pineapple Juice, Pancit Canton, Bear Brand Milk, Piattos, Kopiko, etc.).

### Step 4: Start Server
```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

Server output on startup:
```text
SQLite connected successfully: /path/to/backend/data/icart.db
iCart backend running on port 5000
```

---

## 5. REST API Documentation

### 5.1 Authentication (`/api/auth`)

#### `POST /api/auth/register`
Creates an admin account with `name`, `email`, `phoneNumber`, and `password`. Passwords must contain at least 8 characters, uppercase and lowercase letters, a number, and a special character. The account cannot log in until its email is verified.

#### `POST /api/auth/verify-email`
Verifies a pending admin account with `{ "email": "...", "code": "123456" }`. Codes expire after 10 minutes.

#### `POST /api/auth/resend-verification`
Sends a replacement verification code with `{ "email": "..." }`.

For Gmail delivery over HTTPS, configure `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, and `GMAIL_USER`. The OAuth grant must include `https://www.googleapis.com/auth/gmail.send` and offline access. Gmail API has highest priority and sends from `iCart <GMAIL_USER>`. As fallbacks, configure `RESEND_API_KEY` plus `EMAIL_FROM` for Resend, or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` for SMTP. `EMAIL_TIMEOUT_MS` defaults to 10 seconds. Verification codes are never returned by the API or exposed in the frontend.

#### `POST /api/auth/forgot-password`
Sends a 6-digit password reset code using `{ "email": "...", "role": "admin" }` or role `cashier`. Codes expire after 10 minutes and requests have a 60-second resend cooldown.

#### `POST /api/auth/reset-password`
Resets the password using `{ "email": "...", "role": "admin", "code": "123456", "newPassword": "..." }`. New passwords must meet the same strength rules as account creation.

#### `POST /api/auth/login`
Authenticates an administrator or cashier.
* **Request:**
```json
{
  "email": "admin@icart.com",
  "password": "Admin@12345"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "660c1d...",
    "name": "Admin",
    "email": "admin@icart.com",
    "role": "admin"
  }
}
```

#### `GET /api/auth/me`
* **Headers:** `Authorization: Bearer <token>`
* Returns the current authenticated user's record.

---

### 5.2 Products (`/api/products`)

#### `GET /api/products`
Lists all products. Supports query parameters `?keyword=juice`, `?category=Beverages`, `?active=true`.

#### `GET /api/products/barcode/:barcode`
**Critical Hardware Endpoint for Logicowl OJ-MP6300 scanner.**
* **Example:** `GET /api/products/barcode/4800012345678`
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Product barcode recognized",
  "product": {
    "id": "660c1...",
    "barcode": "4800012345678",
    "name": "Del Monte Pineapple Juice",
    "description": "100% pure pineapple juice with vitamin C (220ml can)",
    "category": "Beverages",
    "price": 45,
    "stock": 25,
    "unit": "can",
    "weight": 240,
    "image": "",
    "isActive": true
  }
}
```

#### `POST /api/products` (Admin Only)
Creates a new product with barcode, price, stock, and expected weight in grams.

#### `PUT /api/products/:id` (Admin Only)
Updates product details.

#### `DELETE /api/products/:id` (Admin Only)
Deletes a product by ID.

---

### 5.3 Shopping Cart (`/api/cart`)

#### `POST /api/cart`
Initializes a new shopping session cart.
* **Request:**
```json
{
  "cartId": "ICART-001",
  "budget": 500
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "cart": {
    "cartId": "ICART-001",
    "status": "ACTIVE",
    "items": [],
    "itemCount": 0,
    "budget": 500,
    "subtotal": 0,
    "total": 0,
    "remainingBudget": 500,
    "budgetStatus": "WITHIN_BUDGET"
  }
}
```

#### `GET /api/cart/:cartId`
Retrieves cart status, items, budget limit, and weight verification summary.

#### `POST /api/cart/:cartId/items`
Adds a product to the cart via barcode scan.
* **Request:**
```json
{
  "barcode": "4800012345678",
  "quantity": 1
}
```
* **Behavior:**
  1. Searches product by barcode.
  2. Verifies `isActive` is true.
  3. Validates available inventory stock.
  4. Calculates line subtotal and sets initial `weightStatus: "PENDING"`.
  5. **Does NOT deduct stock permanently** (deduction is deferred until checkout).
  6. Recalculates cart subtotal, total, and remaining budget.

#### `PUT /api/cart/:cartId/items/:itemId`
Updates item quantity in cart. Validates quantity > 0 and stock availability.

#### `DELETE /api/cart/:cartId/items/:itemId`
Removes an item from the cart and recalculates totals.

#### `PUT /api/cart/:cartId/budget`
Sets or modifies customer budget.
* **Request:** `{ "budget": 600 }`
* **Response:**
```json
{
  "success": true,
  "budget": 600,
  "remainingBudget": 524.50,
  "budgetStatus": "WITHIN_BUDGET"
}
```
* **Status Rules:**
  - `remaining >= 20% of budget` → `WITHIN_BUDGET`
  - `remaining < 20% but >= 0` → `NEAR_LIMIT`
  - `remaining < 0` → `OVER_BUDGET`

---

### 5.4 Weight Verification & Hardware Integration (`HX711`)

#### `POST /api/cart/:cartId/items/:itemId/weight`
Receives measured weight reading from Raspberry Pi HX711 ADC module.
* **Request:**
```json
{
  "verifiedWeight": 238
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Weight verified successfully for \"Del Monte Pineapple Juice\"",
  "verification": {
    "barcode": "4800012345678",
    "name": "Del Monte Pineapple Juice",
    "expectedWeight": 240,
    "verifiedWeight": 238,
    "toleranceGrams": 5,
    "difference": 2,
    "status": "VERIFIED",
    "isVerified": true
  }
}
```

#### `POST /api/cart/:cartId/weight-anomaly`
Invoked when cart scale detects weight change without a barcode scan (Situation B).
* **Request:**
```json
{
  "anomalyWeight": 210,
  "note": "Unscanned object detected on scale"
}
```
* Flags `hasWeightAnomaly: true` on the cart so the cashier kiosk and UI can prompt the user.

#### `POST /api/cart/:cartId/clear-anomaly`
Clears anomaly flag upon cashier inspection or user resolution.

---

### 5.5 Checkout & Transactions (`/api/checkout`)

#### `POST /api/checkout/:cartId/request-cashier`
Transitions cart status to `WAITING_FOR_CASHIER` for cash payments or cashier review.

#### `POST /api/checkout/:cartId`
Completes the transaction:
1. Re-verifies inventory availability for all cart items.
2. **Deducts inventory stock permanently** from each product in SQLite.
3. Creates a `Transaction` audit record with unique `transactionId` (e.g., `TXN-20260928-4821`).
4. Updates cart status to `COMPLETED`.
5. Returns finalized receipt breakdown.

* **Request:**
```json
{
  "paymentMethod": "CASH",
  "discount": 0,
  "cashierId": "CASHIER-STATION-1",
  "cashierNotes": "Paid in cash"
}
```

#### `GET /api/checkout/transactions`
Retrieves past transactions for reporting and auditing.

---

### 5.6 Inventory Management (`/api/inventory`)

#### `GET /api/inventory`
Overview of all items with stock flags: `IN_STOCK`, `LOW_STOCK` (<= 5), `OUT_OF_STOCK` (0).

#### `GET /api/inventory/low-stock?threshold=5`
Returns list of products currently at or below the restock threshold.

#### `PUT /api/inventory/:productId/stock` (Admin Only)
Adjusts inventory count.
* **Request:**
```json
{
  "action": "add",
  "quantity": 15,
  "reason": "Supplier delivery batch #882"
}
```
* Allowed actions: `"add"`, `"subtract"`, `"set"`. Validates that stock never drops below 0.

---

## 6. Hardware Connection Blueprint

### 6.1 Logicowl OJ-MP6300 2D USB Barcode Scanner
* Connects to Raspberry Pi 3B via USB (acts as USB HID Keyboard or CDC Virtual COM port).
* When a barcode is read (e.g. `4800012345678`):
  1. Pi script receives barcode string.
  2. Pi sends `POST /api/cart/:cartId/items` with `{ barcode, quantity: 1 }`.
  3. Backend responds with expected weight (e.g., 240g).

### 6.2 HX711 Load Cell Array (4x Load Cells)
* 4 strain gauge load cells located under cart basket connect to an HX711 amplifier on GPIO pins (DT / SCK).
* **Calibration:** Pi scales raw ADC counts to grams: `weight_grams = (raw_value - tare_offset) / scale_ratio`.
* **Verification Algorithm:**
  1. Measure previous stable weight $W_{prev}$.
  2. After barcode scan, monitor for weight increase $\Delta W = W_{current} - W_{prev}$.
  3. Send verified weight to `POST /api/cart/:cartId/items/:itemId/weight`.
  4. Backend verifies $|\Delta W - \text{Expected}| \le 5\text{g}$.

### 6.3 Anti-Theft & Fraud Scenarios

| Scenario | What Happens | System Action |
|---|---|---|
| **Situation A:** Scanned but NOT placed | Barcode scanned, but load cell detects no weight increase within timeout | Item stays `PENDING` or marks `MISMATCH`. Cart alerts user before checkout. |
| **Situation B:** Placed but NOT scanned | Load cell detects +weight without a corresponding barcode scan | Pi triggers `POST /api/cart/:cartId/weight-anomaly`. UI prompts: *"Unscanned item detected"*. |

---

## 7. Next Steps for Phase 3
In Phase 3, the React frontend located in `/src` will be configured to point to this backend API via Vite proxy (`/api` -> `http://localhost:5000/api`) or direct API client services.
