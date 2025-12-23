import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, User, Home, Map, LogIn, LogOut } from 'lucide-react';
import { supabase } from './supabase'; // Ensure this file has the createClient logic

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
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // 1. Sync User and Data from Database
  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('unlocked_spots')
          .eq('id', session.user.id)
          .single();
        
        if (data) setUnlockedSpots(data.unlocked_spots || []);
      }
    };

    getData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) getData(); // Refresh data on login
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // 2. The Unlock Logic with Database Save
  const verifyAndUnlock = async (spotId) => {
    if (!user) return alert("Please sign in first!");
    
    setIsVerifying(true);
    try {
      const position = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      const { latitude: uLat, longitude: uLng } = position.coords;
      const spot = SPOTS[spotId];

      // Calculate distance (Haversine or simple approximation)
      const dist = Math.sqrt(Math.pow(uLat - spot.lat, 2) + Math.pow(uLng - spot.lng, 2)) * 111320;

      if (dist <= spot.radius) {
        if (!unlockedSpots.includes(spotId)) {
          const newSpots = [...unlockedSpots, spotId];
          const newPoints = newSpots.reduce((s, id) => s + (SPOTS[id]?.points || 0), 0);

          // SAVE TO SUPABASE
          const { error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, unlocked_spots: newSpots, total_points: newPoints });

          if (error) throw error;
          setUnlockedSpots(newSpots);
          alert(`Success! Found ${spot.name}`);
        }
      } else {
        alert("Too far away!");
      }
    } catch (err) {
      console.error(err);
      alert("Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  // UI Helper for Login
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <h1 className="text-4xl font-bold mb-4 text-emerald-400">SpotHunt</h1>
        <p className="mb-8 opacity-70">Sign in to save your progress</p>
        <button 
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
          className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2"
        >
          <LogIn size={20}/> Login with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Your existing tabs (Home, Map, Profile) go here */}
      <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
        <h2 className="font-bold">SpotHunt</h2>
        <button onClick={() => supabase.auth.signOut()}><LogOut size={20}/></button>
      </div>

      <div className="max-w-md mx-auto p-4">
        {activeTab === 'home' && (
           <div className="bg-white p-6 rounded-2xl shadow-sm">
              <p className="text-slate-500">Points</p>
              <h3 className="text-4xl font-bold">
                {unlockedSpots.reduce((s, id) => s + (SPOTS[id]?.points || 0), 0)}
              </h3>
           </div>
        )}
        {/* Map and Profile tabs here */}
      </div>

      {/* Verification Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl animate-bounce">Verifying Location...</div>
        </div>
      )}
    </div>
  );
};

export default NFCSpotCollector;
