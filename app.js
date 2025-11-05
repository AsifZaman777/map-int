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

// Initialize map centered on a default location
function initMap() {
  map = L.map("map").setView([51.505, -0.09], 13);

  // Add OpenStreetMap tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  //region get usr curr location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        map.setView([lat, lng], 15);
        currentPosition = { lat, lng };

        // Add marker for current location
        if (currentLocationMarker) {
          currentLocationMarker.setLatLng([lat, lng]);
        } else {
          currentLocationMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "current-location-marker",
              html: '<div style="background: #3498db; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
            }),
          })
            .addTo(map)
            .bindPopup("Your Current Location");
        }

        document.getElementById("start").value = `${lat.toFixed(
          6
        )}, ${lng.toFixed(6)}`;
      },
      (error) => {
        console.error("Error getting location:", error);
        showError(
          "Unable to get your location. Please enter manually or check permissions."
        );
      }
    );
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

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Calculate speed
function calculateSpeed(lat1, lon1, lat2, lon2, timeDiff) {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  const hours = timeDiff / 3600000; // Convert ms to hours
  return distance / hours; // km/h
}

// Update navigation status
function updateNavigationStatus(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const currentTime = Date.now();

  // Update current location marker
  if (currentLocationMarker) {
    currentLocationMarker.setLatLng([lat, lng]);
  }

  // Center map on current location
  map.setView([lat, lng], map.getZoom());

  // Calculate speed
  if (lastPosition && lastTime) {
    const timeDiff = currentTime - lastTime;
    const speed = calculateSpeed(
      lastPosition.lat,
      lastPosition.lng,
      lat,
      lng,
      timeDiff
    );
    document.getElementById("currentSpeed").textContent = `${speed.toFixed(
      1
    )} km/h`;
  }

  lastPosition = { lat, lng };
  lastTime = currentTime;

  // If we have a route, calculate remaining distance
  if (routeCoordinates.length > 0) {
    const destination = routeCoordinates[routeCoordinates.length - 1];
    const distanceToDestination = calculateDistance(
      lat,
      lng,
      destination.lat,
      destination.lng
    );

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

    // Create routing control
    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(startCoords.lat, startCoords.lng),
        L.latLng(destCoords.lat, destCoords.lng),
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: "#3498db", weight: 6, opacity: 0.7 }],
      },
    }).addTo(map);

    // Store route coordinates
    routingControl.on("routesfound", function (e) {
      const routes = e.routes;
      const route = routes[0];
      routeCoordinates = route.coordinates.map((coord) => ({
        lat: coord.lat,
        lng: coord.lng,
      }));
    });

    // Add destination marker
    if (destinationMarker) {
      map.removeLayer(destinationMarker);
    }
    destinationMarker = L.marker([destCoords.lat, destCoords.lng], {
      icon: L.divIcon({
        className: "destination-marker",
        html: '<div style="background: #e74c3c; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
        iconSize: [30, 30],
      }),
    })
      .addTo(map)
      .bindPopup("Destination");

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

// Use current location button
document.getElementById("useCurrentLocation").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        document.getElementById("start").value = `${lat.toFixed(
          6
        )}, ${lng.toFixed(6)}`;

        map.setView([lat, lng], 15);

        if (currentLocationMarker) {
          currentLocationMarker.setLatLng([lat, lng]);
        } else {
          currentLocationMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "current-location-marker",
              html: '<div style="background: #3498db; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
            }),
          })
            .addTo(map)
            .bindPopup("Your Current Location");
        }
      },
      (error) => {
        showError("Unable to get your location: " + error.message);
      }
    );
  } else {
    showError("Geolocation is not supported by your browser");
  }
});

// Navigate button
document.getElementById("navigate").addEventListener("click", startNavigation);

// Stop navigation button
document
  .getElementById("stopNavigation")
  .addEventListener("click", stopNavigation);

// Initialize map on load
window.addEventListener("load", initMap);
