# Local Authority Analytics Feature - Implementation Guide

## Overview
A comprehensive analytics dashboard has been created for local authorities to track complaints, campaigns, and their impact across their division. The feature automatically filters data by the logged-in local authority's division.

## Files Created

### 1. **local-analytics.html** 
   - Main analytics page with responsive design
   - Includes 8 statistical cards for key metrics
   - 8 interactive Chart.js visualizations
   - Action buttons for exporting reports and navigation
   - Logout modal and toast notifications

### 2. **local-analytics.css**
   - Matches the local authority theme (beige/blue color scheme)
   - Uses CSS variables for consistent styling: `--sand`, `--terra`, `--paper`, `--mint`, `--ink`
   - Responsive design with breakpoints for tablets and mobile
   - Card-based layout with shadows and hover effects
   - Chart containers with flexible sizing

### 3. **local-analytics.js**
   - Fetches complaints and campaigns from the backend
   - Automatically detects the logged-in local authority's division
   - Filters data by division before displaying
   - Generates 8 different Chart.js visualizations:
     - Complaints by Status (doughnut chart)
     - Complaints by Category (bar chart)
     - Campaigns by Status (doughnut chart)
     - Campaigns by Target Gender (bar chart)
     - Top 5 Areas with Complaints (list)
     - Top 5 Complaint Categories (list)
     - Complaints Timeline (12-month line chart)
     - Campaign Timeline (12-month line chart)
   - PDF export functionality using jsPDF
   - Session management and logout functionality

## Features

### Key Metrics Displayed
- **Complaint Statistics**: Total, Pending, In Progress, Resolved
- **Campaign Statistics**: Total, Active, Completed, Areas Covered

### Chart Visualizations
1. **Complaint Status Distribution** - Shows proportion of complaints by status
2. **Complaint Categories** - Bar chart of complaint types received
3. **Campaign Status Overview** - Doughnut chart of campaign statuses
4. **Campaign Target Gender** - Distribution of campaigns by target gender
5. **Top Areas** - Identifies slum areas with most complaints
6. **Top Categories** - Most common complaint categories
7. **Complaint Timeline** - Trend of complaints over 12 months
8. **Campaign Timeline** - Trend of campaigns over 12 months

### Additional Features
- **Automatic Division Filtering**: Extracts division from local authority org_name (e.g., "Dhaka Local Authority" → "Dhaka")
- **PDF Report Export**: Downloads comprehensive analytics report with statistics and charts
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Toast Notifications**: User-friendly feedback messages
- **Theme Consistency**: Matches existing local authority pages' visual design

## How It Works

### Data Flow
1. User logs in as Local Authority
2. Session is stored in `localStorage["SLUMLINK_SESSION"]`
3. Analytics page reads org_id from session
4. Extracts division from organization name (e.g., "Dhaka Local Authority" → "Dhaka")
5. Fetches all complaints from `/api/complaint`
6. Fetches all campaigns from `/api/campaigns`
7. Filters both by matching `division` field
8. Generates charts and displays statistics

### Division Detection
The system extracts division names from local authority organization names:
- "Dhaka Local Authority" → "Dhaka"
- "Chattogram Local Authority" → "Chattogram"
- "Khulna Local Authority" → "Khulna"
- etc.

This extraction happens automatically in the `extractDivisionFromName()` function.

## Integration Points

### Navigation
- Added link in `local-dashboard.js`: The "Analytics Dashboard" quick action button now navigates to `./local-analytics.html`

### API Endpoints Used
- `GET /api/complaint` - Fetches all complaints with division field
- `GET /api/campaigns` - Fetches all campaigns with division field
- `GET /api/ngo/:orgId` - Fetches organization details if needed (fallback)

### Session Storage
Reads from: `localStorage["SLUMLINK_SESSION"]`
Expected structure:
```json
{
  "org_id": 1001,
  "org_name": "Dhaka Local Authority",
  ...other fields
}
```

## Color Scheme
The analytics page uses the local authority theme:
- **Primary Colors**:
  - Sand: `#CBB093`
  - Terra: `#A4624D`
  - Paper: `#FFF4E6`
  - Mint: `#C0E0D0`
  - Ink: `#613729`

- **Chart Colors**:
  - Status charts: Red, Yellow, Green (for pending, in-progress, resolved)
  - Category charts: Brown/tan gradients
  - Timeline charts: Blue and red for trends

## PDF Export
The export functionality generates a professional PDF report including:
- Report title and division name
- Generation date and time
- Complaint statistics
- Campaign statistics
- Ready to share with stakeholders

## Usage Instructions for Local Authority Users

1. **Access Analytics**: Click "Analytics Dashboard" button from the local authority dashboard
2. **View Metrics**: Review the 8 statistical cards at the top
3. **Analyze Charts**: Study the various visualization charts to understand:
   - Complaint patterns by status and category
   - Campaign distribution and timeline
   - High-complaint areas that need attention
4. **Export Report**: Click "Export Report" to download a PDF summary
5. **Navigate Back**: Click "Back to Dashboard" to return to the main dashboard

## Technical Details

### Chart.js Configuration
- Type: Default Chart.js 4.4.1 from CDN
- Responsive: All charts are fully responsive
- Animations: Smooth transitions with cubic-bezier easing
- Legend: Positioned at bottom for better UX

### Data Filtering Logic
```javascript
// Filter by division
complaintData = (complaintsData.data || []).filter(c => c.division === division);
campaignData = (campaignsData.data || []).filter(c => c.division === division);
```

### Error Handling
- Session validation on page load
- Graceful fallback if org details can't be fetched
- Toast notifications for all user actions
- Console logging for debugging

## Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design adapts to all screen sizes

## Future Enhancements (Optional)
- Date range filtering
- Drill-down into specific complaint details
- Team member assignment tracking
- Resolution time analytics
- Budget vs. actual impact comparison
- Predictive analytics for complaint trends
