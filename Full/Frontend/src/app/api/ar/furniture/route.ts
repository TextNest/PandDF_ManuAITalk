// /app/api/ar/furniture/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/ar/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(`
      SELECT
        product_id as id,
        product_name as name,
        COALESCE(width_mm, 1000) as width_mm,
        COALESCE(height_mm, 1000) as height_mm,
        COALESCE(depth_mm, 1000) as depth_mm,
        (COALESCE(width_mm, 1000) / 1000) as width,
        (COALESCE(height_mm, 1000) / 1000) as height,
        (COALESCE(depth_mm, 1000) / 1000) as depth,
        model3d_url as modelUrl
      FROM test_products
    `);
    connection.release();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching furniture data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Error fetching furniture data', error: errorMessage }, { status: 500 });
  }
}
