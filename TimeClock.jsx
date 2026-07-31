'use client';

import { useState, useEffect } from 'react';
import { Clock, ArrowLeft, Lock, Users, Plus, Trash2, LogIn, LogOut, Wallet } from 'lucide-react';

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function startOfMonth(d) { const x = startOfDay(d); x.setDate(1); return x; }

const fmtDuration = (hrs) => {
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
};
const fmtHours1 = (hrs) => hrs.toFixed(1);
const fmtMoney = (n) => Math.round(n).toLocaleString();
const fmtClockTime = (d) => new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const fmtDateShort = (d) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

const hoursForSessions = (sessions, from, now) => sessions
  .filter(s => new Date(s.clockIn) >= from)
  .reduce((sum, s) => {
    const end = s.clockOut ? new Date(s.clockOut) : now;
    return sum + Math.max(0, (end - new Date(s.clockIn)) / 3600000);
  }, 0);

export default function TimeClock() {
  const [screen, setScreen] = useState('select');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [employeeList, setEmployeeList] = useState([]); // [{name, working, since}]
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [mySessions, setMySessions] = useState([]);
  const [rate, setRate] = useState(50);

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminEmployees, setAdminEmployees] = useState([]);
  const [adminSessions, setAdminSessions] = useState([]);
  const [adminRate, setAdminRate] = useState(50);
  const [newEmpName, setNewEmpName] = useState('');
  const [rateInput, setRateInput] = useState('');

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployeeList(data.employees || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    (async () => {
      await loadEmployees();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const goSelect = () => {
    setScreen('select'); setActiveEmployee(null); setPinInput(''); setPinError(false);
    loadEmployees();
  };

  const selectEmployee = async (name) => {
    setActiveEmployee(name);
    setScreen('employee');
    try {
      const res = await fetch(`/api/my-sessions?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      setMySessions(data.sessions || []);
      setRate(data.rate ?? 50);
    } catch (e) {
      console.error(e);
    }
  };

  const doClock = async (action) => {
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName: activeEmployee, action }),
      });
      const data = await res.json();
      setMySessions(data.sessions || []);
    } catch (e) {
      console.error(e);
    }
  };

  const checkPin = async () => {
    try {
      const res = await fetch('/api/admin', { headers: { 'x-admin-pin': pinInput } });
      if (!res.ok) { setPinError(true); return; }
      const data = await res.json();
      setAdminEmployees(data.employees || []);
      setAdminSessions(data.sessions || []);
      setAdminRate(data.rate ?? 50);
      setAdminPin(pinInput);
      setPinInput(''); setPinError(false); setScreen('admin');
    } catch (e) {
      setPinError(true);
    }
  };

  const adminAction = async (body) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': adminPin },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const addEmployee = async () => {
    const name = newEmpName.trim();
    if (!name || adminEmployees.includes(name)) return;
    const data = await adminAction({ action: 'add-employee', name });
    if (data?.employees) setAdminEmployees(data.employees);
    setNewEmpName('');
  };
  const removeEmployee = async (name) => {
    const data = await adminAction({ action: 'remove-employee', name });
    if (data?.employees) setAdminEmployees(data.employees);
  };
  const saveRate = async () => {
    const val = Number(rateInput);
    if (!val || val <= 0) return;
    const data = await adminAction({ action: 'set-rate', rate: val });
    if (data?.rate) setAdminRate(data.rate);
    setRateInput('');
  };

  const myWorking = mySessions.find(s => !s.clockOut);
  const todayH = hoursForSessions(mySessions, startOfDay(now), now);
  const weekH = hoursForSessions(mySessions, startOfWeek(now), now);
  const monthH = hoursForSessions(mySessions, startOfMonth(now), now);
  const recentSessions = mySessions.slice().sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn)).slice(0, 8);

  const workingNowCount = employeeList.filter(e => e.working).length;
  const adminWorkingFor = (name) => adminSessions.some(s => s.employeeName === name && !s.clockOut);
  const adminHoursFor = (name, from) => hoursForSessions(adminSessions.filter(s => s.employeeName === name), from, now);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-sm text-neutral-500">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 font-sans">
      <div className="border-b border-neutral-800 px-4 py-4 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {screen !== 'select' && (
              <button
                onClick={goSelect}
                className="w-9 h-9 rounded-lg border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-100 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-lg bg-pink-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-neutral-950" strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="font-semibold text-base text-neutral-100 leading-tight">ลงเวลาทำงาน</h1>
              <p className="text-xs text-neutral-500">{now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          {screen === 'select' && (
            <div className="text-right">
              <p className="text-xs text-neutral-500">กำลังทำงาน</p>
              <p className="font-mono font-semibold text-lg text-pink-400 tabular-nums">{workingNowCount} คน</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {screen === 'select' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {employeeList.map(({ name, working }) => (
                <button
                  key={name}
                  onClick={() => selectEmployee(name)}
                  className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-left hover:border-pink-400 transition-colors"
                >
                  {working && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400" />}
                  <p className="text-sm font-medium text-neutral-100">{name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{working ? 'กำลังทำงาน' : 'แตะเพื่อลงเวลา'}</p>
                </button>
              ))}
            </div>
            <div className="text-center">
              <button onClick={() => setScreen('admin-pin')} className="text-xs text-neutral-600 hover:text-neutral-400 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> แอดมิน
              </button>
            </div>
          </div>
        )}

        {screen === 'employee' && activeEmployee && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-sm text-neutral-500">สวัสดี</p>
              <p className="text-xl font-semibold text-neutral-100">{activeEmployee}</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-4">
              {myWorking ? (
                <>
                  <p className="text-xs text-emerald-400">กำลังทำงาน ตั้งแต่ {fmtClockTime(myWorking.clockIn)}</p>
                  <p className="font-mono text-2xl font-semibold text-neutral-100 tabular-nums">{fmtDuration(todayH)}</p>
                  <button onClick={() => doClock('out')} className="w-full py-3.5 rounded-xl bg-rose-500 text-white font-medium text-sm flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" /> เลิกงาน
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-neutral-500">ยังไม่ได้เข้างานวันนี้</p>
                  <button onClick={() => doClock('in')} className="w-full py-3.5 rounded-xl bg-pink-400 text-neutral-950 font-medium text-sm flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" /> เข้างาน
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
                <p className="text-xs text-neutral-500 mb-1">วันนี้</p>
                <p className="font-mono text-sm font-semibold text-neutral-100">{fmtHours1(todayH)} ชม.</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
                <p className="text-xs text-neutral-500 mb-1">สัปดาห์นี้</p>
                <p className="font-mono text-sm font-semibold text-neutral-100">{fmtHours1(weekH)} ชม.</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
                <p className="text-xs text-neutral-500 mb-1">เดือนนี้</p>
                <p className="font-mono text-sm font-semibold text-neutral-100">{fmtHours1(monthH)} ชม.</p>
              </div>
            </div>

            <div className="bg-neutral-50 border-t-2 border-dashed border-neutral-300 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-neutral-500" />
                <p className="text-sm text-neutral-600">ประมาณการเดือนนี้</p>
              </div>
              <p className="font-mono font-semibold text-lg text-neutral-900">฿{fmtMoney(monthH * rate)}</p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-500 mb-2 px-1">ประวัติล่าสุด</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl divide-y divide-neutral-800">
                {recentSessions.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-6">ยังไม่มีประวัติ</p>
                ) : recentSessions.map(s => (
                  <div key={s.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-neutral-400">{fmtDateShort(s.clockIn)}</span>
                    <span className="font-mono text-neutral-100">
                      {fmtClockTime(s.clockIn)} - {s.clockOut ? fmtClockTime(s.clockOut) : 'ยังไม่เลิกงาน'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {screen === 'admin-pin' && (
          <div className="max-w-xs mx-auto space-y-4 pt-10">
            <div className="text-center">
              <Lock className="w-8 h-8 mx-auto mb-3 text-neutral-600" />
              <p className="text-sm text-neutral-400">ใส่รหัส PIN แอดมิน</p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === 'Enter' && checkPin()}
              className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="••••"
            />
            {pinError && <p className="text-xs text-rose-400 text-center">รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง</p>}
            <button onClick={checkPin} className="w-full py-3 rounded-xl bg-pink-400 text-neutral-950 font-medium text-sm">
              เข้าสู่ระบบ
            </button>
          </div>
        )}

        {screen === 'admin' && (
          <div className="space-y-5">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <p className="text-xs text-neutral-500 mb-0.5">ค่าจ้างรวมประมาณการเดือนนี้ ({adminEmployees.length} คน)</p>
              <p className="font-mono font-semibold text-2xl text-pink-400 tabular-nums">
                ฿{fmtMoney(adminEmployees.reduce((sum, e) => sum + adminHoursFor(e, startOfMonth(now)) * adminRate, 0))}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-500 mb-2 px-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> พนักงานทั้งหมด
              </h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl divide-y divide-neutral-800">
                {adminEmployees.map(name => {
                  const working = adminWorkingFor(name);
                  const todayHA = adminHoursFor(name, startOfDay(now));
                  const weekHA = adminHoursFor(name, startOfWeek(now));
                  const monthHA = adminHoursFor(name, startOfMonth(now));
                  return (
                    <div key={name} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {working && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                          <p className="text-sm font-medium text-neutral-100">{name}</p>
                        </div>
                        <button onClick={() => removeEmployee(name)} className="text-neutral-600 hover:text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-neutral-500">วันนี้</p>
                          <p className="font-mono text-neutral-200">{fmtHours1(todayHA)} ชม.</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">สัปดาห์นี้</p>
                          <p className="font-mono text-neutral-200">{fmtHours1(weekHA)} ชม.</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">เดือนนี้</p>
                          <p className="font-mono text-neutral-200">{fmtHours1(monthHA)} ชม. · ฿{fmtMoney(monthHA * adminRate)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2.5">
                <input
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  placeholder="ชื่อพนักงานใหม่"
                  className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button onClick={addEmployee} className="px-4 py-2 rounded-lg bg-pink-400 text-neutral-950 text-sm font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> เพิ่ม
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-500 mb-2 px-1">อัตราค่าจ้าง (ต่อชั่วโมง)</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                <p className="font-mono text-lg text-neutral-100">฿{adminRate} / ชม.</p>
                <div className="flex gap-2">
                  <input
                    value={rateInput}
                    onChange={e => setRateInput(e.target.value)}
                    type="number"
                    placeholder="อัตราใหม่"
                    className="w-28 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                  <button onClick={saveRate} className="px-4 py-2 rounded-lg bg-pink-400 text-neutral-950 text-sm font-medium">
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
