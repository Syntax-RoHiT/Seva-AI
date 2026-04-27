import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export default function TeamsPage() {
  const [volunteers, setVolunteers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'VOLUNTEER'), where('approved', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      setVolunteers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    return () => unsub();
  }, []);

  return (
    <div className="h-full bg-gray-50 flex flex-col gap-6 font-sans">
      <div className="bg-white p-6 border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-900">Active Field Teams</h1>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-1">Real-time Volunteer Roster</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200">
          <Users size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">{volunteers.length} Active</span>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 shadow-sm mx-4 md:mx-0 overflow-hidden flex flex-col">
        <TableContainer className="flex-1">
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell className="!bg-gray-50 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500 border-b border-gray-200">Operator</TableCell>
                <TableCell className="!bg-gray-50 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500 border-b border-gray-200">Contact</TableCell>
                <TableCell className="!bg-gray-50 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500 border-b border-gray-200">Organization</TableCell>
                <TableCell className="!bg-gray-50 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500 border-b border-gray-200">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {volunteers.map(v => (
                <TableRow key={v.id} hover>
                  <TableCell className="border-b border-gray-200">
                    <div className="text-xs font-bold text-gray-900 uppercase tracking-wide">{v.displayName || 'Unknown'}</div>
                    <div className="text-[10px] text-gray-400 font-semibold mt-1">UID: {v.id.substring(0,8)}</div>
                  </TableCell>
                  <TableCell className="border-b border-gray-200 text-xs font-medium text-gray-600">{v.email}</TableCell>
                  <TableCell className="border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wider">{v.organization || 'Independent'}</TableCell>
                  <TableCell className="border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500"></span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Available</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {volunteers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-gray-500 text-xs font-bold uppercase tracking-widest">
                    No active volunteers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}
