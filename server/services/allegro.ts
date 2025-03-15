import axios from 'axios';
import { log } from '../vite';

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
  private readonly baseUrl = 'https://api.allegro.pl';
  private readonly sandboxBaseUrl = 'https://api.allegro.pl.allegrosandbox.pl';

  constructor() {
    this.clientId = process.env.ALLEGRO_CLIENT_ID!;
    this.clientSecret = process.env.ALLEGRO_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Allegro API credentials not found');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return existing token if it's still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post<AllegroToken>(
        'https://allegro.pl/auth/oauth/token',
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
      return this.accessToken;
    } catch (error) {
      log(`Failed to get Allegro access token: ${error}`);
      throw new Error('Failed to authenticate with Allegro');
    }
  }

  async searchProducts(query: string): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/offers/listing`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.allegro.public.v1+json',
        },
        params: {
          phrase: query,
          limit: 20,
        },
      });

      return response.data.items.promoted.concat(response.data.items.regular)
        .map((item: any) => ({
          id: item.id,
          title: item.name,
          description: item.description || '',
          price: parseFloat(item.sellingMode.price.amount),
          image: item.images[0]?.url || '',
          marketplace: 'allegro',
          originalUrl: item.url,
          latitude: item.location?.lat || null,
          longitude: item.location?.lon || null,
        }));
    } catch (error) {
      log(`Failed to search Allegro products: ${error}`);
      return [];
    }
  }
}

export const allegroAPI = new AllegroAPI();
