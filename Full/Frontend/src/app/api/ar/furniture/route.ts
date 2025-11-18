// /app/api/ar/furniture/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/ar/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();
<<<<<<< HEAD
    const [rows] = await connection.query('SELECT id, name, width, depth, height, modelurl as modelUrl FROM dohun');
=======
    const [rows] = await connection.query('SELECT product_id as id, product_name as name, width_mm as width, depth_mm as depth, height_mm as height, model3d_url as modelUrl FROM test_products');
>>>>>>> main
    connection.release();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching furniture data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Error fetching furniture data', error: errorMessage }, { status: 500 });
  }
}
