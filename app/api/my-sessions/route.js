import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'missing name' }, { status: 400 });
  }
  try {
    const [sessions, rate] = await Promise.all([
      redis.get('all-sessions'),
      redis.get('hourly-rate'),
    ]);
    const mySessions = (sessions || []).filter((s) => s.employeeName === name);
    return NextResponse.json({ sessions: mySessions, rate: rate ?? 50 });
  } catch (e) {
    console.error('my-sessions GET error', e);
    return NextResponse.json({ error: 'storage error' }, { status: 500 });
  }
}
