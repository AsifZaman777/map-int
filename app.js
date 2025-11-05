// Initialize the map
let map;
let routingControl;
let currentLocationMarker;
let destinationMarker;
let watchId;
let isNavigating = false;
let currentPosition = null;
let routeCoordinates = [];
let lastPosition = null;
let lastTime = null;

// Custom icon definitions (reusable)
const currentLocationIcon = L.divIcon({
  className: "current-location-marker",
  html: '<div style="background: #3498db; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const destinationIcon = L.divIcon({
  className: "destination-marker",
  html: '<div style="background: #e74c3c; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// Initialize map centered on a default location
function initMap() {
  // Create map with more options
  map = L.map("map", {
    center: [51.505, -0.09],
    zoom: 13,
    zoomControl: true,
    attributionControl: true,
  });

  // Add OpenStreetMap tile layer with error handling
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
    minZoom: 3,
    subdomains: ["a", "b", "c"],
  }).addTo(map);

  // Get user's current location
  getUserLocation();
}

// Separate function for getting user location (more reusable)
function getUserLocation() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latlng = L.latLng(
        position.coords.latitude,
        position.coords.longitude
      );
      currentPosition = latlng;

      // Fly to location with animation
      map.flyTo(latlng, 15, {
        duration: 1.5,
      });

      // Create or update marker
      updateCurrentLocationMarker(latlng);

      // Update input field
      document.getElementById("start").value = `${latlng.lat.toFixed(
        6
      )}, ${latlng.lng.toFixed(6)}`;
    },
    (error) => {
      console.error("Error getting location:", error);
      const errorMessages = {
        1: "Location permission denied. Please enable location access.",
        2: "Location information unavailable.",
        3: "Location request timed out.",
      };
      showError(
        errorMessages[error.code] ||
          "Unable to get your location. Please enter manually."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    }
  );
}

// Helper function to update current location marker
function updateCurrentLocationMarker(latlng) {
  if (currentLocationMarker) {
    currentLocationMarker.setLatLng(latlng);
  } else {
    currentLocationMarker = L.marker(latlng, {
      icon: currentLocationIcon,
      title: "Your Location",
    })
      .addTo(map)
      .bindPopup("Your Current Location");
  }
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// Geocode address to coordinates
async function geocodeAddress(address) {
  try {
    // Check if it's already coordinates
    const coordMatch = address.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
      };
    }

    // Use Nominatim for geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&limit=1`
    );
    const data = await response.json();

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } else {
      throw new Error("Address not found");
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
}

// Calculate distance using Leaflet's built-in method (more optimized)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const point1 = L.latLng(lat1, lon1);
  const point2 = L.latLng(lat2, lon2);
  return point1.distanceTo(point2) / 1000; // Convert meters to kilometers
}

// Calculate speed
function calculateSpeed(lat1, lon1, lat2, lon2, timeDiff) {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  const hours = timeDiff / 3600000; // Convert ms to hours
  return distance / hours; // km/h
}

// Update navigation status
function updateNavigationStatus(position) {
  const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
  const currentTime = Date.now();

  // Update current location marker using Leaflet method
  updateCurrentLocationMarker(latlng);

  // Smooth pan to current location (better than setView)
  map.panTo(latlng, {
    animate: true,
    duration: 0.5,
  });

  // Calculate speed
  if (lastPosition && lastTime) {
    const timeDiff = currentTime - lastTime;
    const speed = calculateSpeed(
      lastPosition.lat,
      lastPosition.lng,
      latlng.lat,
      latlng.lng,
      timeDiff
    );
    document.getElementById("currentSpeed").textContent = `${speed.toFixed(
      1
    )} km/h`;
  }

  lastPosition = latlng;
  lastTime = currentTime;

  // If we have a route, calculate remaining distance
  if (routeCoordinates.length > 0) {
    const destination = L.latLng(routeCoordinates[routeCoordinates.length - 1]);
    const distanceToDestination = latlng.distanceTo(destination) / 1000; // Leaflet's built-in method

    document.getElementById("distanceLeft").textContent =
      distanceToDestination < 1
        ? `${(distanceToDestination * 1000).toFixed(0)} m`
        : `${distanceToDestination.toFixed(2)} km`;

    // Estimate time (assuming average speed of 40 km/h)
    const estimatedTime = (distanceToDestination / 40) * 60; // in minutes
    document.getElementById("timeLeft").textContent =
      estimatedTime < 1 ? `< 1 min` : `${Math.round(estimatedTime)} min`;

    // Check if we've arrived (within 50 meters)
    if (distanceToDestination < 0.05) {
      showError("You have arrived at your destination! 🎉");
      stopNavigation();
    }
  }
}

