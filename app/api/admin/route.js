import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

function pinOk(request) {
  const pin = request.headers.get('x-admin-pin');
  return !!pin && !!process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN;
}

export async function GET(request) {
  if (!pinOk(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const [employees, sessions, rate] = await Promise.all([
      redis.get('employees'),
      redis.get('all-sessions'),
      redis.get('hourly-rate'),
    ]);
    return NextResponse.json({
      employees: employees || [],
      sessions: sessions || [],
      rate: rate ?? 50,
    });
  } catch (e) {
    console.error('admin GET error', e);
    return NextResponse.json({ error: 'storage error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!pinOk(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();

    if (body.action === 'add-employee') {
      const employees = (await redis.get('employees')) || [];
      const name = (body.name || '').trim();
      if (name && !employees.includes(name)) {
        const updated = [...employees, name];
        await redis.set('employees', updated);
        return NextResponse.json({ employees: updated });
      }
      return NextResponse.json({ employees });
    }

    if (body.action === 'remove-employee') {
      const employees = (await redis.get('employees')) || [];
      const updated = employees.filter((e) => e !== body.name);
      await redis.set('employees', updated);
      return NextResponse.json({ employees: updated });
    }

    if (body.action === 'set-rate') {
      const val = Number(body.rate);
      if (val > 0) {
        await redis.set('hourly-rate', val);
        return NextResponse.json({ rate: val });
      }
      return NextResponse.json({ error: 'invalid rate' }, { status: 400 });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    console.error('admin POST error', e);
    return NextResponse.json({ error: 'storage error' }, { status: 500 });
  }
}
