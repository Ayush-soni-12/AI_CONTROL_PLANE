import axios from 'axios';
import { Signal } from "./types";

const CONTROL_PLANE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

// Create axios instance for control plane API
const apiClient = axios.create({
  baseURL: CONTROL_PLANE_URL,
  withCredentials: true, // Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all signals from the control plane
 * 
 * @returns Promise with array of signals
 */
export async function fetchSignals(): Promise<Signal[]> {
  try {
    const response = await apiClient.get<{ signals: Signal[] }>('/api/signals');
    return response.data.signals || [];
  } catch (error) {
    console.error('Error fetching signals:', error);
    return [];
  }
}
