# 📋 Summary: Income & Outcome Transaction Role-Based Creation

## ✅ Changes Completed

### 1. Created Service Interfaces

**New Files Created:**
- `IncomeTransactionServiceInterface.java`
- `OutcomeTransactionServiceInterface.java`

**Purpose:** Proper service layer architecture with interface-implementation pattern.

---

### 2. Updated IncomeTransactionService

**File:** `IncomeTransactionService.java`

**Changes:**
1. ✅ Implements `IncomeTransactionServiceInterface`
2. ✅ Added dependencies:
   - `RoleMemberShipRepository`
   - `ClubMemberShipRepository`
   - `SemesterRepository`
3. ✅ Updated `createIncomeTransaction()` method:
   - Checks if user has **CLUB_OFFICER** role in the club
   - If **CLUB_OFFICER**: 
     - Status = `SUCCESS` (auto-approved)
     - Wallet balance updated immediately
     - No need for approval
   - If **CLUB_TREASURER** or other roles:
     - Status = `PENDING`
     - Requires approval from admin
     - Wallet balance NOT updated until approved
4. ✅ Added `hasClubOfficerRole()` helper method

**Logic Flow:**
```java
User creates income transaction
    ↓
Check user's role in club (current semester)
    ↓
    ├─→ CLUB_OFFICER role?
    │   ├─→ YES: status = SUCCESS
    │   │         balance += amount
    │   │         totalIncome += amount
    │   │         ✅ Auto-approved
    │   └─→ NO:  status = PENDING
    │            balance unchanged
    │            ⏳ Needs approval
```

---

### 3. Updated OutcomeTransactionService

**File:** `OutcomeTransactionService.java`

**Changes:**
1. ✅ Implements `OutcomeTransactionServiceInterface`
2. ✅ Added dependencies:
   - `RoleMemberShipRepository`
   - `ClubMemberShipRepository`
   - `SemesterRepository`
3. ✅ Updated `createOutcomeTransaction()` method:
   - Checks if user has **CLUB_OFFICER** role in the club
   - If **CLUB_OFFICER**:
     - Status = `SUCCESS` (auto-approved)
     - Wallet balance updated immediately (deducted)
     - Checks sufficient balance before deducting
     - No need for approval
   - If **CLUB_TREASURER** or other roles:
     - Status = `PENDING`
     - Requires approval
     - Wallet balance NOT updated until approved
4. ✅ Added `hasClubOfficerRole()` helper method

**Logic Flow:**
```java
User creates outcome transaction
    ↓
Check user's role in club (current semester)
    ↓
    ├─→ CLUB_OFFICER role?
    │   ├─→ YES: Check sufficient balance
    │   │         ├─→ Sufficient: status = SUCCESS
    │   │         │                balance -= amount
    │   │         │                totalOutcome += amount
    │   │         │                ✅ Auto-approved
    │   │         └─→ Insufficient: ❌ Throw error
    │   └─→ NO:  status = PENDING
    │            balance unchanged
    │            ⏳ Needs approval
```

---

## 🔍 Role Detection Logic

### `hasClubOfficerRole(userId, clubId)`

**Steps:**
1. Find user's `ClubMemberShip` in the club
2. Check if membership status is `ACTIVE`
3. Get current semester (where `isCurrent = true`)
4. Find user's `RoleMemberShip` records in current semester
5. Check if any role has:
   - `isActive = true`
   - `clubRole.roleCode = "CLUB_OFFICER"`

**Returns:**
- `true` → User is CLUB_OFFICER → Auto-approve transactions
- `false` → User is CLUB_TREASURER or other → Need approval

---

## 📊 Role Comparison

| Role | Role Code | Create Income | Create Outcome | Approval Required |
|------|-----------|--------------|----------------|-------------------|
| **CLUB_OFFICER** | `CLUB_OFFICER` | ✅ Auto-approved (SUCCESS) | ✅ Auto-approved (SUCCESS) | ❌ No |
| **CLUB_TREASURER** | `CLUB_TREASURER` | ⏳ Pending approval | ⏳ Pending approval | ✅ Yes |
| **Other roles** | Various | ⏳ Pending approval | ⏳ Pending approval | ✅ Yes |

---

## 🔄 Complete Transaction Flow

### Income Transaction Flow

```
1. Create (POST /api/clubs/{clubId}/transactions/income)
   │
   ├─→ CLUB_OFFICER:
   │   - Status: SUCCESS
   │   - Balance: +amount (immediate)
   │   - Log: "auto-approved by CLUB_OFFICER"
   │
   └─→ CLUB_TREASURER/Others:
       - Status: PENDING
       - Balance: unchanged
       - Log: "created with PENDING status"
       - Needs: Admin approval

2. Approve (if PENDING) (POST /{id}/approve)
   - Status: PENDING → SUCCESS
   - Balance: +amount
   - Log: "approved"

3. Reject (if PENDING) (POST /{id}/reject)
   - Status: PENDING → CANCELLED
   - Balance: unchanged
   - Log: "rejected"
```

### Outcome Transaction Flow

