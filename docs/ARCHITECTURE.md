# SmartHostel – Architecture & API Contract

This document is the single source of truth shared by `frontend-next` (primary backend + student/warden portals) and `admin-react` (Vite admin SPA).

## 1. System overview

```
 Browser (student/warden)          Browser (admin/org-admin)
        |                                   |
  Next.js pages (SSR/CSR)            React + Vite SPA
        \                                   /
         \------ same-origin / CORS ------/
                       |
        Next.js Route Handlers  (/api/*)
          - auth (JWT in httpOnly cookie)
          - RBAC + tenant isolation (server side)
          - business logic (lib/services)
                       |
              MongoDB Atlas (Mongoose)
        Razorpay (orders, verify, webhook) | Cloudinary (uploads)
```

There is exactly one backend: the Next.js app. The admin SPA calls it with `withCredentials` and a JWT bearer fallback.

## 2. Roles and tenancy

Roles: `SUPER_ADMIN` (platform owner, manages organizations/subscriptions), `ADMIN` (organization admin), `WARDEN`, `STUDENT`.

- Every tenant-owned document carries `organization: ObjectId`.
- `lib/auth/guard.ts` exposes `requireAuth(req, roles[])` returning `{ userId, role, organizationId }`.
- All queries go through `scoped(orgId, filter)` helpers; the organization is **always taken from the session**, never from the request body/query.
- Wardens are further restricted to hostels in `Warden.hostels`.
- Students are restricted to their own records.

## 3. Data model (Mongoose)

Organization, User, Student, Warden, Hostel, Building, Floor, Room, Bed, RoomAllocation, AdmissionApplication, FeeStructure, StudentFee, Payment, Attendance, Complaint, LeaveRequest, Visitor, Notice, Inventory, Expense, Subscription, Notification, AuditLog.

Key relations: Organization 1-* Hostel 1-* Building 1-* Floor 1-* Room 1-* Bed; Bed 1-* RoomAllocation (at most one `ACTIVE`, enforced by a partial unique index); Student 1-* StudentFee 1-* Payment.

## 4. Allocation engine invariants

- Bed has `status: AVAILABLE | OCCUPIED | MAINTENANCE`.
- Allocation = atomic `findOneAndUpdate({_id, status:'AVAILABLE'}, {status:'OCCUPIED'})` inside a transaction together with creating the `RoomAllocation`.
- Partial unique indexes: one ACTIVE allocation per student, one ACTIVE per bed.
- Transfer = release old bed + occupy new bed in one transaction.
- Eligibility: hostel gender must match student gender (or hostel type `CO_ED`).

## 5. Payments

1. `POST /api/payments/create-order` – server creates Razorpay order for a `StudentFee`, stores `Payment{status:CREATED}`.
2. Client opens Razorpay Checkout.
3. `POST /api/payments/verify` – server verifies HMAC SHA256 signature, marks `PAID` idempotently.
4. `POST /api/payments/webhook` – verifies `X-Razorpay-Signature` on the raw body; idempotent on `razorpayPaymentId`.

Frontend success is never trusted.

## 6. API

All responses: `{ success: boolean, data?: any, error?: string, meta?: {page,limit,total} }`.

| Area | Endpoints |
|---|---|
| Auth | POST register, login, logout; GET me; POST forgot-password, reset-password, verify-email |
| Students | GET/POST /api/students; GET/PATCH/DELETE /api/students/[id] |
| Hostels | GET/POST /api/hostels; GET/PATCH/DELETE /api/hostels/[id] |
| Buildings / Floors | GET/POST /api/buildings, /api/floors |
| Rooms / Beds | GET/POST /api/rooms; PATCH/DELETE /api/rooms/[id]; GET /api/beds |
| Allocations | GET/POST /api/allocations; PATCH /api/allocations/[id] (checkout, transfer); GET /api/allocations/suggest |
| Admissions | GET/POST /api/admissions; PATCH /api/admissions/[id] |
| Fees | GET/POST /api/fee-structures; GET/POST /api/fees; POST /api/fees/generate |
| Payments | create-order, verify, webhook, history, refund |
| Attendance | GET/POST /api/attendance |
| Complaints | GET/POST /api/complaints; PATCH /api/complaints/[id] |
| Leave | GET/POST /api/leave; PATCH /api/leave/[id] |
| Visitors | GET/POST /api/visitors; PATCH /api/visitors/[id] |
| Notices | GET/POST /api/notices |
| Inventory / Expenses | GET/POST /api/inventory, /api/expenses |
| Admin | GET /api/admin/dashboard, reports, revenue, users |
| Subscriptions | GET/POST /api/subscriptions |
| Uploads | POST /api/upload (Cloudinary signed) |

## 7. Security

bcrypt (cost 12), JWT in httpOnly+Secure+SameSite cookie, zod validation, in-memory/Upstash-style rate limiter, audit logging on mutations, safe error messages, Razorpay/Cloudinary secrets server only.