// Start navigation
async function startNavigation() {
  const startInput = document.getElementById("start").value.trim();
  const destInput = document.getElementById("destination").value.trim();

  if (!startInput || !destInput) {
    showError("Please enter both starting location and destination");
    return;
  }

  try {
    // Geocode addresses
    const startCoords = await geocodeAddress(startInput);
    const destCoords = await geocodeAddress(destInput);

    // Remove existing route
    if (routingControl) {
      map.removeControl(routingControl);
    }

    // Create routing control with optimized options
    routingControl = L.Routing.control({
      waypoints: [L.latLng(startCoords), L.latLng(destCoords)],
      routeWhileDragging: false,
      showAlternatives: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      createMarker: function () {
        return null; // Don't create default markers, we'll use custom ones
      },
      lineOptions: {
        styles: [{ color: "#3498db", weight: 6, opacity: 0.7 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
    }).addTo(map);

    // Store route coordinates using Leaflet event
    routingControl.on("routesfound", (e) => {
      routeCoordinates = e.routes[0].coordinates;

      // Fit bounds to show entire route
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    });

    // Add/update destination marker with custom icon
    if (destinationMarker) {
      destinationMarker.setLatLng(destCoords);
    } else {
      destinationMarker = L.marker(destCoords, {
        icon: destinationIcon,
        title: "Destination",
      })
        .addTo(map)
        .bindPopup("Destination");
    }

    // Start watching position
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        updateNavigationStatus,
        (error) => {
          console.error("Error watching position:", error);
          showError(
            "GPS tracking error. Please check your location permissions."
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      isNavigating = true;
      document.getElementById("navigate").style.display = "none";
      document.getElementById("stopNavigation").style.display = "block";
      document.getElementById("gpsStatus").classList.remove("inactive");
      document.getElementById("gpsStatus").classList.add("active");
      document.getElementById("gpsText").textContent = "Active";
    } else {
      showError("Geolocation is not supported by your browser");
    }
  } catch (error) {
    showError("Error starting navigation: " + error.message);
  }
}

// Stop navigation
function stopNavigation() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  isNavigating = false;
  routeCoordinates = [];
  lastPosition = null;
  lastTime = null;

  document.getElementById("navigate").style.display = "block";
  document.getElementById("stopNavigation").style.display = "none";
  document.getElementById("gpsStatus").classList.remove("active");
  document.getElementById("gpsStatus").classList.add("inactive");
  document.getElementById("gpsText").textContent = "Inactive";
  document.getElementById("distanceLeft").textContent = "--";
  document.getElementById("timeLeft").textContent = "--";
  document.getElementById("currentSpeed").textContent = "-- km/h";
}

// Use current location button - reuse getUserLocation function
document
  .getElementById("useCurrentLocation")
  .addEventListener("click", getUserLocation);

// Navigate button
document.getElementById("navigate").addEventListener("click", startNavigation);

// Stop navigation button
document
  .getElementById("stopNavigation")
  .addEventListener("click", stopNavigation);

// Initialize map on load
window.addEventListener("load", initMap);
