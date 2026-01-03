import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Target, Lock, CheckCircle2, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function ZoomHandler({ setZoom }) {
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
  });
  return null;
}

function MapRecenter({ location, isFollowing }) {
  const map = useMap();
  
  useEffect(() => {
    if (!location || !isFollowing) return;
    map.panTo([location.lat, location.lng], {
      animate: true,
      duration: 1.0 
    });
  }, [location, isFollowing, map]);
  
  return null;
}

function MapInvalidator({ isFullScreen }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { 
      map.invalidateSize(); 
    }, 100);
    return () => clearTimeout(timer);
  }, [map, isFullScreen]);
  return null;
}

function RightClickPan() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let isPanning = false;
    let lastPoint = null;

    const handleContextMenu = (event) => {
      // Keep the UI clean while enabling right-button panning
      event.preventDefault();
    };

    const handleMouseDown = (event) => {
      if (event.button !== 2) return; // right button only
      event.preventDefault();
      isPanning = true;
      lastPoint = map.mouseEventToContainerPoint(event);
    };

    const handleMouseMove = (event) => {
      if (!isPanning || !lastPoint) return;
      const currentPoint = map.mouseEventToContainerPoint(event);
      const delta = lastPoint.subtract(currentPoint);
      if (delta.x !== 0 || delta.y !== 0) {
        map.panBy(delta, { animate: false });
        lastPoint = currentPoint;
      }
    };

    const handleMouseUp = () => {
      isPanning = false;
      lastPoint = null;
    };

    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [map]);

  return null;
}

function PriorityClickHandler({ spots, markerRefs }) {
  const map = useMap();

  useMapEvents({
    click: (event) => {
      if (event.originalEvent?.target?.closest('.leaflet-control')) return;

      const clickPoint = map.mouseEventToContainerPoint(event.originalEvent);
      const thresholdPx = 28;

      let nearest = null;

      spots.forEach((spot) => {
        const point = map.latLngToContainerPoint([spot.lat, spot.lng]);
        const dist = clickPoint.distanceTo(point);
        if (dist <= thresholdPx && (!nearest || dist < nearest.dist)) {
          nearest = { spot, dist };
        }
      });

      if (!nearest) return;

      const ref = markerRefs.current[nearest.spot.id];
      if (ref?.openPopup) ref.openPopup();
    }
  });

  return null;
}

