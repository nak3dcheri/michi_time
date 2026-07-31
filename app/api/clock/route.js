import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { employeeName, action } = await request.json();
    if (!employeeName || !['in', 'out'].includes(action)) {
      return NextResponse.json({ error: 'invalid request' }, { status: 400 });
    }

    const employees = (await redis.get('employees')) || [];
    if (!employees.includes(employeeName)) {
      return NextResponse.json({ error: 'unknown employee' }, { status: 400 });
    }

    const sessions = (await redis.get('all-sessions')) || [];
    let updated;
    if (action === 'in') {
      updated = [
        ...sessions,
        { id: Date.now(), employeeName, clockIn: new Date().toISOString(), clockOut: null },
      ];
    } else {
      updated = sessions.map((s) =>
        s.employeeName === employeeName && !s.clockOut
          ? { ...s, clockOut: new Date().toISOString() }
          : s
      );
    }
    await redis.set('all-sessions', updated);

    const mySessions = updated.filter((s) => s.employeeName === employeeName);
    return NextResponse.json({ sessions: mySessions });
  } catch (e) {
    console.error('clock POST error', e);
    return NextResponse.json({ error: 'storage error' }, { status: 500 });
  }
}
