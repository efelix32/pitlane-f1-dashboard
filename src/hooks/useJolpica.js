import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

async function fetchWithFallback(path2026, path2025, extract) {
  try {
    const res = await axios.get(`${BASE_URL}${path2026}`);
    const items = extract(res.data);
    if (items && items.length > 0) return { items, season: '2026' };
  } catch {
    // 2026 verisi henüz yok veya erişilemedi; 2025'e düş
  }
  try {
    const res = await axios.get(`${BASE_URL}${path2025}`);
    const items = extract(res.data);
    return { items: items || [], season: '2025' };
  } catch {
    // 2025 de alınamadı; boş sonuç dön
  }
  return { items: [], season: '2025' };
}

export function useDriverStandings() {
  const query = useQuery({
    queryKey: ['driverStandings'],
    queryFn: () =>
      fetchWithFallback(
        '/2026/driverStandings.json?limit=30',
        '/2025/driverStandings.json?limit=30',
        d => d?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings
      ),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  return {
    standings: query.data?.items || [],
    season: query.data?.season || '2026',
    loading: query.isLoading,
  };
}

export function useConstructorStandings() {
  const query = useQuery({
    queryKey: ['constructorStandings'],
    queryFn: () =>
      fetchWithFallback(
        '/2026/constructorStandings.json?limit=20',
        '/2025/constructorStandings.json?limit=20',
        d => d?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings
      ),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  return {
    standings: query.data?.items || [],
    season: query.data?.season || '2026',
    loading: query.isLoading,
  };
}

export function useRaceSchedule() {
  const query = useQuery({
    queryKey: ['raceSchedule'],
    queryFn: () => fetchWithFallback('/2026.json', '/2025.json', d => d?.MRData?.RaceTable?.Races),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return {
    races: query.data?.items || [],
    season: query.data?.season || '2026',
    loading: query.isLoading,
  };
}

export function useLastRaceResults() {
  const query = useQuery({
    queryKey: ['lastRaceResults'],
    queryFn: () =>
      fetchWithFallback(
        '/2026/last/results.json?limit=25',
        '/2025/last/results.json?limit=25',
        d => d?.MRData?.RaceTable?.Races
      ),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  const race = query.data?.items?.[0] || null;
  return {
    race,
    results: race?.Results || [],
    season: query.data?.season || '2026',
    loading: query.isLoading,
  };
}

export function useDrivers() {
  const query = useQuery({
    queryKey: ['drivers'],
    queryFn: () =>
      fetchWithFallback(
        '/2026/drivers.json?limit=30',
        '/2025/drivers.json?limit=30',
        d => d?.MRData?.DriverTable?.Drivers
      ),
    staleTime: 1000 * 60 * 60,
  });

  return {
    drivers: query.data?.items || [],
    season: query.data?.season || '2026',
    loading: query.isLoading,
  };
}

export function useConstructors() {
  const query = useQuery({
    queryKey: ['constructors'],
    queryFn: () =>
      fetchWithFallback(
        '/2026/constructors.json?limit=20',
        '/2025/constructors.json?limit=20',
        d => d?.MRData?.ConstructorTable?.Constructors
      ),
    staleTime: 1000 * 60 * 60,
  });

  return {
    constructors: query.data?.items || [],
    season: query.data?.season || '2026',
    loading: query.isLoading,
  };
}

export function useRaceResults(season, round) {
  const query = useQuery({
    queryKey: ['raceResults', season, round],
    queryFn: async () => {
      const res = await axios.get(`${BASE_URL}/${season}/${round}/results.json`);
      return res.data;
    },
    enabled: !!(season && round),
    staleTime: 1000 * 60 * 60,
  });

  const race = query.data?.MRData?.RaceTable?.Races?.[0] || null;
  return {
    race,
    results: race?.Results || [],
    loading: query.isLoading,
    error: query.error?.message,
  };
}
