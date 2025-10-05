# Google Maps MCP Server

This MCP server provides integration with Google Maps APIs, allowing AI agents to perform location-based queries and operations.

## Features

- **Geocoding**: Convert addresses to coordinates
- **Reverse Geocoding**: Convert coordinates to addresses
- **Place Search**: Find places by text query
- **Place Details**: Get detailed information about specific places
- **Distance Matrix**: Calculate travel distances and times
- **Elevation**: Get elevation data for locations
- **Directions**: Get turn-by-turn directions

## Setup

1. Get a Google Maps API key from the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Geocoding API
   - Places API
   - Distance Matrix API
   - Elevation API
   - Directions API

3. Install dependencies:
```bash
npm install
```

4. Build the server:
```bash
npm run build
```

## Environment Variables

Set the following environment variable:
```bash
export GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Available Tools

### maps_geocode
Convert an address into geographic coordinates.

**Input:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

### maps_reverse_geocode
Convert coordinates into an address.

**Input:**
```json
{
  "latitude": 37.4419,
  "longitude": -122.1430
}
```

### maps_search_places
Search for places using Google Places API.

**Input:**
```json
{
  "query": "restaurants",
  "location": {"latitude": 37.7749, "longitude": -122.4194},
  "radius": 1500
}
```

### maps_place_details
Get detailed information about a specific place.

**Input:**
```json
{
  "place_id": "ChIJd8BlQ2BZwokRAFUEcm_qrcA"
}
```

### maps_distance_matrix
Calculate travel distance and time for multiple origins and destinations.

**Input:**
```json
{
  "origins": ["New York, NY"],
  "destinations": ["Los Angeles, CA", "Chicago, IL"],
  "mode": "driving"
}
```

### maps_elevation
Get elevation data for locations.

**Input:**
```json
{
  "locations": [
    {"latitude": 39.7391536, "longitude": -104.9847034}
  ]
}
```

### maps_directions
Get directions between two points.

**Input:**
```json
{
  "origin": "New York, NY",
  "destination": "Los Angeles, CA",
  "mode": "driving"
}
```

## Running the Server

```bash
npm start
```

The server communicates via stdio and can be integrated with MCP-compatible clients.
