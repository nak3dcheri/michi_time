import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [employees, sessions] = await Promise.all([
      redis.get('employees'),
      redis.get('all-sessions'),
    ]);
    const empList = employees || [];
    const sessList = sessions || [];
    const withStatus = empList.map((name) => {
      const open = sessList.find((s) => s.employeeName === name && !s.clockOut);
      return { name, working: !!open, since: open ? open.clockIn : null };
    });
    return NextResponse.json({ employees: withStatus });
  } catch (e) {
    console.error('employees GET error', e);
    return NextResponse.json({ error: 'storage error' }, { status: 500 });
  }
}
