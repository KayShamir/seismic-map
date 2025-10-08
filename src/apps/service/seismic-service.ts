import { useQuery } from "@tanstack/react-query";
const API_URL = import.meta.env.VITE_API_URL;

export const useGetSeismic = (month: string | null) => {
  return useQuery({
    queryKey: ['seismic-data', month],
    queryFn: async () => {
      const response = await fetch(`${API_URL}seismic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: month ? JSON.stringify({ month }) : undefined,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    }
  });
};