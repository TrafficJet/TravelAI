import api from './api';

export type PriceAlertType = 'flight' | 'hotel';

export interface PriceAlert {
  id: string;
  type: PriceAlertType;
  label: string;
  route?: string;
  city?: string;
  origin?: string;
  destination?: string;
  maxPrice: number;
  currency: string;
  currentPrice: number;
  active: boolean;
  createdAt?: string;
}

export interface CreateFlightAlertData {
  type: 'flight';
  origin: string;
  destination: string;
  maxPrice: number;
}

export interface CreateHotelAlertData {
  type: 'hotel';
  city: string;
  maxPrice: number;
}

export type CreateAlertData = CreateFlightAlertData | CreateHotelAlertData;

interface AlertsResponse {
  data: PriceAlert[];
}

export const priceAlertsService = {
  async getPriceAlerts(): Promise<PriceAlert[]> {
    const { data } = await api.get<AlertsResponse | PriceAlert[]>('/price-alerts');
    if (Array.isArray(data)) return data;
    return data.data;
  },

  async createPriceAlert(payload: CreateAlertData): Promise<PriceAlert> {
    const { data } = await api.post<PriceAlert>('/price-alerts', payload);
    return data;
  },

  async deletePriceAlert(id: string): Promise<void> {
    await api.delete(`/price-alerts/${id}`);
  },

  async togglePriceAlert(id: string, active: boolean): Promise<PriceAlert> {
    const { data } = await api.patch<PriceAlert>(`/price-alerts/${id}`, { active });
    return data;
  },
};
