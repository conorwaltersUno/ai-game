import axios from 'axios';
import type { Game, Player } from '@shared/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Create a new game
 */
export async function createGame(hostName: string, totalRounds: number = 5) {
  const response = await api.post('/games', {
    hostName,
    totalRounds,
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
