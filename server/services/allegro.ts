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
        'https://allegro.pl.allegrosandbox.pl/auth/oauth/token',
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

      log('Successfully obtained Allegro access token');
      return this.accessToken;
    } catch (error) {
      log(`Failed to get Allegro access token: ${error}`);
      throw new Error('Failed to authenticate with Allegro');
    }
  }

  async searchProducts(query: string): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      log(`Searching Allegro with query: ${query}`);

      const response = await axios.get('https://api.allegro.pl.allegrosandbox.pl/offers/listing', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.allegro.public.v1+json',
        },
        params: {
          phrase: query || '',
          limit: 20,
        },
      });

      log(`Allegro API responded with ${response.data.items?.total || 0} items`);

      // Process both promoted and regular items
      const items = [
        ...(response.data.items?.promoted || []),
        ...(response.data.items?.regular || [])
      ];

      return items.map((item: any) => ({
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
      log(`Failed to search Allegro products: ${error}`);
      throw error;
    }
  }
}

export const allegroAPI = new AllegroAPI();