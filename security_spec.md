# Security Specification — StarkLaBs 3D Store (`security_spec.md`)

## 1. Data Invariants

1. **Identity & Verification Invariant**: Every write operation (`create`, `update`, `delete`) requires an authenticated user with `request.auth.token.email_verified == true`.
2. **Admin Exclusive Catalog Control**: Only the verified store admin (`ah2005211@gmail.com` with `email_verified == true` or a document in `/admins/{uid}`) can create, update, or delete documents in `/products/{productId}`.
3. **Order Ownership & PII Isolation**: An `/orders/{orderId}` document contains customer PII (`customerName`, `customerEmail`, `customerPhone`, `shippingAddress`). It can only be created when `incoming().customerId == request.auth.uid`, and can only be read (`get` or `list`) by its owner (`resource.data.customerId == request.auth.uid`) or the verified admin.
4. **Strict Schema & Volumetric Bounds**: All strings and arrays are strictly bounded by `.size()` checks matching `firebase-blueprint.json`. All document IDs match `^[a-zA-Z0-9_\-]+$` and `.size() <= 128`.
5. **Temporal & Immutable Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on updates. `updatedAt` must equal `request.time` on both creation and updates. `authorId` (on products), `customerId` / `orderNumber` (on orders), and `userId` / `productId` (on reviews) are immutable after creation.
6. **Terminal State Locking**: Once an order reaches a terminal status (`مكتمل` or `ملغي`), non-admin users cannot mutate it further; only `isAdmin()` can override terminal states.
7. **Product Reviews Integrity**: `/reviews/{reviewId}` stores public ratings (`1..5`) and comments without PII. Creation requires `isVerifiedUser()`, `isValidReview(incoming())`, and `incoming().userId == request.auth.uid`. Updates/deletes are restricted to the review author (`isOwner(existing().userId)`) or `isAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unverified Admin Spoof (`products` create)**: `{ "authorId": "attacker", ... }` with `email == "ah2005211@gmail.com"` but `email_verified == false` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection (`products` create)**: Valid product payload + `"isSuperFeatured": true` -> Rejected by `data.keys().hasOnly(...)` -> `PERMISSION_DENIED`.
3. **ID Poisoning (`orders` create)**: Document ID with 300 characters or slash/special characters -> Rejected by `isValidId(orderId)` -> `PERMISSION_DENIED`.
4. **Identity Spoofing (`orders` create)**: Authenticated user `uid_A` creates an order with `"customerId": "uid_B"` -> Rejected by `data.customerId == request.auth.uid` -> `PERMISSION_DENIED`.
5. **Timestamp Forgery (`orders` create)**: Client supplies a past/future `createdAt` timestamp instead of `request.time` -> Rejected by `data.createdAt == request.time` -> `PERMISSION_DENIED`.
6. **PII Horizontal Privilege Escalation (`orders` get)**: Authenticated user `uid_B` attempts `get(/orders/order_of_uid_A)` -> Rejected by `isOwner(existing().customerId) || isAdmin()` -> `PERMISSION_DENIED`.
7. **Unbounded List Scraping (`orders` list)**: Authenticated user `uid_B` runs an unfiltered collection query on `/orders` -> Rejected by `resource.data.customerId == request.auth.uid || isBootstrappedAdmin()` -> `PERMISSION_DENIED`.
8. **Array Exhaustion (`products` create)**: Admin sends `colors` array with 50 items -> Rejected by `data.colors.size() <= 8` -> `PERMISSION_DENIED`.
9. **Price Manipulation on Order Update (`orders` update)**: Customer attempts to update `totalAmount` to `1` on an existing order -> Rejected by `affectedKeys().hasOnly(...)` and role check -> `PERMISSION_DENIED`.
10. **Immutable Field Mutation (`orders` update)**: Attempting to mutate `createdAt` or `customerId` during an update -> Rejected by immutability guards -> `PERMISSION_DENIED`.
11. **Terminal State Bypass (`orders` update)**: Customer attempts to modify an order whose existing `status` is `'مكتمل'` or `'ملغي'` -> Rejected by terminal state lock -> `PERMISSION_DENIED`.
12. **Value Poisoning on Update (`products` update)**: Updating a whitelisted key (`price`) with a string `"free"` instead of a valid non-negative number -> Rejected by `isValidProduct(incoming())` wrapper on update -> `PERMISSION_DENIED`.
