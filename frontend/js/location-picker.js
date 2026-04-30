/**
 * Reusable Leaflet-based location picker.
 *
 * UX goals:
 * - Map on top (mobile-first), address shown in "Select Area"
 * - Use GPS on open (with loading + permission/error states)
 * - Drag map OR tap to place marker
 * - Live lat/lng updates; reverse geocode is debounced
 *
 * Notes:
 * - Uses OpenStreetMap tiles + Nominatim reverse geocoding.
 * - For production, consider hosting your own geocoding service / provider per usage policy.
 */

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // fallback (India)
const DEFAULT_ZOOM = 16;
const GEOCODE_DEBOUNCE_MS = 650;
const GPS_FIRST_FIX_MAX_WAIT_MS = 15000;
const GPS_ACCEPTABLE_ACCURACY_METERS = 150; // show warning above this
const GPS_IMPROVE_WINDOW_MS = 8000; // keep watching a bit to improve accuracy
const GPS_GOOD_ACCURACY_METERS = 60; // stop early if we reach this

function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
}

function formatCoord(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return '';
    return n.toFixed(6);
}

function debounce(fn, waitMs) {
    let t = null;
    return (...args) => {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(() => fn(...args), waitMs);
    };
}

/**
 * @param {{
 *  mapEl: HTMLElement,
 *  addressInput: HTMLInputElement,
 *  latInput: HTMLInputElement,
 *  lngInput: HTMLInputElement,
 *  coordsEl?: HTMLElement,
 *  loadingEl?: HTMLElement,
 *  errorEl?: HTMLElement,
 *  recenterBtn?: HTMLButtonElement,
 *  initialCenter?: {lat:number,lng:number},
 *  initialZoom?: number,
 * }} opts
 */
