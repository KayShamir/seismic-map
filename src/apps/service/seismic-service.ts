import { useQuery } from "@tanstack/react-query";
const API_URL = import.meta.env.VITE_API_URL;

export const useGetSeismic = (month: string | null, refreshToken: number) => {
  return useQuery({
    queryKey: ['seismic-data', month, refreshToken],
    queryFn: async () => {
      const timestamp = Date.now();
      const response = await fetch(`${API_URL}seismic?t=${timestamp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: month ? JSON.stringify({ month }) : undefined,
      });

      if (!response.ok) {
        console.log(response);
        throw new Error(`Server error: ${response.status}`);
      }
      return await response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};