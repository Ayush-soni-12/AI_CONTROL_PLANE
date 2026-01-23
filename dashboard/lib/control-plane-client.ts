import { Signal } from "./types";

const CONTROL_PLANE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';


export async function fetchSignals(): Promise<Signal[]> {
  try {
    const response = await fetch(`${CONTROL_PLANE_URL}/api/signals`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch signals');
    }
    
    const data = await response.json();
    return data.signals || [];
    
  } catch (error) {
    console.error('Error fetching signals:', error);
    return [];
  }
}