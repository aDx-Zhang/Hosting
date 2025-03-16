import type { InsertProduct } from "@shared/schema";

export const mockProducts: InsertProduct[] = [
  {
    title: "iPhone 13 Mini, stan bardzo dobry",
    description: "Sprzedam iPhone 13 Mini 128GB w kolorze czarnym, bateria 89%, komplet akcesoriów",
    price: "999.99",
    image: "https://images.unsplash.com/photo-1605236453806-6ff36851218e",
    marketplace: "olx",
    originalUrl: "https://olx.pl/iphone-13",
    latitude: 52.2297,
    longitude: 21.0122
  },
  {
    title: "iPhone SE 2020 używany",
    description: "iPhone SE 2020 64GB, kolor biały, stan dobry, bez blokad",
    price: "599.99",
    image: "https://images.unsplash.com/photo-1592286927505-1def25115558",
    marketplace: "allegro",
    originalUrl: "https://allegrolokalnie.pl/iphone-se",
    latitude: 52.2350,
    longitude: 21.0200
  },
  {
    title: "iPhone 12 Pro Max okazja",
    description: "Sprzedam iPhone 12 Pro Max 256GB Pacific Blue, stan idealny",
    price: "899.00",
    image: "https://images.unsplash.com/photo-1603891128711-11b4b03bb138",
    marketplace: "vinted",
    originalUrl: "https://vinted.pl/iphone-12",
    latitude: 52.2200,
    longitude: 21.0050
  },
  {
    title: "iPhone XR, gwarancja",
    description: "iPhone XR 128GB czerwony, 3 miesiące gwarancji",
    price: "450.00",
    image: "https://images.unsplash.com/photo-1572635148818-ef6fd45eb394",
    marketplace: "olx",
    originalUrl: "https://olx.pl/iphone-xr",
    latitude: 52.2400,
    longitude: 21.0150
  },
  {
    title: "iPhone 11 jak nowy",
    description: "iPhone 11 64GB czarny, stan jak nowy, pełny zestaw",
    price: "749.99",
    image: "https://images.unsplash.com/photo-1592950630581-03cb41536b88",
    marketplace: "allegro",
    originalUrl: "https://allegrolokalnie.pl/iphone-11",
    latitude: 52.2150,
    longitude: 21.0300
  }
];