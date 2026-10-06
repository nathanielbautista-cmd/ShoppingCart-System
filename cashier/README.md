# iCart Cashier Frontend

Separate desktop/laptop application for cashier workstations. It uses the same
iCart backend and MongoDB database as the customer kiosk.

## Run

Start the backend first:

```bash
cd ../backend
npm run dev
```

Then start the cashier app in another terminal:

```bash
cd cashier
npm install
npm run dev
```

Open the URL shown by Vite (normally `http://localhost:3001`).

Seed/demo cashier account: `cashier@icart.com` / `password`.

## Flow

Customer checkout changes a cart to `WAITING_FOR_CASHIER`. The cashier queue
polls the protected `/api/cashier/carts/waiting` endpoint every five seconds.
The cashier reviews the cart, records a cash amount, and only then completes
the transaction. The backend validates the amount, decrements inventory,
stores payment/change data, and changes the cart to `COMPLETED`.
