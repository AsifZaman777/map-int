# Real-time Navigation App with Leaflet.js

A simple web-based navigation application that provides real-time turn-by-turn directions using Leaflet.js and OpenStreetMap.

## Features

- 🗺️ Interactive map with OpenStreetMap tiles
- 📍 Automatic detection of current location
- 🧭 Real-time GPS tracking during navigation
- 🛣️ Turn-by-turn routing using Leaflet Routing Machine
- 📊 Live navigation stats:
  - Distance remaining
  - Estimated time of arrival
  - Current speed
- 🎯 Arrival detection (alerts when you reach destination)
- 📱 Responsive design for mobile and desktop

## How to Use

1. **Open the Application**

   - Simply open `index.html` in a web browser
   - Allow location permissions when prompted

2. **Set Your Route**

   - **Starting Location**:
     - Click "Use My Location" to automatically use your current position
     - Or enter an address or coordinates (e.g., "London, UK" or "51.5074, -0.1278")
   - **Destination**:
     - Enter the destination address or coordinates

3. **Start Navigation**

   - Click the "Navigate" button
   - The route will be displayed on the map
   - Real-time tracking will begin automatically

4. **During Navigation**

   - The blue dot shows your current location
   - The red pin shows your destination
   - The blue line shows your route
   - Watch the status panel for:
     - GPS tracking status
     - Distance remaining
     - Estimated time
     - Current speed

5. **Stop Navigation**
   - Click "Stop Navigation" to end the session

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for map tiles and routing)
- Location services enabled
- HTTPS connection for geolocation to work (or localhost)

## Technologies Used

- **Leaflet.js** - Open-source JavaScript library for interactive maps
- **Leaflet Routing Machine** - Routing control for Leaflet
- **OpenStreetMap** - Free, editable map data
- **Nominatim API** - Geocoding service for address lookup
- **HTML5 Geolocation API** - For real-time GPS tracking

## Local Development

To run this project locally:

1. Clone or download the project files
2. Open `index.html` in a web browser
3. For HTTPS (required for geolocation):
   - Use a local server like `python -m http.server` or `npx serve`
   - Or use VS Code Live Server extension

## Notes

- Geolocation requires HTTPS in production (localhost works without HTTPS)
- The app uses OpenStreetMap's free Nominatim service for geocoding
- Routing is provided by OSRM (Open Source Routing Machine)
- GPS accuracy depends on your device and environment

## Limitations

- Requires internet connection
- GPS accuracy varies by device
- Free services have usage limits (fair use policy)
- Works best on mobile devices with GPS

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- Opera: Full support

## License

This project uses open-source libraries and free services. Feel free to use and modify as needed.

## Credits

- Maps: © OpenStreetMap contributors
- Routing: Leaflet Routing Machine
- Geocoding: Nominatim
