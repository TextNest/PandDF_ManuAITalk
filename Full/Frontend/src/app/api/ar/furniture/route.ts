// /app/api/ar/furniture/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/ar/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, width, depth, height, modelurl as modelUrl FROM dohun');
    connection.release();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching furniture data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Error fetching furniture data', error: errorMessage }, { status: 500 });
  }
}
