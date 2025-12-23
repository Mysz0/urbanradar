import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, User, Home, Map, LogIn, LogOut } from 'lucide-react';
import { supabase } from './supabase'; 

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) fetchProgress(session.user.id);
      setLoading(false);
    };

    const fetchProgress = async (userId) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setUnlockedSpots(data.unlocked_spots || []);
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProgress(session.user.id);
    });

    const params = new URLSearchParams(window.location.search);
    const spotId = params.get('spot');
    if (spotId) verifyAndUnlock(spotId);

    return () => authListener.subscription.unsubscribe();
  }, []);

  const verifyAndUnlock = async (spotId) => {
    if (!user) return;
    setIsVerifying(true);
    try {
      const position = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      const spot = SPOTS[spotId];
      if (!spot) return;

      const dist = Math.sqrt(Math.pow(position.coords.latitude - spot.lat, 2) + Math.pow(position.coords.longitude - spot.lng, 2)) * 111320;

      if (dist <= spot.radius && !unlockedSpots.includes(spotId)) {
        const newUnlocked = [...unlockedSpots, spotId];
        const newPoints = newUnlocked.reduce((sum, id) => sum + (SPOTS[id]?.points || 0), 0);
        
        await supabase.from('profiles').upsert({ id: user.id, unlocked_spots: newUnlocked, total_points: newPoints });
        setUnlockedSpots(newUnlocked);
      }
    } catch (err) { console.error(err); } finally { setIsVerifying(false); }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (SPOTS[id]?.points || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <h1 className="text-4xl font-bold mb-2 text-emerald-400">SpotHunt</h1>
        <p className="mb-8 opacity-70">Scavenge. Scan. Level Up.</p>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center gap-2">
          <LogIn size={20}/> Login with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Header */}
      <div className="bg-slate-800 text-white px-4 pt-12 pb-6">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">SpotHunt</h1>
            <p className="text-slate-400 text-xs">{user.email}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="p-2 bg-slate-700 rounded-full"><LogOut size={18}/></button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-bold">{totalPoints}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Total Points</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{unlockedSpots.length}/{Object.keys(SPOTS).length}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Spots</p>
                </div>
              </div>
            </div>
            
            <h2 className="text-lg font-bold text-slate-800">Your Journey</h2>
            <div className="grid gap-3">
               {unlockedSpots.length === 0 ? <p className="text-slate-400 text-sm italic">No spots found yet. Start scanning!</p> : 
                unlockedSpots.map(id => (
                  <div key={id} className="bg-white p-4 rounded-2xl flex items-center gap-3 border border-slate-200">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><MapPin size={20}/></div>
                    <div><p className="font-bold text-slate-800">{SPOTS[id].name}</p><p className="text-xs text-slate-500">+{SPOTS[id].points} pts</p></div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
           <div className="grid gap-3 pt-4">
             {Object.values(SPOTS).map(spot => (
               <div key={spot.id} className={`p-4 rounded-2xl border-2 ${unlockedSpots.includes(spot.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                 <div className="flex justify-between items-center">
                   <p className="font-bold text-slate-800">{unlockedSpots.includes(spot.id) ? spot.name : "???"}</p>
                   <span className="text-xs font-bold text-slate-400">{spot.points} PTS</span>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-md mx-auto flex justify-around">
          <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-emerald-500' : 'text-slate-400'}><Home/></button>
          <button onClick={() => setActiveTab('map')} className={activeTab === 'map' ? 'text-emerald-500' : 'text-slate-400'}><Map/></button>
          <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-emerald-500' : 'text-slate-400'}><User/></button>
        </div>
      </div>

      {isVerifying && <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 text-white font-bold">Verifying Location...</div>}
    </div>
  );
};

export default NFCSpotCollector;
