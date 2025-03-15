import axios from 'axios';
import { log } from "../vite";

interface AllegroToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class AllegroAPI {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.clientId = process.env.ALLEGRO_CLIENT_ID!;
    this.clientSecret = process.env.ALLEGRO_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Allegro API credentials not found');
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      log('Attempting to get Allegro access token...');

      const response = await axios.post<AllegroToken>(
        'https://allegro.pl/auth/oauth/token',
        'grant_type=client_credentials&scope=allegro.api.offers.read',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));

      log('Successfully obtained Allegro access token');
      log(`Token scopes: ${response.data.scope}`);
      return this.accessToken;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 403) {
          log('Authorization failed. Please check if all required permissions are enabled.');
        }
        log(`Failed to get Allegro access token: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        log(`Failed to get Allegro access token: ${error}`);
      }
      throw new Error('Failed to authenticate with Allegro');
    }
  }

  async searchProducts(query: string): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      log(`Searching Allegro with query: ${query}`);

      const response = await axios.get('https://api.allegro.pl/sale/offers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.allegro.public.v1+json',
          'Content-Type': 'application/vnd.allegro.public.v1+json',
        },
        params: {
          phrase: query || '',
          limit: 20,
        },
      });

      log(`Allegro API response: ${JSON.stringify(response.data)}`);

      if (!response.data.offers) {
        log('No offers found in the response');
        return [];
      }

      return response.data.offers.map((item: any) => ({
        id: item.id,
        title: item.name,
        description: item.description || '',
        price: parseFloat(item.sellingMode.price.amount),
        image: item.images?.[0]?.url || '',
        marketplace: 'allegro',
        originalUrl: `https://allegro.pl/oferta/${item.id}`,
        latitude: item.location?.coordinates?.lat || 52.2297,
        longitude: item.location?.coordinates?.lon || 21.0122,
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 403 && error.response.data?.errors?.[0]?.code === 'VerificationRequired') {
          log('Application verification is pending. Please complete the verification process in the Allegro Developer Portal.');
          throw new Error('Application verification pending');
        }
        log(`Failed to search Allegro products: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        log(`Failed to search Allegro products: ${error}`);
      }
      throw error;
    }
  }
}

export const allegroAPI = new AllegroAPI();