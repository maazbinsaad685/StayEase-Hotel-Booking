export const images = [
  'photo-1571896349842-33c89424de2d', 'photo-1566073771259-6a8506099945', 'photo-1542314831-068cd1dbfeeb',
  'photo-1582719478250-c89cae4dc85b', 'photo-1611892440504-42a792e24d32',
  'photo-1566665797739-1674de7a421a', 'photo-1445019980597-93fa8acb246c', 'photo-1455587734955-081b22074882'
];
export const photo = (id, width = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
export const cities = [{
  name: 'Bali',
  country: 'Indonesia',
  tag: 'A slower kind of paradise',
  image: images[0],
  names: ['The Ubud Canopy', 'Serein Ocean Retreat', 'Palm & Stone Seminyak'],
  areas: ['Ubud', 'Nusa Dua', 'Seminyak'],
  base: 118
}, {
  name: 'Dubai',
  country: 'United Arab Emirates',
  tag: 'Where ambition meets the sea',
  image: images[1],
  names: ['The Azure Marina', 'Dune House Dubai', 'Crescent Palm Resort'],
  areas: ['Dubai Marina', 'Downtown', 'Palm Jumeirah'],
  base: 165
}, {
  name: 'Istanbul',
  country: 'Türkiye',
  tag: 'Two continents. Endless stories.',
  image: images[2],
  names: ['Bosphorus House', 'The Galata Atelier', 'Saffron Courtyard'],
  areas: ['Beşiktaş', 'Galata', 'Sultanahmet'],
  base: 96
}, {
  name: 'Paris',
  country: 'France',
  tag: 'A little more joie de vivre',
  image: images[3],
  names: ['Maison des Jardins', 'Atelier Saint-Germain', 'The Marais Residence'],
  areas: ['Latin Quarter', 'Saint-Germain', 'Le Marais'],
  base: 189
}, {
  name: 'Karachi',
  country: 'Pakistan',
  tag: 'Coastal air, city energy',
  image: images[4],
  names: ['The Clifton House', 'Seabreeze Karachi', 'The Saddar Heritage'],
  areas: ['Clifton', 'DHA', 'Saddar'],
  base: 65
}, {
  name: 'Lahore',
  country: 'Pakistan',
  tag: 'Culture around every corner',
  image: images[5],
  names: ['The Gulberg Gardens', 'Haveli Noor', 'Canal View Suites'],
  areas: ['Gulberg', 'Old Lahore', 'Johar Town'],
  base: 58
}, {
  name: 'Islamabad',
  country: 'Pakistan',
  tag: 'Find your mountain moment',
  image: images[6],
  names: ['Margalla Hideaway', 'The Blue Area Hotel', 'Cedar & Sky Lodge'],
  areas: ['F-6', 'Blue Area', 'E-7'],
  base: 74
}, {
  name: 'London',
  country: 'United Kingdom',
  tag: 'Classic charm. New discoveries.',
  image: images[7],
  names: ['The Kensington Grove', 'Bankside & Co.', 'The Mayfair Townhouse'],
  areas: ['Kensington', 'South Bank', 'Mayfair'],
  base: 205
}];
export const seedHotels = cities.flatMap((city, ci) => city.names.map((name, i) => ({
  id: `hotel-${ci*3+i+1}`,
  name,
  city: city.name,
  country: city.country,
  area: city.areas[i],
  stars: i === 1 ? 4 : 5,
  type: ['Resort', 'Boutique hotel', 'Hotel'][i],
  score: Number((9.1 + (ci % 3) * .2 - i * .2).toFixed(1)),
  popularity: 980 - ci * 53 + i * 30,
  reviewCount: 126 + ci * 31 + i * 17,
  images: [photo(images[(ci + i) % 8]), photo(images[(ci + i + 4) % 8]), photo(images[(ci + i + 5) %
    8]), photo(images[(ci + i + 1) % 8])],
  amenities: ['Wi-Fi', 'Air conditioning', 'Breakfast', ...(i !== 1 ? ['Pool', 'Spa'] : ['Parking']),
    ...(i !== 2 ? ['Gym'] : [])
  ],
  description: `Make yourself at home at ${name}, a thoughtfully designed ${['resort','boutique hotel','city retreat'][i]} in ${city.areas[i]}, ${city.name}. Light-filled spaces, locally inspired interiors and a welcoming team make every stay feel personal. Start with a leisurely breakfast, explore the neighborhood, and return to a quiet room made for winding down.`,
  rooms: [{
    id: 'classic',
    name: 'Classic King',
    capacity: 2,
    price: city.base + i * 28,
    size: 28,
    bed: '1 king bed'
  }, {
    id: 'deluxe',
    name: 'Deluxe Twin',
    capacity: 3,
    price: city.base + i * 28 + 42,
    size: 38,
    bed: '2 double beds'
  }, {
    id: 'suite',
    name: 'Panorama Suite',
    capacity: 4,
    price: city.base + i * 28 + 105,
    size: 64,
    bed: '1 king bed + sofa bed'
  }].map(r => ({
    ...r,
    units: [1, 2, 3].map(n => `${r.id}-${n}`)
  }))
})));