```
1. Create (POST /api/clubs/{clubId}/transactions/outcome)
   │
   ├─→ CLUB_OFFICER:
   │   - Check: balance >= amount?
   │   │  ├─→ Yes: Status: SUCCESS
   │   │  │        Balance: -amount (immediate)
   │   │  │        Log: "auto-approved by CLUB_OFFICER"
   │   │  └─→ No:  Error: INSUFFICIENT_WALLET_BALANCE
   │
   └─→ CLUB_TREASURER/Others:
       - Status: PENDING
       - Balance: unchanged
       - Log: "created with PENDING status"
       - Needs: Admin approval

2. Approve (if PENDING) (POST /{id}/approve)
   - Check: balance >= amount?
   - Status: PENDING → SUCCESS
   - Balance: -amount
   - Log: "approved"

3. Reject (if PENDING) (POST /{id}/reject)
   - Status: PENDING → CANCELLED
   - Balance: unchanged
   - Log: "rejected"
```

---

## 🎯 Key Points

### ✅ Benefits

1. **Security**: Only CLUB_OFFICER can auto-approve transactions
2. **Audit Trail**: All transactions have `createdBy` field tracking who created them
3. **Flexibility**: CLUB_TREASURER can create transactions but need approval
4. **Balance Safety**: Wallet balance only updated after approval (or auto-approval for CLUB_OFFICER)
5. **Clear Separation**: Different behavior based on user role

### ⚠️ Important Notes

1. **Role Check**: Based on current semester's `RoleMemberShip`
2. **Active Status**: Only `isActive = true` roles are checked
3. **Role Code**: Must match exactly `"CLUB_OFFICER"` (case-insensitive)
4. **Membership Status**: User must have `ACTIVE` club membership
5. **Current Semester**: System uses semester where `isCurrent = true`

---

## 📝 Database Impact

### Transaction Status Values

| Status | Description | When Set |
|--------|-------------|----------|
| `PENDING` | Waiting for approval | Created by CLUB_TREASURER or others |
| `SUCCESS` | Approved and executed | Auto-approved (CLUB_OFFICER) or manually approved |
| `CANCELLED` | Rejected | Admin rejects pending transaction |
| `PROCESSING` | Payment in progress | Used by PayOS integration |
| `FAILED` | Payment failed | Used by PayOS integration |
| `REFUNDED` | Money returned | Used for refund operations |

### ClubWallet Updates

**Income Transaction:**
```sql
-- When approved (or auto-approved)
UPDATE club_wallets SET
  balance = balance + transaction.amount,
  total_income = total_income + transaction.amount
WHERE id = club_wallet_id;
```

**Outcome Transaction:**
```sql
-- When approved (or auto-approved)
UPDATE club_wallets SET
  balance = balance - transaction.amount,
  total_outcome = total_outcome + transaction.amount
WHERE id = club_wallet_id;
```

---

## 🔍 Testing Scenarios

### Test Case 1: CLUB_OFFICER Creates Income

```
Given: User has CLUB_OFFICER role in Club A
When: User creates income transaction of 100,000 VND
Then: 
  - Transaction status = SUCCESS
  - ClubWallet.balance increased by 100,000
  - ClubWallet.totalIncome increased by 100,000
  - No approval needed
```

### Test Case 2: CLUB_TREASURER Creates Income

```
Given: User has CLUB_TREASURER role in Club A
When: User creates income transaction of 100,000 VND
Then:
  - Transaction status = PENDING
  - ClubWallet.balance unchanged
  - ClubWallet.totalIncome unchanged
  - Needs admin approval
```

### Test Case 3: CLUB_OFFICER Creates Outcome (Sufficient Balance)

```
Given: User has CLUB_OFFICER role in Club A
  And: ClubWallet.balance = 500,000
When: User creates outcome transaction of 100,000 VND
Then:
  - Transaction status = SUCCESS
  - ClubWallet.balance decreased by 100,000
  - ClubWallet.totalOutcome increased by 100,000
  - No approval needed
```

### Test Case 4: CLUB_OFFICER Creates Outcome (Insufficient Balance)

```
Given: User has CLUB_OFFICER role in Club A
  And: ClubWallet.balance = 50,000
When: User creates outcome transaction of 100,000 VND
Then:
  - Error: INSUFFICIENT_WALLET_BALANCE
  - Transaction NOT created
  - ClubWallet unchanged
```

### Test Case 5: CLUB_TREASURER Creates Outcome

```
Given: User has CLUB_TREASURER role in Club A
When: User creates outcome transaction of 100,000 VND
Then:
  - Transaction status = PENDING
  - ClubWallet.balance unchanged
  - ClubWallet.totalOutcome unchanged
  - Needs admin approval
```

---

## 🚀 API Endpoints

No changes to API endpoints. Behavior changes based on user role:

**Income Transactions:**
- `POST /api/clubs/{clubId}/transactions/income` - Create (status depends on role)
- `POST /api/clubs/{clubId}/transactions/income/{id}/approve` - Approve (PENDING → SUCCESS)
- `POST /api/clubs/{clubId}/transactions/income/{id}/reject` - Reject (PENDING → CANCELLED)

**Outcome Transactions:**
- `POST /api/clubs/{clubId}/transactions/outcome` - Create (status depends on role)
- `POST /api/clubs/{clubId}/transactions/outcome/{id}/approve` - Approve (PENDING → SUCCESS)
- `POST /api/clubs/{clubId}/transactions/outcome/{id}/reject` - Reject (PENDING → CANCELLED)

---

## ✅ Implementation Complete

All changes have been implemented successfully:

1. ✅ Service interfaces created
2. ✅ Role-based transaction creation logic added
3. ✅ Auto-approval for CLUB_OFFICER implemented
4. ✅ Pending status for CLUB_TREASURER maintained
5. ✅ Wallet balance updates handled correctly
6. ✅ Sufficient balance check for outcome transactions
7. ✅ Audit logging added

**No breaking changes to existing APIs!** 🎉

