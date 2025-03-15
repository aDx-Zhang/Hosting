import axios from 'axios';
import { log } from "../vite";

interface OLXToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class OLXAPI {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl = 'https://www.olx.pl/api/partner/';

  constructor() {
    this.clientId = process.env.OLX_CLIENT_ID!;
    this.clientSecret = process.env.OLX_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('OLX API credentials not found');
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      log('Attempting to get OLX access token...');

      const response = await axios.post<OLXToken>(
        `${this.baseUrl}oauth/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));

      log('Successfully obtained OLX access token');
      return this.accessToken;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        log(`Failed to get OLX access token: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        log(`Failed to get OLX access token: ${error}`);
      }
      throw new Error('Failed to authenticate with OLX');
    }
  }

  async searchProducts(query: string): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      log(`Searching OLX with query: ${query}`);

      const response = await axios.get(`${this.baseUrl}offers/search`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          query: query || '',
          limit: 20,
        },
      });

      log(`OLX API response: ${JSON.stringify(response.data)}`);

      if (!response.data.offers) {
        log('No offers found in the response');
        return [];
      }

      return response.data.offers.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        price: parseFloat(item.price.amount),
        image: item.photos?.[0]?.url || '',
        marketplace: 'olx',
        originalUrl: item.url,
        latitude: item.location?.lat || 52.2297,
        longitude: item.location?.lon || 21.0122,
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        log(`Failed to search OLX products: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        log(`Failed to search OLX products: ${error}`);
      }
      throw error;
    }
  }
}

export const olxAPI = new OLXAPI();
