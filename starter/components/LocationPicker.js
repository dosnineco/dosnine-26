import { useEffect, useRef, useState } from 'react';
import { Crosshair, LoaderCircle, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const JAMAICA_CENTER = [18.1096, -77.2975];

function createOpenStreetMapLink(latitude, longitude) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

function createQueryOpenStreetMapLink(query) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

export default function LocationPicker({ parish, town, address, onAddressChange, onLocationChange }) {
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const [mapLink, setMapLink] = useState(createQueryOpenStreetMapLink('Jamaica'));
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);

  useEffect(() => {
    const query = [address, town, parish, 'Jamaica'].filter(Boolean).join(', ');
    if (!query) return;

    setMapLink(createQueryOpenStreetMapLink(query));
  }, [address, town, parish]);

  const placePin = (latitude, longitude, formattedAddress = `${latitude}, ${longitude}`, locationDetails = {}) => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;

    if (markerRef.current) markerRef.current.remove();
    markerRef.current = leaflet.marker([latitude, longitude]).addTo(map);
    map.setView([latitude, longitude], 16);
    setMapLink(createOpenStreetMapLink(latitude, longitude));
    onAddressChange(formattedAddress);
    onLocationChange({
      latitude,
      longitude,
      formattedAddress,
      parish: locationDetails.parish || '',
      town: locationDetails.town || '',
    });
  };

  useEffect(() => {
    let active = true;
    const leafletScriptId = 'leaflet-javascript-api';
    const leafletStyleId = 'leaflet-stylesheet';
    const initializeMap = () => {
      const leaflet = window.L;
      if (!active || !mapContainerRef.current || !leaflet || mapRef.current) return;

      leafletRef.current = leaflet;
      const map = leaflet.map(mapContainerRef.current).setView(JAMAICA_CENTER, 8);
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      requestAnimationFrame(() => map.invalidateSize());

      map.on('click', (event) => {
        const latitude = Number(event.latlng.lat.toFixed(7));
        const longitude = Number(event.latlng.lng.toFixed(7));
        placePin(latitude, longitude);
        setMessage('Pin placed. Confirm this location before posting.');
      });
      mapRef.current = map;
    };

    const loadLeaflet = () => {
      const existingScript = document.getElementById(leafletScriptId);
      if (window.L) {
        initializeMap();
      } else if (existingScript) {
        existingScript.addEventListener('load', initializeMap, { once: true });
        const waitForLeaflet = () => {
          if (!active) return;
          if (window.L) {
            initializeMap();
            return;
          }
          window.setTimeout(waitForLeaflet, 50);
        };
        waitForLeaflet();
      } else {
        const script = document.createElement('script');
        script.id = leafletScriptId;
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.defer = true;
        script.addEventListener('load', initializeMap, { once: true });
        script.addEventListener('error', () => setMessage('The location map could not load. Please use GPS or search the address.'), { once: true });
        document.head.appendChild(script);
      }

      if (!document.getElementById(leafletStyleId)) {
        const style = document.createElement('link');
        style.id = leafletStyleId;
        style.rel = 'stylesheet';
        style.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(style);
      }
    };

    loadLeaflet();

    return () => {
      active = false;
      if (markerRef.current) markerRef.current.remove();
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  const showPermissionHelp = () => {
    const messageText = 'Location permission is blocked. Click the lock icon beside the address, allow Location, then reload this page.';
    setMessage(messageText);
    setShowPermissionDialog(true);
    toast.error(messageText, { duration: 8000 });
  };

  const useGpsLocation = () => {
    if (!navigator.geolocation) {
      setMessage('GPS location is not supported by this browser.');
      return;
    }

    setLocating(true);
    setMessage('Requesting your exact GPS location...');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const latitude = Number(coords.latitude.toFixed(7));
      const longitude = Number(coords.longitude.toFixed(7));

      if (latitude < 17 || latitude > 19 || longitude < -79 || longitude > -75) {
        setMessage('Your GPS location is outside Jamaica. Move to the property location and try again.');
        setLocating(false);
        return;
      }

      let formattedAddress = `${latitude}, ${longitude}`;
      let parish = '';
      let town = '';
      try {
        const response = await fetch(`/api/geocode?latitude=${latitude}&longitude=${longitude}`);
        const result = await response.json();
        if (response.ok) {
          if (result?.formattedAddress) formattedAddress = result.formattedAddress;
          parish = result?.parish || '';
          town = result?.town || '';
        }
      } catch (error) {
        // Coordinates are still valid if reverse geocoding is unavailable.
      }

      placePin(latitude, longitude, formattedAddress, { parish, town });
      setShowPermissionDialog(false);
      setMessage('Exact GPS location captured. Confirm this pin before posting.');
      setLocating(false);
    }, (error) => {
      const errorMessage = error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Allow location access and try again.'
        : 'Could not get your GPS location. Make sure location services are enabled.';
      setMessage(errorMessage);
      if (error.code === error.PERMISSION_DENIED) {
        showPermissionHelp();
      }
      setLocating(false);
      onLocationChange(null);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const searchLocation = async () => {
    if (!address?.trim() || !town || !parish) {
      setMessage('Enter the address, town/area, and parish first.');
      return;
    }

    setSearching(true);
    setMessage('');
    try {
      const normalizedAddress = address
        .replace(/\bP\.?\s*O\.?\b/gi, '')
        .replace(/\bDr\.?\b/gi, 'Drive')
        .replace(/\bRd\.?\b/gi, 'Road')
        .replace(/\bSt\.?\b/gi, 'Street')
        .replace(/\bAve\.?\b/gi, 'Avenue')
        .replace(/\s+/g, ' ')
        .replace(/\s*,\s*/g, ', ')
        .trim();
      const locality = [town, parish].filter(Boolean).join(', ');
      const query = [normalizedAddress, locality, 'Jamaica'].filter(Boolean).join(', ');
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
      const result = await response.json();
      if (!response.ok || !result?.latitude || !result?.longitude) {
        setMessage(result?.error || 'Could not find that location.');
        onLocationChange(null);
        return;
      }

      placePin(Number(result.latitude), Number(result.longitude), result.formattedAddress, {
        parish: result.parish,
        town: result.town,
      });
      setMessage('Location verified.');
    } catch (error) {
      setMessage('Could not search maps right now. Please try again.');
      onLocationChange(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
        <div>
          <p className="text-lg font-semibold text-gray-900">Where is your property located?</p>
          <p className="mt-1 text-sm text-gray-500">Confirm the location so people can find your property.</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={useGpsLocation}
            disabled={locating || searching}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-color-hover)] disabled:opacity-60"
          >
            {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            {locating ? 'Finding GPS...' : 'Use exact GPS'}
          </button>
          <button
            type="button"
            onClick={searchLocation}
            disabled={searching || locating}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-900 hover:bg-gray-50 disabled:opacity-60"
          >
            {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? 'Searching...' : 'Search address'}
          </button>
        </div>
      </div>
      {message && (
        <div className={`mx-5 mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium sm:mx-6 ${message === 'Location verified.' || message.includes('captured') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          {message}
        </div>
      )}
      <div className="relative mt-5 overflow-hidden border-t border-gray-100 bg-gray-100">
        <div ref={mapContainerRef} className="h-72 w-full sm:h-80" aria-label="Click the map to place a property pin" />
        <a
          href={mapLink}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-gray-50"
        >
          <MapPin className="h-4 w-4 text-accent" />
          Open in OpenStreetMap
        </a>
      </div>

      {showPermissionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="location-permission-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 id="location-permission-title" className="text-lg font-semibold text-slate-950">Allow location access</h2>
                <p className="mt-1 text-sm text-slate-600">Your browser is blocking location services for this site.</p>
              </div>
            </div>
            <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Click the lock or site-settings icon beside the address bar.</li>
              <li>Set <strong>Location</strong> to <strong>Allow</strong>.</li>
              <li>Reload this page, then click <strong>Use exact GPS</strong>.</li>
            </ol>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPermissionDialog(false);
                  useGpsLocation();
                }}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-color-hover)]"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => setShowPermissionDialog(false)}
                className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
