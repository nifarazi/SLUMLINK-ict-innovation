# NGO Analytics Feature Documentation

## Overview

A comprehensive analytics dashboard for NGOs to track their campaigns and aid distribution impact. The feature displays visual charts, statistics, and detailed reports similar to the admin analytics system.

## Features

### 1. **Analytics Overview Page** (`ngo-analytics-overview.html`)
   - **Purpose**: Main analytics dashboard showing NGO's overall performance
   - **Key Statistics**:
     - Total campaigns created
     - Active campaigns (pending + in_progress)
     - Total families/dwellers helped
     - Total aid units distributed
   
   - **Visual Charts**:
     - Campaign Status Distribution (Doughnut chart) - Shows breakdown of pending, in_progress, completed, not_executed, and cancelled campaigns
     - Campaigns by Category (Bar chart) - Displays number of campaigns in each category
     - Aid Distribution by Type (Bar chart) - Shows quantity of each aid type distributed
     - Monthly Trend (Line chart) - Compares current month vs previous month aid distribution
   
   - **Data Table**: Lists active and pending campaigns with details like title, category, location, dates, and status

### 2. **Analytics Detail Report Page** (`ngo-analytics-detail.html`)
   - **Purpose**: Comprehensive detailed report with extended views and export capability
   - **Key Metrics Cards**: Shows all four main statistics with larger numbers
   - **Charts**: All charts from overview plus enhanced layout
   - **Tables**:
     - Recent Campaigns Table (top 10)
     - Distribution Summary Table - Shows each aid type with quantity and percentage
   - **PDF Export**: Generates a professional PDF report with all analytics data

## Technical Implementation

### Frontend Files Created

1. **`src/ngo/ngo-analytics-overview.html`**
   - Contains HTML structure for the overview dashboard
   - Embedded CSS for styling (matches NGO dashboard design)
   - Responsive layout with mobile support
   
2. **`src/ngo/ngo-analytics-overview.js`**
   - Fetches analytics data from `/api/ngo/analytics` endpoint
   - Manages Chart.js instances for all visualizations
   - Populates statistics cards and tables
   - Session management to retrieve current NGO's ID

3. **`src/ngo/ngo-analytics-detail.html`**
   - Detailed report view with more comprehensive data
   - Professional layout optimized for PDF export
   - PDF export buttons implemented

4. **`src/ngo/ngo-analytics-detail.js`**
   - Enhanced analytics rendering
   - PDF generation using jsPDF library
   - Detailed table population
   - Error handling with user-friendly messages

### Backend Integration

**Endpoint Used**: `GET /api/ngo/analytics?orgId=<org_id>`

**Response Data Structure**:
```json
{
  "status": "success",
  "data": {
    "ngo": { "org_id": 1001, "org_name": "NGO Name" },
    "totals": {
      "dwellersHelped": 5420,
      "aidsDistributed": 12580,
      "totalProjects": 15,
      "activeProjects": 3
    },
    "projectsByStatus": {
      "pending": 2,
      "in_progress": 1,
      "completed": 10,
      "not_executed": 2
    },
    "campaigns": [...],
    "aidDistribution": [
      { "aid_type": "Food", "total": 4200 },
      { "aid_type": "Health", "total": 3100 },
      ...
    ],
    "monthlyGrowth": {
      "currentMonth": 1250,
      "previousMonth": 1100,
      "percent": 13.6
    },
    "dwellersHistory": [...]
  }
}
```

## Design & Styling

### Color Palette (Consistent with NGO Dashboard)
- **Primary Beige**: `#CBB093`
- **Secondary Beige**: `#DAC4AD`
- **Paper (Background)**: `#FFF4E6`
- **Terra (Primary)**: `#A4624D`
- **Peach (Secondary)**: `#DFA477`
- **Ink (Text)**: `#613729`
- **Mint (Accent)**: `#C0E0D0`

### Typography
- **Font Family**: Poppins (Google Fonts)
- **Font Weights**: 300, 400, 500, 600, 700

### Layout Features
- **Responsive Grid**: Adapts from 4 columns on desktop to 1 column on mobile
- **Fixed Header**: Persistent navigation with branding
- **Cards Pattern**: Consistent card design with shadows and hover effects
- **Accessibility**: Proper ARIA labels, semantic HTML, keyboard navigation support

## Navigation Flow