export function createLocationPicker(opts) {
    const mapEl = opts.mapEl;
    const addressInput = opts.addressInput;
    const latInput = opts.latInput;
    const lngInput = opts.lngInput;
    const coordsEl = opts.coordsEl || null;
    const loadingEl = opts.loadingEl || null;
    const errorEl = opts.errorEl || null;
    const recenterBtn = opts.recenterBtn || null;

    let map = null;
    let marker = null;
    let lastCoords = null; // {lat,lng}
    let abortController = null;
    let isMarkerDragging = false;
    let watchId = null;
    let gpsFirstFixTimer = null;

    const showLoading = (on, text = 'Fetching your location…') => {
        if (!loadingEl) return;
        loadingEl.style.display = on ? 'flex' : 'none';
        const span = loadingEl.querySelector('span');
        if (span) span.textContent = text;
    };

    const showError = (msg) => {
        if (!errorEl) return;
        if (!msg) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
            return;
        }
        errorEl.style.display = 'block';
        errorEl.textContent = msg;
    };

    const setCoords = ({ lat, lng }, { updateMap = true, source = 'program' } = {}) => {
        const safeLat = clamp(lat, -90, 90);
        const safeLng = clamp(lng, -180, 180);

        lastCoords = { lat: safeLat, lng: safeLng };
        latInput.value = String(safeLat);
        lngInput.value = String(safeLng);

        if (coordsEl) {
            coordsEl.textContent = `Lat: ${formatCoord(safeLat)}  •  Lng: ${formatCoord(safeLng)}`;
        }

        if (map && marker && updateMap) {
            // Avoid fighting the user if they are actively dragging the marker.
            if (source !== 'marker-drag') {
                marker.setLatLng([safeLat, safeLng]);
            }
            if (source === 'program') {
                map.setView([safeLat, safeLng], map.getZoom(), { animate: true });
            }
        }

        debouncedReverseGeocode(safeLat, safeLng);
    };

    const stopWatchingGPS = () => {
        if (gpsFirstFixTimer) {
            window.clearTimeout(gpsFirstFixTimer);
            gpsFirstFixTimer = null;
        }
        if (watchId != null && navigator.geolocation && navigator.geolocation.clearWatch) {
            navigator.geolocation.clearWatch(watchId);
        }
        watchId = null;
    };

    const isSecureForGeolocation = () => {
        // Most browsers require HTTPS or localhost for geolocation.
        // window.isSecureContext covers https + localhost in modern browsers.
        if (window.isSecureContext) return true;
        const host = (window.location && window.location.hostname) ? window.location.hostname : '';
        return host === 'localhost' || host === '127.0.0.1';
    };

    const reverseGeocode = async (lat, lng) => {
        // Cancel any in-flight lookup (keeps UI snappy while user moves the map)
        if (abortController) abortController.abort();
        abortController = new AbortController();

        try {
            const url = new URL('https://photon.komoot.io/reverse');
            url.searchParams.set('lat', String(lat));
            url.searchParams.set('lon', String(lng));
            url.searchParams.set('limit', '1');

            const res = await fetch(url.toString(), {
                signal: abortController.signal
            });
            if (!res.ok) throw new Error('Reverse geocoding failed');
            const data = await res.json();

            let displayName = '';
            if (data && data.features && data.features.length > 0) {
                const props = data.features[0].properties;
                const parts = [];
                if (props.name) parts.push(props.name);
                if (props.street) parts.push(props.street);
                if (props.district) parts.push(props.district);
                if (props.city || props.town) parts.push(props.city || props.town);
                if (props.state) parts.push(props.state);
                displayName = parts.join(', ');
            }

            if (displayName) {
                addressInput.value = displayName;
                showError('');
            } else {
                addressInput.value = '';
                showError('Unable to resolve address for this location.');
            }
        } catch (e) {
            // Ignore aborts (user is moving quickly)
            if (e && (e.name === 'AbortError')) return;
            // Keep coordinates even if address fails
            showError('Unable to fetch address. You can still submit with coordinates.');
        }
    };

    const debouncedReverseGeocode = debounce(reverseGeocode, GEOCODE_DEBOUNCE_MS);

    // Create autocomplete dropdown container
    let suggestionBox = null;
    if (addressInput && addressInput.parentNode) {
        suggestionBox = document.createElement('div');
        suggestionBox.className = 'autocomplete-suggestions';
        suggestionBox.style.cssText = 'position: absolute; z-index: 9999; background: white; border: 1px solid #ccc; border-radius: 4px; width: 100%; max-height: 200px; overflow-y: auto; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 2px;';
        // Ensure parent is relative so absolute positioning works nicely
        if (getComputedStyle(addressInput.parentNode).position === 'static') {
            addressInput.parentNode.style.position = 'relative';
        }
        addressInput.parentNode.appendChild(suggestionBox);
    }

    let searchAbortController = null;
    const fetchSuggestions = async (query) => {
        if (!query || query.length < 3) {
            if (suggestionBox) suggestionBox.style.display = 'none';
            return;
        }

        if (searchAbortController) searchAbortController.abort();
        searchAbortController = new AbortController();

        try {
            // Using Photon (Komoot) as it is highly optimized for autocomplete and has no strict User-Agent blocks
            const url = new URL('https://photon.komoot.io/api/');
            url.searchParams.set('q', query);
            url.searchParams.set('limit', '5');

            const res = await fetch(url.toString(), {
                signal: searchAbortController.signal
            });
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();

            if (data && data.features && data.features.length > 0 && suggestionBox) {
                suggestionBox.innerHTML = '';
                data.features.forEach(item => {
                    const props = item.properties;
                    const coords = item.geometry.coordinates; // [lon, lat]
                    // Format display string
                    const parts = [];
                    if (props.name) parts.push(props.name);
                    if (props.street) parts.push(props.street);
                    if (props.district) parts.push(props.district);
                    if (props.city || props.town) parts.push(props.city || props.town);
                    if (props.state) parts.push(props.state);
                    const displayName = parts.join(', ') || 'Unknown location';

                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 13px; color: #333;';
                    div.textContent = displayName;
                    div.onmouseenter = () => div.style.backgroundColor = '#f1f5f9';
                    div.onmouseleave = () => div.style.backgroundColor = 'transparent';
                    div.onclick = (e) => {
                        e.stopPropagation();
                        suggestionBox.style.display = 'none';
                        addressInput.value = displayName;
                        setCoords(
                            { lat: coords[1], lng: coords[0] },
                            { updateMap: true, source: 'manual-geocode' }
                        );
                    };
                    suggestionBox.appendChild(div);
                });
                suggestionBox.style.display = 'block';
            } else if (suggestionBox) {
                // If no results, show a "No results found"
                suggestionBox.innerHTML = '<div style="padding: 10px; font-size: 13px; color: #777;">No results found</div>';
                suggestionBox.style.display = 'block';
            }
        } catch (e) {
            if (e && e.name !== 'AbortError' && suggestionBox) {
                suggestionBox.style.display = 'none';
            }
        }
    };

    const debouncedFetchSuggestions = debounce(fetchSuggestions, 400);

    if (addressInput) {
        addressInput.addEventListener('input', (e) => {
            debouncedFetchSuggestions(e.target.value.trim());
        });
        
        // Hide on outside click
        document.addEventListener('click', (e) => {
            if (suggestionBox && !addressInput.contains(e.target) && !suggestionBox.contains(e.target)) {
                suggestionBox.style.display = 'none';
            }
        });
    }

    const ensureMap = () => {
        if (map) return;
        if (!window.L) {
            showError('Map library failed to load.');
            return;
        }

        const initial = opts.initialCenter || DEFAULT_CENTER;
        const zoom = opts.initialZoom || DEFAULT_ZOOM;

        map = window.L.map(mapEl, {
            zoomControl: false,
            attributionControl: true
        }).setView([initial.lat, initial.lng], zoom);

        window.L.control.zoom({ position: 'bottomright' }).addTo(map);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        marker = window.L.marker([initial.lat, initial.lng], { draggable: true }).addTo(map);

        // Map drag -> marker follows map center on drag end (meets “drag map to change location”)
        map.on('move', () => {
            if (!map || !marker) return;
            if (isMarkerDragging) return;
            const c = map.getCenter();
            // Live updates while map moves (real-time lat/lng)
            setCoords({ lat: c.lat, lng: c.lng }, { updateMap: false, source: 'map-move' });
        });
        map.on('moveend', () => {
            if (!map || !marker) return;
            if (isMarkerDragging) return;
            const c = map.getCenter();
            marker.setLatLng(c);
            setCoords({ lat: c.lat, lng: c.lng }, { updateMap: false, source: 'map-moveend' });
        });

        // Tap anywhere -> place marker there (and center map)
        map.on('click', (e) => {
            if (!e || !e.latlng) return;
            setCoords({ lat: e.latlng.lat, lng: e.latlng.lng }, { updateMap: true, source: 'map-click' });
        });

        // Marker drag -> update continuously
        marker.on('dragstart', () => { isMarkerDragging = true; });
        marker.on('drag', () => {
            const p = marker.getLatLng();
            setCoords({ lat: p.lat, lng: p.lng }, { updateMap: false, source: 'marker-drag' });
        });
        marker.on('dragend', () => {
            isMarkerDragging = false;
            const p = marker.getLatLng();
            map.panTo(p, { animate: true });
            setCoords({ lat: p.lat, lng: p.lng }, { updateMap: false, source: 'marker-dragend' });
        });

        // First render values
        setCoords({ lat: initial.lat, lng: initial.lng }, { updateMap: false, source: 'init' });
    };

    const invalidateSizeSoon = () => {
        if (!map) return;
        // Leaflet needs a tick after the container becomes visible (modal open)
        window.setTimeout(() => map.invalidateSize(), 60);
    };

    const getPermissionState = async () => {
        try {
            if (!navigator.permissions || !navigator.permissions.query) return 'unknown';
            const p = await navigator.permissions.query({ name: 'geolocation' });
            return p && p.state ? p.state : 'unknown';
        } catch {
            return 'unknown';
        }
    };

    const locateViaGPS = async () => {
        showError('');
        showLoading(true, 'Fetching your location…');

        if (!navigator.geolocation) {
            showLoading(false);
            showError('Geolocation is not supported in this browser.');
            return;
        }

        if (!isSecureForGeolocation()) {
            showLoading(false);
            showError('Location needs HTTPS (or localhost). Please open this page over HTTPS to use GPS.');
            return;
        }

        const state = await getPermissionState();
        if (state === 'denied') {
            showLoading(false);
            showError('Location permission denied. Please enable location access in your browser settings.');
            return;
        }

        // Use watchPosition for a better and more accurate fix.
        // Many devices return a coarse first reading; we keep watching briefly and pick the best accuracy.
        stopWatchingGPS();

        let best = null; // {lat,lng,accuracy}
        let gotAnyFix = false;

        const finalize = () => {
            showLoading(false);
            if (!best) {
                showError('Unable to get a GPS fix. Tap the target button to retry, or select location manually on the map.');
                stopWatchingGPS();
                return;
            }

            const { lat, lng, accuracy } = best;
            setCoords({ lat, lng }, { updateMap: true, source: 'gps' });
            invalidateSizeSoon();

            if (coordsEl && accuracy != null) {
                const base = `Lat: ${formatCoord(lat)}  •  Lng: ${formatCoord(lng)}`;
                coordsEl.textContent = `${base}  •  Accuracy: ~${Math.round(accuracy)}m`;
            }

            if (accuracy != null && accuracy > GPS_ACCEPTABLE_ACCURACY_METERS) {
                showError('Your device reported a low-accuracy location. Tap the target button to retry, or move the map to correct it.');
            } else {
                showError('');
            }

            stopWatchingGPS();
        };

        const onFix = (pos) => {
            if (!pos || !pos.coords) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null;

            gotAnyFix = true;

            // Track best (lowest) accuracy reading
            if (!best) best = { lat, lng, accuracy };
            else if (accuracy != null && best.accuracy != null && accuracy < best.accuracy) best = { lat, lng, accuracy };
            else if (best.accuracy == null && accuracy != null) best = { lat, lng, accuracy };

            // Live update UI while improving, so the user sees it refining
            setCoords({ lat, lng }, { updateMap: true, source: 'gps' });
            invalidateSizeSoon();
            if (coordsEl && accuracy != null) {
                const base = `Lat: ${formatCoord(lat)}  •  Lng: ${formatCoord(lng)}`;
                coordsEl.textContent = `${base}  •  Accuracy: ~${Math.round(accuracy)}m`;
            }
            showLoading(true, accuracy != null ? `Improving accuracy… (~${Math.round(accuracy)}m)` : 'Improving accuracy…');

            // If we reached a good accuracy, stop early
            if (accuracy != null && accuracy <= GPS_GOOD_ACCURACY_METERS) {
                finalize();
            }
        };

        const onErr = (err) => {
            showLoading(false);
            stopWatchingGPS();
            if (err && err.code === 1) {
                showError('Location permission denied. You can still select a location by moving the map.');
            } else if (err && err.code === 3) {
                showError('Location request timed out. Tap the target button to retry.');
            } else {
                showError('Unable to fetch your current location. You can still select a location by moving the map.');
            }
        };

        showLoading(true, 'Getting GPS fix…');
        watchId = navigator.geolocation.watchPosition(onFix, onErr, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        });

        // After a short improve window, pick the best fix we got.
        window.setTimeout(() => {
            if (watchId != null) finalize();
        }, GPS_IMPROVE_WINDOW_MS);

        gpsFirstFixTimer = window.setTimeout(() => {
            if (watchId != null) {
                // Hard timeout: if we got any fix, finalize with best; else show error.
                if (gotAnyFix) finalize();
                else {
                    showLoading(false);
                    showError('Unable to get a GPS fix. Tap the target button to retry, or select location manually on the map.');
                    stopWatchingGPS();
                }
            }
        }, GPS_FIRST_FIX_MAX_WAIT_MS);
    };

    // Public API
    const api = {
        /** Initialize map (safe to call multiple times). */
        init() {
            ensureMap();
        },

        /**
         * Call when the picker becomes visible (e.g., modal opens).
         * - Initializes map if needed
         * - Fixes sizing
         * - Tries GPS location (with permission handling)
         */
        async open({ autoLocate = true } = {}) {
            ensureMap();
            invalidateSizeSoon();
            if (autoLocate) {
                // Only auto-locate if there isn't already a chosen coordinate
                const has = latInput.value && lngInput.value;
                if (!has) await locateViaGPS();
            }
        },

        /** Re-center to current GPS position (button action). */
        async recenterToCurrentLocation() {
            ensureMap();
            await locateViaGPS();
        },

        /**
         * Programmatically set selection from external geocoding (manual address entry).
         * Keeps the marker/map + lat/lng inputs in sync with the typed address.
         */
        setValue({ latitude, longitude, address }) {
            if (typeof address === 'string') {
                addressInput.value = address;
            }
            if (typeof latitude === 'number' && typeof longitude === 'number') {
                setCoords(
                    { lat: latitude, lng: longitude },
                    { updateMap: true, source: 'manual-geocode' }
                );
            }
        },

        /** Get current selection. */
        getValue() {
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);
            return {
                latitude: Number.isFinite(lat) ? lat : null,
                longitude: Number.isFinite(lng) ? lng : null,
                address: addressInput.value || ''
            };
        },

        /** Reset UI state (use when form resets). */
        reset() {
            showError('');
            showLoading(false);
            addressInput.value = '';
            latInput.value = '';
            lngInput.value = '';
            if (coordsEl) coordsEl.textContent = '';
            abortController?.abort();
            abortController = null;
            stopWatchingGPS();
        }
    };

    if (recenterBtn) {
        recenterBtn.addEventListener('click', () => {
            api.recenterToCurrentLocation();
        });
    }

    return api;
}

