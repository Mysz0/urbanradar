import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, User, Home, Map, X } from 'lucide-react';

// Mock spots data - in production this comes from your API
const SPOTS = {
  'spot-001': { id: 'spot-001', name: 'Central Park Fountain', lat: 40.7829, lng: -73.9654, radius: 100, points: 50 },
  'spot-002': { id: 'spot-002', name: 'Brooklyn Bridge', lat: 40.7061, lng: -73.9969, radius: 100, points: 75 },
  'spot-003': { id: 'spot-003', name: 'Times Square', lat: 40.7580, lng: -73.9855, radius: 100, points: 100 },
  'spot-004': { id: 'spot-004', name: 'Empire State Building', lat: 40.7484, lng: -73.9857, radius: 100, points: 150 },
  'spot-005': { id: 'spot-005', name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445, radius: 100, points: 200 },
};

const NFCSpotCollector = () => {
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '', spot: null });
  const [userId, setUserId] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('unlockedSpots');
    if (stored) {
      setUnlockedSpots(JSON.parse(stored));
    }

    let uid = localStorage.getItem('userId');
    if (!uid) {
      uid = 'user-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', uid);
    }
    setUserId(uid);

    const params = new URLSearchParams(window.location.search);
    const spotId = params.get('spot');
    if (spotId) {
      verifyAndUnlock(spotId);
    }
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const showNotif = (type, message, spot = null) => {
    setNotification({ type, message, spot });
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  const verifyAndUnlock = async (spotId) => {
    setIsVerifying(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      setCurrentLocation({ lat: userLat, lng: userLng });

      const spot = SPOTS[spotId];
      if (!spot) {
        showNotif('error', 'Invalid location code');
        setIsVerifying(false);
        return;
      }

      const distance = calculateDistance(userLat, userLng, spot.lat, spot.lng);

      if (distance <= spot.radius) {
        if (!unlockedSpots.includes(spotId)) {
          const newUnlocked = [...unlockedSpots, spotId];
          setUnlockedSpots(newUnlocked);
          localStorage.setItem('unlockedSpots', JSON.stringify(newUnlocked));
          showNotif('success', `+${spot.points} points`, spot);
        } else {
          showNotif('info', 'Already discovered');
        }
      } else {
        showNotif('error', `Too far away (${Math.round(distance)}m)`);
      }
    } catch (error) {
      if (error.code === 1) {
        showNotif('error', 'Location access denied');
      } else {
        showNotif('error', 'Could not get location');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (SPOTS[id]?.points || 0), 0);

  const HomeTab = () => (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-300">Welcome back</p>
              <p className="font-medium text-lg">Explorer</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">{totalPoints}</p>
              <p className="text-sm text-slate-300">Total Points</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{unlockedSpots.length}/{Object.keys(SPOTS).length}</p>
              <p className="text-sm text-slate-300">Discovered</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Activity</h2>
        {unlockedSpots.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">No spots discovered yet</p>
            <p className="text-sm text-slate-500">Find an NFC tag to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...unlockedSpots].reverse().slice(0, 3).map((spotId) => {
              const spot = SPOTS[spotId];
              return (
                <div key={spotId} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{spot.name}</p>
                    <p className="text-sm text-slate-500">+{spot.points} points</p>
                  </div>
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
        <h3 className="font-bold text-lg mb-2">How to play</h3>
        <ol className="space-y-2 text-sm opacity-90">
          <li>1. Find NFC tags around the city</li>
          <li>2. Scan with your phone</li>
          <li>3. Be close to unlock spots</li>
          <li>4. Collect points and discover all locations</li>
        </ol>
      </div>
    </div>
  );

  const MapTab = () => (
    <div className="space-y-4 pb-20">
      <div className="bg-slate-800 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Locations</h2>
          <span className="text-sm text-slate-300">{unlockedSpots.length}/{Object.keys(SPOTS).length}</span>
        </div>
        <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full transition-all duration-700 ease-out"
            style={{ width: `${(unlockedSpots.length / Object.keys(SPOTS).length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {Object.values(SPOTS).map((spot) => {
          const isUnlocked = unlockedSpots.includes(spot.id);
          return (
            <div 
              key={spot.id}
              className={`rounded-2xl p-4 border-2 transition-all duration-300 ${
                isUnlocked 
                  ? 'bg-emerald-50 border-emerald-300' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isUnlocked ? 'bg-emerald-500' : 'bg-slate-300'
                }`}>
                  {isUnlocked ? (
                    <span className="text-white text-lg">✓</span>
                  ) : (
                    <span className="text-white text-lg">?</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{isUnlocked ? spot.name : '???'}</h3>
                  <p className="text-sm text-slate-600 mb-2">
                    {isUnlocked ? `${spot.points} points earned` : 'Scan NFC tag to discover'}
                  </p>
                  {!isUnlocked && (
                    <button
                      onClick={() => verifyAndUnlock(spot.id)}
                      disabled={isVerifying}
                      className="text-sm bg-slate-800 text-white px-4 py-2 rounded-full hover:bg-slate-700 transition-colors disabled:bg-slate-400"
                    >
                      Test Scan
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ProfileTab = () => (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
            <User size={36} className="text-purple-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">Explorer</p>
            <p className="text-sm opacity-80">ID: {userId.slice(0, 12)}...</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold">{totalPoints}</p>
            <p className="text-xs opacity-80">Points</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{unlockedSpots.length}</p>
            <p className="text-xs opacity-80">Spots</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{Math.round((unlockedSpots.length / Object.keys(SPOTS).length) * 100)}%</p>
            <p className="text-xs opacity-80">Complete</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Trophy className="text-yellow-500" size={20} />
          Achievements
        </h3>
        <div className="space-y-3">
          <div className={`flex items-center gap-3 p-3 rounded-xl ${unlockedSpots.length >= 1 ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unlockedSpots.length >= 1 ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className="text-white">🎯</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-slate-800">First Steps</p>
              <p className="text-xs text-slate-500">Discover your first spot</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${unlockedSpots.length >= 3 ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unlockedSpots.length >= 3 ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className="text-white">🔥</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-slate-800">On Fire</p>
              <p className="text-xs text-slate-500">Discover 3 spots</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${unlockedSpots.length === Object.keys(SPOTS).length ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unlockedSpots.length === Object.keys(SPOTS).length ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className="text-white">👑</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-slate-800">Completionist</p>
              <p className="text-xs text-slate-500">Discover all spots</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Notification */}
      <div className={`fixed top-4 left-4 right-4 z-50 transition-all duration-300 ${showNotification ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className={`rounded-2xl p-4 shadow-lg backdrop-blur-sm ${
          notification.type === 'success' ? 'bg-emerald-500' :
          notification.type === 'error' ? 'bg-red-500' :
          'bg-blue-500'
        }`}>
          {notification.type === 'success' && notification.spot ? (
            <div className="text-white">
              <p className="font-bold text-lg mb-1">🎉 Spot Unlocked!</p>
              <p className="text-sm opacity-90">{notification.spot.name}</p>
              <p className="text-lg font-bold mt-2">{notification.message}</p>
            </div>
          ) : (
            <p className="text-white font-medium text-center">{notification.message}</p>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800 text-white px-4 pt-12 pb-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-1">SpotHunt</h1>
          <p className="text-slate-300 text-sm">Discover the world around you</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 -mt-2">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-around py-4">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-emerald-500' : 'text-slate-400'}`}
            >
              <Home size={24} />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'map' ? 'text-emerald-500' : 'text-slate-400'}`}
            >
              <Map size={24} />
              <span className="text-xs font-medium">Locations</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-emerald-500' : 'text-slate-400'}`}
            >
              <User size={24} />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl p-8">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-800 font-medium">Verifying location...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFCSpotCollector;