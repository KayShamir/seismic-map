import { useQuery } from "@tanstack/react-query";
const API_URL = import.meta.env.VITE_API_URL;

export const useGetSeismic = () => {
  return useQuery({
    queryKey: ['seismic-data'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}seismic`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    }
  });
};