import React from 'react';
import { 
  Grid,
  Dialog,
  DialogContent,
  IconButton
} from '@mui/material';
import { 
  MapPin, 
  CheckCircle2, 
  X, 
  Navigation,
  Zap,
  Activity,
  ChevronRight,
  Target,
  Signal,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { startGPSTracking, stopGPSTracking } from '../../services/gpsService';


export default function VolunteerDashboard() {
  const { user, loading } = useAuth();
  const [online, setOnline] = React.useState(true);
  const [missions, setMissions] = React.useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = React.useState<any[]>([]);
  const [activeMission, setActiveMission] = React.useState<any>(null);
  const [currentActiveMission, setCurrentActiveMission] = React.useState<any>(null);
  const [showMission, setShowMission] = React.useState(false);
  const [gpsError, setGpsError] = React.useState<string | null>(null);
  const [gpsActive, setGpsActive] = React.useState(false);

  // Start GPS tracking when user is online and update Firestore
  React.useEffect(() => {
    if (!user || loading) return;
    
    const userRef = doc(db, 'users', user.uid);
    
    if (online) {
      startGPSTracking(user.uid, (err) => setGpsError(err));
      setGpsActive(true);
      updateDoc(userRef, { online: true }).catch(console.error);
    } else {
      stopGPSTracking(user.uid);
      setGpsActive(false);
      updateDoc(userRef, { online: false }).catch(console.error);
    }
    
    return () => {
      if (user) {
        stopGPSTracking(user.uid);
        // We do not immediately set offline on unmount to prevent flickering, 
        // but could if strict offline status is required.
      }
    };
  }, [online, user, loading]);

  // Listen to PENDING missions and COMPLETED missions
  React.useEffect(() => {
    if (loading || !user) return;

    // Listen to available missions matched to this volunteer or pending
    const qPending = query(
      collection(db, 'missions'), 
      where('status', '==', 'PENDING')
    );

    const unsubPending = onSnapshot(qPending, (snapshot) => {
      const liveMissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      // Filter for missions explicitly assigned to this volunteer or broadcasted
      const relevant = liveMissions.filter(m => !m.volunteerId || m.volunteerId === user.uid);
      setMissions(relevant);
    }, (error) => {
      console.error("Volunteer pending snapshot error:", error);
    });

    // Listen to completed missions by this volunteer
    const qCompleted = query(
      collection(db, 'missions'),
      where('volunteerId', '==', user.uid),
      where('status', '==', 'COMPLETED')
    );

    const unsubCompleted = onSnapshot(qCompleted, (snapshot) => {
      const completed = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      setCompletedMissions(completed);
    }, (error) => {
      console.error("Volunteer completed snapshot error:", error);
    });

    // Listen to currently active dispatched mission
    const qActive = query(
      collection(db, 'missions'),
      where('volunteerId', '==', user.uid),
      where('status', '==', 'DISPATCHED')
    );

    const unsubActive = onSnapshot(qActive, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentActiveMission({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setCurrentActiveMission(null);
      }
    });

    return () => {
      unsubPending();
      unsubCompleted();
      unsubActive();
    };
  }, [user, loading]);

  const handleAcceptMission = async (missionId: string) => {
    try {
      const mission = missions.find(m => m.id === missionId);
      if (!mission) return;

      const missionRef = doc(db, 'missions', missionId);
      const reportRef = doc(db, 'reports', mission.reportId);

      await Promise.all([
        updateDoc(missionRef, {
          status: 'DISPATCHED',
          volunteerId: user?.uid,
          volunteerName: user?.displayName,
          dispatchedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }),
        updateDoc(reportRef, {
          status: 'DISPATCHED',
          assignedTo: user?.uid,
          assignedName: user?.displayName,
          updatedAt: serverTimestamp()
        })
      ]);

      setShowMission(false);
      setActiveMission(null);
    } catch (error) {
      console.error("Mission acceptance failed", error);
    }
  };

  const handleCompleteMission = async (missionId: string) => {
    try {
      const mission = currentActiveMission || completedMissions.find(m => m.id === missionId);
      if (!mission) return;

      const missionRef = doc(db, 'missions', missionId);
      const reportRef = doc(db, 'reports', mission.reportId);
      const userRef = doc(db, 'users', user.uid);

      await Promise.all([
        updateDoc(missionRef, {
          status: 'COMPLETED',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }),
        updateDoc(reportRef, {
          status: 'RESOLVED',
          updatedAt: serverTimestamp()
        }),
        updateDoc(userRef, {
          currentMissionId: null
        })
      ]);
    } catch (error) {
      console.error("Mission completion failed", error);
    }
  };

  return (
    <div className="h-full font-sans text-gray-900 bg-gray-50 flex flex-col gap-6 p-0 md:p-0">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Field Signal Locked</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 uppercase">Volunteer Hub</h1>
          <p className="text-gray-500 text-sm uppercase tracking-wider mt-2 font-semibold">Operator ID: {user?.displayName || 'VOLUNTEER-01'}</p>
        </div>
        
        <div className="flex items-center gap-6 border border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex flex-col items-end">
            <span className={`text-xs font-bold uppercase tracking-widest mb-1 ${gpsActive ? 'text-green-600' : 'text-gray-400'}`}>
              {gpsError ? 'GPS Error' : gpsActive ? 'GPS Active' : 'GPS Offline'}
            </span>
            <span className="text-xs font-semibold text-gray-500">Location Broadcast</span>
          </div>
          <div className="w-px h-8 bg-gray-300" />
          <div className="text-right">
            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${online ? 'text-blue-600' : 'text-gray-400'}`}>
              {online ? 'Status: Available' : 'Status: Offline'}
            </div>
            <button 
              onClick={() => setOnline(!online)}
              className={`text-xs font-bold uppercase tracking-widest px-3 py-1 border transition-colors ${online ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'}`}
            >
              Toggle Status
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-center min-h-0 px-4 md:px-0">
        <div className="w-full max-w-4xl h-full flex flex-col overflow-y-auto scrollbar-hide pb-6 gap-6">
          {/* Dispatch Area */}
          <div className={`bg-white shrink-0 p-8 md:p-12 relative overflow-hidden transition-all duration-300 border ${missions.length > 0 ? 'border-blue-300 shadow-sm' : 'border-gray-200'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Signal size={200} strokeWidth={0.5} />
            </div>

            <div className="relative z-10">
              {currentActiveMission ? (
                // ACTIVE DEPLOYMENT VIEW
                <div className="bg-blue-50 border border-blue-200 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600 text-white rounded-full animate-pulse">
                        <Navigation size={24} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Active Deployment</div>
                        <h3 className="text-xl font-bold uppercase tracking-tight text-gray-900 mt-1">
                          {currentActiveMission.type || 'Emergency'} Task
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Mission Location Map */}
                  {currentActiveMission.location?.lat && (
                    <div className="mb-6 overflow-hidden border border-blue-200">
                      <iframe
                        title="Mission Location"
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps?q=${currentActiveMission.location.lat},${currentActiveMission.location.lng}&z=15&output=embed`}
                        allowFullScreen
                      />
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${currentActiveMission.location.lat},${currentActiveMission.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors"
                      >
                        <Navigation size={14} /> Open in Google Maps
                      </a>
                    </div>
                  )}

                  <div className="mb-6 p-4 bg-white border border-blue-100">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Target Location</div>
                    <div className="font-semibold text-gray-900">{currentActiveMission.locationDescription || 'Unknown'}</div>
                    <div className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Severity / Urgency</div>
                    <div className="font-semibold text-red-600">{currentActiveMission.urgencyScore?.toFixed(1) || 'High'}</div>
                  </div>
                  <button 
                    onClick={() => handleCompleteMission(currentActiveMission.id)}
                    className="w-full py-4 bg-green-600 text-white text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <CheckCircle2 size={20} />
                    Mark Issue as Resolved
                  </button>
                </div>
              ) : (
                // PENDING TASKS VIEW
                <>
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`p-4 border ${missions.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <Target size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold uppercase tracking-tight text-gray-900">
                        {missions.length > 0 ? `${missions.length} Optimal Task(s) Found` : 'Scanning for Tasks...'}
                      </h2>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-semibold">Proximity Matching: Active</p>
                    </div>
                  </div>

                  <div className="max-w-md">
                    <p className="text-sm text-gray-600 mb-10 leading-relaxed font-medium">
                      {missions.length > 0 
                        ? 'The algorithm has identified high-priority tasks near your current location matching your skills. Review and accept deployment below.' 
                        : 'Standing by for assignments. Keep your location services active to receive the best matches when emergencies occur.'}
                    </p>

                    <button 
                      disabled={missions.length === 0}
                      onClick={() => {
                        setActiveMission(missions[0]);
                        setShowMission(true);
                      }}
                      className={`px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-4 w-full sm:w-auto ${
                        missions.length > 0 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      }`}
                    >
                      {missions.length > 0 ? 'Review Deployment' : 'Awaiting Assignment'}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-lg font-bold uppercase tracking-wide text-gray-900 mb-6 flex justify-between items-center">
              <span>Completed Operations</span>
              <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 border border-blue-100">{completedMissions.length} TOTAL</span>
            </h3>
            
            {completedMissions.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 text-gray-400 uppercase text-xs tracking-widest font-bold">
                No missions completed yet
              </div>
            ) : (
              <div className="space-y-4">
                {completedMissions.map((mission) => (
                  <div key={mission.id} className="bg-white p-6 border border-gray-200 hover:border-gray-300 transition-colors flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-bold uppercase tracking-wide text-gray-900 mb-1">
                          {mission.type || 'Field Support'} • {mission.locationDescription || 'Unknown Location'}
                        </div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">
                          Task Completed • {mission.completedAt?.toDate().toLocaleTimeString() || '00:00'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-600 tracking-tight">+{Math.round((mission.urgencyScore || 5) * 20)} XP</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mission Modal */}
      <Dialog 
        open={showMission} 
        onClose={() => setShowMission(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ className: "!bg-white !rounded-none !border !border-gray-200 !shadow-lg relative" }}
      >
        <DialogContent className="!p-0">
          <div className="h-52 bg-gray-100 relative border-b border-gray-200 overflow-hidden">
            {activeMission?.location?.lat ? (
              <iframe
                title="Mission Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={`https://www.google.com/maps?q=${activeMission.location.lat},${activeMission.location.lng}&z=15&output=embed`}
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 bg-blue-900/10 flex items-center justify-center text-gray-400 text-xs uppercase font-bold tracking-widest">
                Location Unavailable
              </div>
            )}
            <IconButton 
              onClick={() => setShowMission(false)} 
              className="!absolute !top-2 !right-2 !bg-white !text-gray-900 hover:!bg-gray-100 border border-gray-200 !rounded-none"
            >
              <X size={16} />
            </IconButton>
          </div>
          
          <div className="p-8">
            <div className="mb-8">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Deployment Opportunity</div>
              <h3 className="text-2xl font-bold uppercase tracking-tight leading-tight mb-4 text-gray-900">
                {activeMission?.type || activeMission?.needType?.[0] || 'Emergency'} Task • {activeMission?.locationDescription || 'Unknown Area'}
              </h3>
              
              <div className="flex flex-wrap gap-3">
                <div className="px-3 py-1 bg-gray-50 border border-gray-200 flex items-center gap-2 text-xs font-bold uppercase text-gray-600">
                  <MapPin size={12} />
                  GPS Verified
                </div>
                <div className="px-3 py-1 bg-blue-50 border border-blue-200 flex items-center gap-2 text-xs font-bold uppercase text-blue-700">
                  <Activity size={12} />
                  Urgency: {activeMission?.urgencyScore?.toFixed(1) || 'Critical'}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-8 border-l-4 border-blue-600 pl-4 py-1 font-medium">
              {activeMission?.text || activeMission?.summary || 'No detailed briefing available for this deployment.'}
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => handleAcceptMission(activeMission?.id)}
                className="w-full py-4 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors shadow-sm"
              >
                Accept Deployment
                <Navigation size={18} />
              </button>
              
              <div className="flex gap-4">
                <button className="flex-1 py-3 border border-gray-300 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors">
                  Details
                </button>
                <button className="flex-1 py-3 border border-gray-300 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors">
                  Contact
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