function MapInterface({ stableUserLoc, claimRadius, customRadius, radiusBonus, onRecenter }) {
  const map = useMap();
  
  const finalScan = (customRadius || 250) + (radiusBonus || 0);
  const finalClaim = (claimRadius || 20) + (radiusBonus || 0);

  return (
    <>
      <div className="leaflet-top leaflet-right" style={{ marginTop: '24px', marginRight: '24px' }}>
        <div className="leaflet-control pointer-events-auto">
          <button
            onClick={(e) => {
              e.preventDefault();
              if (stableUserLoc) {
                map.flyTo([stableUserLoc.lat, stableUserLoc.lng], 16, { duration: 1 });
                onRecenter();
              }
            }}
            className="smart-glass w-12 h-12 flex items-center justify-center rounded-2xl active:scale-90 transition-all shadow-2xl border"
          >
            <Target size={22} className="text-[rgb(var(--theme-primary))]" />
          </button>
        </div>
      </div>

      <div className="leaflet-bottom leaflet-left leaflet-right" style={{ marginBottom: '24px', padding: '0 24px' }}>
        <div className="leaflet-control w-full pointer-events-none">
          <div className="smart-glass border p-4 rounded-3xl flex justify-between items-center shadow-2xl w-full pointer-events-auto">
            <div className="text-[10px] font-bold tracking-widest uppercase opacity-70">
              {stableUserLoc ? `${stableUserLoc.lat.toFixed(5)}°N ${stableUserLoc.lng.toFixed(5)}°E` : 'LOCATING...'}
            </div>
            <div className="text-[rgb(var(--theme-primary))] font-black text-[10px] uppercase tracking-tighter flex items-center gap-5">
              <span className="opacity-60 flex items-center gap-1">
                {radiusBonus > 0 && <Zap size={10} className="animate-pulse" />} CLAIM: {finalClaim}M
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--theme-primary))] animate-pulse" />
                SCAN: {finalScan}M
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ExploreTab({ 
  spots = {}, 
  unlockedSpots = [], 
  userLocation, 
  isDark, 
  claimRadius, 
  customRadius,
  radiusBonus = 0,
  onVote 
}) {
  const [zoom, setZoom] = useState(16);
  const [isFollowing, setIsFollowing] = useState(!!userLocation);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const markerRefs = useRef({});

  // Toggle a body class so global UI (navbar, theme toggle) can hide in fullscreen
  useEffect(() => {
    const cls = 'map-fullscreen';
    const body = document.body;
    if (isFullScreen) body.classList.add(cls); else body.classList.remove(cls);
    return () => body.classList.remove(cls);
  }, [isFullScreen]);

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  // Use dynamic viewport units to avoid iOS safe-area jump on address bar hide/show
  const mapHeight = isFullScreen ? '100dvh' : '70vh';

  const MapDragHandler = () => {
    useMapEvents({
      dragstart: () => setIsFollowing(false),
      zoomstart: () => setIsFollowing(false),
    });
    return null;
  };

  const stableUserLoc = useMemo(() => {
    if (!userLocation?.lat || !userLocation?.lng) return null;
    return { lat: userLocation.lat, lng: userLocation.lng };
  }, [userLocation?.lat, userLocation?.lng]);

  const fallbackCenter = [20, 0];

  const animatedUserIcon = useMemo(() => {
    const size = 60;
    return L.divIcon({
      className: 'soft-radar-icon',
      html: `
        <div class="relative flex items-center justify-center w-full h-full">
          <div class="absolute w-8 h-8 bg-[rgb(var(--theme-primary))] rounded-full opacity-20 animate-ping"></div>
          <div class="w-4 h-4 bg-white border-2 border-[rgb(var(--theme-primary))] rounded-full shadow-lg z-10"></div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }, []);

  const spotIcon = (isUnlocked) => L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;pointer-events:auto;">
        <div class="marker-pin-spot ${isUnlocked ? 'unlocked' : ''}"><div class="dot"></div></div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });

  return (
    <div
      className={`${isFullScreen ? 'fixed inset-0 z-[1200]' : 'relative w-full mt-4 mb-10'} rounded-[32px] overflow-hidden border transition-all duration-500 bg-[var(--theme-map-bg)] shadow-2xl`}
      style={{ minHeight: mapHeight, height: mapHeight }}
    >
      <div className="absolute top-4 left-4 z-[1300] pointer-events-none">
        <button
          onClick={toggleFullScreen}
          className="pointer-events-auto smart-glass border px-3 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.12em] shadow-lg hover:scale-95 active:scale-90 transition"
        >
          {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </div>

      <div className="relative w-full h-full">
        <MapContainer 
          center={stableUserLoc ? [stableUserLoc.lat, stableUserLoc.lng] : fallbackCenter} 
          zoom={stableUserLoc ? 16 : 2} 
          minZoom={3}
          maxZoom={18}
          maxBounds={[[-85, -180], [85, 180]]}
          zoomControl={false} 
          style={{ height: '100%', width: '100%' }}
          className="leaflet-container"
          worldCopyJump={false}
          maxBoundsViscosity={1.0}
        >
          <ZoomHandler setZoom={setZoom} />
          <MapInvalidator isFullScreen={isFullScreen} />
          <MapRecenter location={stableUserLoc} isFollowing={isFollowing} />
          <RightClickPan />
          <PriorityClickHandler spots={Object.values(spots)} markerRefs={markerRefs} />
          <MapDragHandler />
          
          <TileLayer
            key={isDark ? 'dark' : 'light'}
            url={isDark 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
            keepBuffer={3}
          />

          <MapInterface 
            stableUserLoc={stableUserLoc} 
            claimRadius={claimRadius} 
            customRadius={customRadius} 
            radiusBonus={radiusBonus}
            onRecenter={() => setIsFollowing(true)}
          />

          {stableUserLoc && (
            <React.Fragment key={`user-loc-${stableUserLoc.lat}-${stableUserLoc.lng}-${radiusBonus}`}>
              <Circle 
                center={[stableUserLoc.lat, stableUserLoc.lng]}
                radius={(claimRadius || 20) + radiusBonus}
                pathOptions={{
                  fillColor: 'rgb(var(--theme-primary))',
                  fillOpacity: 0.15,
                  color: 'rgb(var(--theme-primary))',
                  weight: 2,
                  dashArray: '5, 5'
                }}
              />
              
              <Circle 
                center={[stableUserLoc.lat, stableUserLoc.lng]}
                radius={(customRadius || 250) + radiusBonus}
                pathOptions={{
                  fillColor: 'rgb(var(--theme-primary))',
                  fillOpacity: 0.05,
                  color: 'rgb(var(--theme-primary))',
                  weight: 1,
                  dashArray: '5, 10'
                }}
              />
              
              <Marker 
                position={[stableUserLoc.lat, stableUserLoc.lng]} 
                icon={animatedUserIcon} 
                zIndexOffset={1000} 
              />
            </React.Fragment>
          )}

          {Object.values(spots).map((spot) => {
            const isUnlocked = unlockedSpots.includes(spot.id);
            const hasUpvoted = spot.myVote === 'up';
            const hasDownvoted = spot.myVote === 'down';

            return (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lng]}
                icon={spotIcon(isUnlocked)}
                ref={(node) => { if (node) markerRefs.current[spot.id] = node; }}
              >
                <Popup closeButton={false} offset={[0, -5]}>
                  <div className="smart-glass p-1.5 px-2 rounded-xl border min-w-[140px] shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-[7px] font-black uppercase tracking-[0.2em] ${isUnlocked ? 'text-[rgb(var(--theme-primary))]' : 'opacity-40'}`}>
                        {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                      </p>
                      {isUnlocked ? <CheckCircle2 size={8} className="text-[rgb(var(--theme-primary))]" /> : <Lock size={8} className="opacity-40" />}
                    </div>
                    
                    <p className="text-[10px] font-bold truncate mb-1.5">{spot.name}</p>

                    <div className="flex items-center justify-between pt-1.5 border-t border-current opacity-10">
                      <div className="flex items-center gap-2 opacity-100">
                        <button 
                          disabled={!isUnlocked}
                          onClick={() => isUnlocked && onVote(spot.id, 'upvotes')}
                          className={`p-1 rounded-md transition-all duration-300 ${
                            isUnlocked 
                              ? hasUpvoted 
                                ? 'bg-[rgb(var(--theme-primary))] text-white shadow-[0_0_10px_rgba(var(--theme-primary),0.5)] scale-110' 
                                : 'hover:bg-[rgb(var(--theme-primary))]/20 text-[rgb(var(--theme-primary))]' 
                              : 'opacity-10 grayscale cursor-not-allowed'
                          }`}
                        >
                          <ChevronUp size={12} strokeWidth={hasUpvoted ? 4 : 2} />
                        </button>
                        <span className="vote-count-net text-[10px] font-bold w-7 text-center">{(spot.upvotes || 0) - (spot.downvotes || 0)}</span>
                        <button 
                          disabled={!isUnlocked}
                          onClick={() => isUnlocked && onVote(spot.id, 'downvotes')}
                          className={`p-1 rounded-md transition-all duration-300 ${
                            isUnlocked 
                              ? hasDownvoted 
                                ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] scale-110' 
                                : 'hover:bg-red-500/20 text-red-500 rounded-md' 
                              : 'opacity-50 cursor-not-allowed rounded-md'
                          }`}
                        >
                          <ChevronDown size={12} strokeWidth={hasDownvoted ? 4 : 2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
