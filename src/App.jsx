import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, User, Home, Map, X, LogIn } from 'lucide-react';
import { supabase } from './supabase'; // Make sure you created this file!

const SPOTS = {
  'spot-001': { id: 'spot-001', name: 'Central Park Fountain', lat: 40.7829, lng: -73.9654, radius: 100, points: 50 },
  'spot-002': { id: 'spot-002', name: 'Brooklyn Bridge', lat: 40.7061, lng: -73.9969, radius: 100, points: 75 },
  'spot-003': { id: 'spot-003', name: 'Times Square', lat: 40.7580, lng: -73.9855, radius: 100, points: 100 },
  'spot-004': { id: 'spot-004', name: 'Empire State Building', lat: 40.7484, lng: -73.9857, radius: 100, points: 150 },
  'spot-005': { id: 'spot-005', name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445, radius: 100, points: 200 },
};

const NFCSpotCollector = () => {
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '', spot: null });
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  // 1. Check for logged in user and load data from Supabase
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data) {
          setUnlockedSpots(data.unlocked_spots || []);
        }
      }
    };

    initSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Check URL for spot parameter
    const params = new URLSearchParams(window.location.search);
    const spotId = params.get('spot');
    if (spotId) verifyAndUnlock(spotId);

    return () => authListener.subscription.unsubscribe();
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
    if (!user) {
      showNotif('error', 'Please log in to save progress!');
      return;
    }

    setIsVerifying(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const spot = SPOTS[spotId];

      if (!spot) {
        showNotif('error', 'Invalid location code');
        return;
      }

      const distance = calculateDistance(userLat, userLng, spot.lat, spot.lng);

      if (distance <= spot.radius) {
        if (!unlockedSpots.includes(spotId)) {
          const newUnlocked = [...unlockedSpots, spotId];
          const newPoints = newUnlocked.reduce((sum, id) => sum + (SPOTS[id]?.points || 0), 0);

          // SAVE TO SUPABASE
          const { error: dbError } = await supabase
            .from('profiles')
            .upsert({ 
              id: user.id, 
              unlocked_spots: newUnlocked, 
              total_points: newPoints 
            });

          if (dbError) throw dbError;

          setUnlockedSpots(newUnlocked);
          showNotif('success', `+${spot.points} points`, spot);
        } else {
          showNotif('info', 'Already discovered');
        }
      } else {
        showNotif('error', `Too far away (${Math.round(distance)}m)`);
      }
    } catch (error) {
      showNotif('error', 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (SPOTS[id]?.points || 0), 0);

  // --- UI COMPONENTS ---
  
  const LoginView = () => (
    <div className="flex flex-col items-center justify-center p-10 text-center space-y-4">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
        <LogIn size={40} className="text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold">Sign in to play</h2>
      <p className="text-slate-500">Your progress will be saved to the cloud.</p>
      <button 
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold w-full"
      >
        Sign in with GitHub
      </button>
    </div>
  );

  const HomeTab = () => (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-300">Welcome back</p>
              <p className="font-medium text-lg">{user?.email || 'Explorer'}</p>
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
      {/* ... Recent Activity section from your previous code ... */}
    </div>
  );

  // ... ProfileTab and MapTab from your original code (updated to use global 'user' state) ...

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Notification logic remains the same */}
      <div className="bg-slate-800 text-white px-4 pt-12 pb-6">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">SpotHunt</h1>
            <p className="text-slate-300 text-sm">NFC Scavenger Hunt</p>
          </div>
          {user && <button onClick={() => supabase.auth.signOut()} className="text-xs bg-slate-700 px-3 py-1 rounded">Logout</button>}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-2">
        {!user ? <LoginView /> : (
          <>
            {activeTab === 'home' && <HomeTab />}
            {activeTab === 'map' && <MapTab />}
            {activeTab === 'profile' && <ProfileTab />}
          </>
        )}
      </div>

      {/* Bottom Nav remains the same */}
    </div>
  );
};

export default NFCSpotCollector;
