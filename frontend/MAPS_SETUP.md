# Google Maps Setup

## Getting Started

To use the Maps feature in the Property Activity Tracker, you need to set up a Google Maps API key.

### Steps:

1. **Get a Google Maps API Key:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Maps JavaScript API"
   - Go to "Credentials" and create an API key
   - Optionally, restrict the API key to your domain for security

2. **Add the API Key:**
   - Open `frontend/public/index.html`
   - Find this line: `<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap"></script>`
   - Replace `YOUR_API_KEY` with your actual Google Maps API key

3. **Features:**
   - **Blue markers (P):** Properties on the map
   - **Green markers (N):** New activities when online
   - **Red markers (M):** Missed activities when returning online after being offline
   - **Interactive:** Click on any marker to see details
   - **Controls:** Refresh and Center buttons to update and focus the map

### Example:
```html
<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw&callback=initMap"></script>
```

### Security Note:
For production, make sure to restrict your API key to specific domains and enable only the APIs you need.