# Division-Based Filtering for Local Authorities

## Overview
Local authorities can now only view complaints from their assigned division. When a local authority signs in with their email, the system automatically filters all complaints to show only those from slum dwellers in their division.

## Email to Division Mapping

| Email | Division | Org ID | Organization Name |
|-------|----------|--------|-------------------|
| `dhaka@gov.bd` | Dhaka | 1001 | Dhaka City Corporation |
| `chattogram@gov.bd` | Chattogram | 1002 | Chattogram City Corporation |
| `khulna@gov.bd` | Khulna | 1003 | Khulna City Corporation |
| `rajshahi@gov.bd` | Rajshahi | 1004 | Rajshahi City Corporation |
| `barishal@gov.bd` | Barishal | 1005 | Barishal City Corporation |
| `sylhet@gov.bd` | Sylhet | 1006 | Sylhet City Corporation |
| `rangpur@gov.bd` | Rangpur | 1007 | Rangpur City Corporation |
| `mymensingh@gov.bd` | Mymensingh | 1008 | Mymensingh City Corporation |

## How It Works

### 1. **Sign-In Process**
When a local authority signs in:
- The frontend validates their email and password
- Upon successful authentication, the session is stored in `localStorage.SLUMLINK_SESSION`
- The session now includes the `division` field from the email-to-division mapping

```javascript
// Example session stored in localStorage
{
  "role": "localauthority",
  "org_id": 1001,
  "org_type": "localauthority",
  "org_name": "Dhaka City Corporation",
  "email": "dhaka@gov.bd",
  "division": "Dhaka"
}
```

### 2. **Complaint Category Filtering** (`complaintcategory.html`)
When viewing complaint categories:
- The page reads the `division` from the logged-in session
- Complaint counts are fetched with the division parameter: `/api/complaints/counts?division=Dhaka`
- Only shows categories with complaints from that division

### 3. **Complaint List Filtering** (`complaints.html`)
When viewing complaints by category:
- The page passes both `category` and `division` parameters to the API
- API call: `/api/complaints?category=Water%20Supply&division=Dhaka`
- Only complaints from slum dwellers in that division are displayed

### 4. **Backend Endpoints**

#### `/api/complaints/counts`
**Query Parameters:**
- `division` (optional): Filter by division

**Example:**
```bash
GET /api/complaints/counts?division=Dhaka
```

**Response:**
```json
{
  "categories": {
    "Water Supply": 5,
    "Sanitation": 3,
    "Electricity": 2
  },
  "pendingCount": 6
}
```

#### `/api/complaints`
**Query Parameters:**
- `category` (required): Complaint category
- `division` (optional): Filter by division

**Example:**
```bash
GET /api/complaints?category=Water%20Supply&division=Dhaka
```

## Testing Instructions

### Prerequisites
1. Start XAMPP (Apache + MySQL)
2. Ensure the SlumLink database is created
3. Run: `cd backend && npm start` to start the backend server
4. Open the application at `http://localhost:5001`

### Test Case 1: Dhaka Authority
1. Navigate to Sign In page (`/src/signin.html`)
2. Select role: **Local Authority**
3. Enter email: `dhaka@gov.bd`
4. Enter password: `dhakaslum123`
5. Click Sign In
6. You should be directed to the local authority dashboard
7. Click **View Complaints** → Should see categories with counts from Dhaka division only
8. Click on a category → Should see only complaints from Dhaka slum dwellers

### Test Case 2: Chattogram Authority
1. Navigate to Sign In page
2. Select role: **Local Authority**
3. Enter email: `chattogram@gov.bd`
4. Enter password: `chattogramslum123`
5. Click Sign In
6. Verify that you only see complaints from Chattogram division

### Test Case 3: Verify Division Data in Database
Run this SQL query to verify complaints are properly associated with divisions:

```sql
SELECT division, COUNT(*) AS complaint_count 
FROM complaints 
GROUP BY division 
ORDER BY division;
```

Expected output should show complaints distributed across divisions (Dhaka, Chattogram, Khulna, etc.)

### Test Case 4: Verify No Cross-Division Visibility
1. Sign in as `dhaka@gov.bd`
2. Count visible complaints manually (e.g., 5 complaints)
3. Sign out and sign in as `chattogram@gov.bd`
4. Count visible complaints (should be different)
5. Both should show different complaints from their respective divisions

## Files Modified

### Frontend
- **`src/signin-script.js`**
  - Added `division` field to `localAuthorityMeta` mapping
  - Updated `setSession()` call to include division in localStorage

- **`src/localauthority/complaintcategory.html`**
  - Updated `fetchComplaintCounts()` to read division from localStorage
  - Passes division as query parameter to `/api/complaints/counts`

- **`src/localauthority/complaints.html`**
  - Updated `fetchComplaints()` to read division from localStorage
  - Passes division as query parameter to `/api/complaints`

### Backend
- **`backend/controllers/complaintController.js`**
  - Updated `getComplaintCounts()` to accept and filter by `division` query parameter
  - Updated `getComplaintsByCategory()` to accept and filter by `division` query parameter

## Security Notes

1. **Client-Side Division Storage**: The division is stored in `localStorage`, which is sufficient for UI filtering since it's derived from the authenticated session
2. **Server-Side Validation**: The backend filters are optional (`?division=Dhaka`) to maintain backward compatibility, but frontend always sends it
3. **Database Integrity**: The division filter works because complaints are already stored with `division` field from the slum dweller's profile

## Troubleshooting

### Issue: "No complaints found" for a division
**Solution**: 
- Verify that complaints exist for that division in the database:
  ```sql
  SELECT * FROM complaints WHERE division = 'Dhaka' LIMIT 5;
  ```
- Check that slum dwellers in that division have the correct `division` field set

### Issue: All authorities see same complaints
**Solution**:
- Clear browser localStorage: `localStorage.clear()`
- Sign out and sign back in
- Check that the `division` field is actually stored in the session:
  ```javascript
  console.log(JSON.parse(localStorage.getItem('SLUMLINK_SESSION')));
  ```

### Issue: API returns "Database error"
**Solution**:
- Check backend logs for SQL errors
- Verify database connection is working
- Ensure the `complaints` table has the `division` column

## Future Enhancements

1. **API Authentication**: Add token-based authentication to verify the user's division server-side
2. **Additional Filters**: Add ability to filter by date range, status, or specific slum area
3. **Permissions Middleware**: Create middleware to enforce division-based access on all endpoints
4. **Analytics Dashboard**: Show division-specific statistics and reports

---

**Last Updated**: February 19, 2026  
**Version**: 1.0
