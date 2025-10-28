import axios from 'axios';
import type { Game, Player } from '@shared/types';

// Use relative URL if VITE_API_URL is not set (for production with tunnel)
// Otherwise use the provided URL (for local development)
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

console.log('[API Service] Initializing with API_URL:', API_URL);
console.log('[API Service] VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('[API Service] Window Origin:', window.location.origin);

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to help diagnose network issues
  timeout: 30000,
});

/**
 * Create a new game
 */
export async function createGame(hostName: string, totalRounds: number = 5, gameMode: 'standard' | 'everyone' = 'standard') {
  const response = await api.post('/games', {
    hostName,
    totalRounds,
    gameMode,
  });
  return response.data;
}

/**
 * Get game by code
 */
export async function getGame(code: string): Promise<{ game: Game }> {
  const response = await api.get(`/games/${code}`);
  return response.data;
}

/**
 * Join a game
 */
export async function joinGame(code: string, playerName: string): Promise<{ player: Player; token: string }> {
  const response = await api.post(`/games/${code}/join`, {
    playerName,
  });
  return response.data;
}

/**
 * Start a game (host only)
 */
export async function startGame(code: string) {
  const response = await api.post(`/games/${code}/start`);
  return response.data;
}

/**
 * Delete a game (host only)
 */
export async function deleteGame(code: string) {
  const response = await api.delete(`/games/${code}`);
  return response.data;
}

/**
 * Get round by ID
 */
export async function getRound(roundId: string) {
  const response = await api.get(`/rounds/${roundId}`);
  return response.data;
}

/**
 * Submit a prompt for a round
 */
export async function submitPrompt(roundId: string, playerId: string, prompt: string) {
  const response = await api.post(`/rounds/${roundId}/submit`, {
    playerId,
    prompt,
  });
  return response.data;
}

/**
 * Submit a vote for a round
 */
export async function submitVote(roundId: string, playerId: string, votedTeam: 'GOOD' | 'EVIL') {
  const response = await api.post(`/rounds/${roundId}/vote`, {
    playerId,
    votedTeam,
  });
  return response.data;
}

export default api;
