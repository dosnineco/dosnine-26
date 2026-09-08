import { useState } from 'react';
import { Crosshair, LoaderCircle, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const JAMAICA_MAP_URL = 'https://www.google.com/maps?q=Jamaica&z=8&output=embed';

function createMapUrl(latitude, longitude) {
  const span = 0.01;
  return `https://www.google.com/maps?q=${latitude},${longitude}&z=18&output=embed`;
}

export default function LocationPicker({ parish, town, address, onAddressChange, onLocationChange }) {
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const [mapUrl, setMapUrl] = useState(JAMAICA_MAP_URL);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

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

      onAddressChange(formattedAddress);
      onLocationChange({ latitude, longitude, formattedAddress, parish, town });
      setMapUrl(createMapUrl(latitude, longitude));
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
        setMessage(result?.error || 'Google Maps could not find that location.');
        onLocationChange(null);
        return;
      }

      const location = {
        latitude: Number(result.latitude),
        longitude: Number(result.longitude),
        formattedAddress: result.formattedAddress,
        parish: result.parish || '',
        town: result.town || '',
      };
      onAddressChange(result.formattedAddress);
      onLocationChange(location);
      setMapUrl(createMapUrl(Number(result.latitude), Number(result.longitude)));
      setMessage('Location verified.');
    } catch (error) {
      setMessage('Could not search maps right now. Please try again.');
      onLocationChange(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Verify the exact location</p>
          <p className="text-xs text-slate-500">Use GPS while at the property for the most accurate pin.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={useGpsLocation}
            disabled={locating || searching}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-color-hover)] disabled:opacity-60"
          >
            {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            {locating ? 'Finding GPS...' : 'Use exact GPS'}
          </button>
          <button
            type="button"
            onClick={searchLocation}
            disabled={searching || locating}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? 'Searching...' : 'Search address'}
          </button>
        </div>
      </div>
      {message && (
        <p className={`mt-3 flex items-center gap-1 text-xs ${message === 'Location verified.' ? 'text-emerald-700' : 'text-amber-700'}`}>
          <MapPin className="h-3.5 w-3.5" /> {message}
        </p>
      )}
      <div className="mt-4 overflow-hidden rounded-lg bg-white">
        <iframe
          title="Jamaica property location map"
          src={mapUrl}
          className="h-64 w-full border-0"
          loading="lazy"
        />
        <p className="px-3 py-2 text-xs text-slate-500">Google Maps is used to verify and display the property location.</p>
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