```
ngo-dashboard.html (click "Analytics Dashboard")
    ↓
ngo-analytics-overview.html (main analytics dashboard)
    ├─ Back to Dashboard button → ngo-dashboard.html
    ├─ Can view detailed charts, stats, and campaign table
    └─ All data fetched from /api/ngo/analytics endpoint

Optional: Detail Page (for future enhancement)
    ngo-analytics-detail.html
    ├─ More comprehensive view
    ├─ PDF export capability
    └─ Back to Dashboard button → ngo-analytics-overview.html
```

## Session Management

The analytics pages retrieve the NGO's ID from the session storage:

```javascript
// Retrieved from SLUMLINK_SESSION stored during login
localStorage.getItem('SLUMLINK_SESSION') → org_id
```

**Stored during login** (`src/signin-script.js`):
```javascript
{
  "role": "ngo",
  "org_id": 1001,
  "org_type": "ngo",
  "org_name": "NGO Name",
  "email": "ngo@example.com"
}
```

## Chart Types Used

1. **Doughnut Chart** (Campaign Status)
   - Shows proportion of campaigns in different statuses
   - Color-coded segments with legend

2. **Horizontal Bar Chart** (Categories & Aid Types)
   - Easy comparison of quantities across categories
   - Sorted by relevance

3. **Line Chart** (Monthly Trend)
   - Shows trends over time
   - Point markers for specific values
   - Fill area for visual emphasis

## Error Handling

- **Missing Session**: Displays user-friendly error message with "Back to Dashboard" button
- **API Errors**: Shows error message without crashing
- **Empty Data**: Displays "No data available" messages in appropriate sections
- **Data Validation**: Gracefully handles missing or null values

## Browser Support

- Chrome/Edge (Latest)
- Firefox (Latest)
- Safari (Latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

| Library | Purpose | Version |
|---------|---------|---------|
| Chart.js | Data visualization | 4.4.1 |
| jsPDF | PDF generation | 2.5.1 |
| Font Awesome | Icons | 6.4.0 |
| Poppins Font | Typography | Via Google Fonts |

## Performance Considerations

- **Single API Call**: Fetches all analytics data in one request
- **Chart Optimization**: Charts are destroyed and recreated only when data changes
- **Responsive Images**: Logo and icons load from CDN
- **CSS-in-HTML**: Styles embedded to reduce HTTP requests

## Future Enhancements

1. **Drill Down Analysis**: Click on charts to see more detailed breakdowns
2. **Date Range Filtering**: Allow NGOs to select custom date ranges
3. **Comparison View**: Compare performance across different time periods
4. **Export Formats**: CSV and Excel export options in addition to PDF
5. **Real-time Updates**: WebSocket integration for live data updates
6. **Advanced Filtering**: Filter campaigns by category, location, status, etc.
7. **Custom Dashboards**: Allow NGOs to customize which metrics they see
8. **Benchmark Comparison**: Compare performance against other similar NGOs

## Testing Checklist

- [ ] Verify NGO can access analytics after login
- [ ] Confirm all statistics display correct values
- [ ] Test each chart renders with data
- [ ] Verify empty state handling (no data scenarios)
- [ ] Test PDF export functionality
- [ ] Validate responsive design on mobile devices
- [ ] Check accessibility (keyboard navigation, screen readers)
- [ ] Test with different NGOs to ensure data isolation
- [ ] Verify session timeout handling
- [ ] Test with long campaign titles and descriptions

## Developer Notes

### Adding New Charts
1. Add canvas element to HTML: `<canvas id="newChart"></canvas>`
2. Create render function in JS: `function renderNewChart(data) { ... }`
3. Call render function from `renderContent()`: `renderNewChart(data.field)`

### Modifying API Response
Update the `getNgoAnalytics()` function in:
`backend/controllers/ngo.controller.js` (lines 446-612)

### Styling Adjustments
All styles are embedded in the HTML files. Use CSS variables defined in `:root` for consistent colors:
```css
:root {
  --sand: #CBB093;
  --terra: #A4624D;
  /* ... etc */
}
```

## Files Modified

1. `src/ngo/ngo-dashboard.js` - Updated to navigate to new analytics page
2. `backend/routes/ngo.routes.js` - Already had `/api/ngo/analytics` endpoint
3. `backend/controllers/ngo.controller.js` - Already had `getNgoAnalytics()` function

## Files Created

1. `src/ngo/ngo-analytics-overview.html` (1400+ lines)
2. `src/ngo/ngo-analytics-overview.js` (500+ lines)
3. `src/ngo/ngo-analytics-detail.html` (400+ lines)
4. `src/ngo/ngo-analytics-detail.js` (500+ lines)

## Total Addition: ~4000 lines of code

---

**Last Updated**: February 2025
**SlumLink Version**: Current Development
