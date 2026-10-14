// Optional developer checks. Node 20+ only; no installation or build step.
import assert from 'node:assert/strict';
import {
  readFileSync,
  readdirSync
} from 'node:fs';
import {
  fileURLToPath
} from 'node:url';
import {
  today,
  nights,
  validateDates,
  quote,
  overlaps,
  emailValue,
  textValue,
  passwordValid,
  hashPassword
} from '../js/utils.js';
import {
  seedHotels,
  cities
} from '../js/data.js';
import {
  filterHotels
} from '../js/search.js';
import {
  validateCard
} from '../js/booking.js';
let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
await test('24 unique hotels in 8 cities, three room types per hotel', () => {
  assert.equal(seedHotels.length, 24);
  assert.equal(cities.length, 8);
  assert.equal(new Set(seedHotels.map(h => h.id)).size, 24);
  for (const city of cities) assert.equal(seedHotels.filter(h => h.city === city.name).length, 3);
  for (const h of seedHotels) {
    assert.equal(h.rooms.length, 3);
    assert.equal(new Set(h.rooms.flatMap(r => r.units)).size, 9);
    assert.ok(h.rooms.every(r => r.price > 0 && r.capacity >= 2));
  }
});
await test('Dates reject past, same day, reversed, invalid calendar, oversized stay', () => {
  assert.equal(validateDates(today(1), today(3)), 2);
  for (const [start, end] of [
      [today(-1), today(1)],
      [today(1), today(1)],
      [today(3), today(1)],
      ['2027-02-30', '2027-03-02'],
      [today(1), today(32)],
      ['', '']
    ]) assert.throws(() => validateDates(start, end));
  assert.equal(nights('2027-03-13', '2027-03-15'), 2);
});
await test('Price includes nights, rooms, and rounded tax exactly once', () => {
  assert.deepEqual(quote({
    price: 118
  }, today(1), today(3), 2), {
    nights: 2,
    subtotal: 472,
    tax: 56.64,
    total: 528.64
  });
});
await test('Overlapping stays conflict; adjacent departures do not', () => {
  assert.ok(overlaps('2027-01-01', '2027-01-05', '2027-01-02', '2027-01-03'));
  assert.ok(overlaps('2027-01-02', '2027-01-03', '2027-01-01', '2027-01-05'));
  assert.equal(overlaps('2027-01-01', '2027-01-03', '2027-01-03', '2027-01-05'), false);
});
await test('Search combines destination, amenities, stars, type, rating and budget', () => {
  assert.equal(filterHotels(seedHotels, {
    city: '  bALI '
  }).length, 3);
  assert.equal(filterHotels(seedHotels, {
    city: 'Pakistan'
  }).length, 9);
  assert.equal(filterHotels(seedHotels, {
    city: 'Unknown'
  }).length, 0);
  const result = filterHotels(seedHotels, {
    stars: [5],
    amenities: ['Pool', 'Spa'],
    maxPrice: 150,
    rating: 9,
    type: 'Resort'
  });
  assert.ok(result.length);
  assert.ok(result.every(h => h.stars === 5 && h.amenities.includes('Pool') && h.amenities.includes(
    'Spa') && h.rooms[0].price <= 150 && h.score >= 9 && h.type === 'Resort'));
});
await test('Sorts order by both price directions and rating', () => {
  for (const [sort, metric, sign] of [
      ['price-asc', h => h.rooms[0].price, 1],
      ['price-desc', h => h.rooms[0].price, -1],
      ['rating', h => h.score, -1]
    ]) {
    const sorted = filterHotels(seedHotels, {
      sort
    });
    for (let i = 1; i < sorted.length; i++) assert.ok((metric(sorted[i]) - metric(sorted[i - 1])) *
      sign >= 0);
  }
});
await test('Account validation rejects malformed or oversized input', () => {
  assert.equal(emailValue(' A@Example.COM '), 'a@example.com');
  assert.throws(() => emailValue('a@bad'));
  assert.throws(() => textValue('a', 'Name'));
  assert.throws(() => passwordValid('short'));
  assert.throws(() => passwordValid('a'.repeat(129)));
});
await test('PBKDF2 uses unique salt and deterministic verification', async () => {
  const a = await hashPassword('UniqueTestPassword!');
  const b = await hashPassword('UniqueTestPassword!');
  const check = await hashPassword('UniqueTestPassword!', a.salt);
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  assert.equal(a.hash, check.hash);
  assert.equal(a.iterations, 600000);
  assert.equal(a.hash.length, 64);
  assert.equal(a.salt.length, 32);
});
await test('Mock card validation checks checksum, expiry, and CVV', () => {
  const year = String(new Date().getFullYear() + 2).slice(-2);
  assert.equal(validateCard('4242 4242 4242 4242', `12/${year}`, '123'), true);
  assert.throws(() => validateCard('4242 4242 4242 4243', `12/${year}`, '123'));
  assert.throws(() => validateCard('4242 4242 4242 4242', '12/20', '123'));
  assert.throws(() => validateCard('4242 4242 4242 4242', `13/${year}`, '123'));
  assert.throws(() => validateCard('4242 4242 4242 4242', `12/${year}`, '12'));
});
await test('No unsafe HTML sinks, eval, inline handlers, or remote executable scripts', () => {
  const dir = fileURLToPath(new URL('../js/', import.meta.url));
  for (const name of readdirSync(dir)) {
    const code = readFileSync(dir + name, 'utf8');
    assert.doesNotMatch(code,
      /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(|\beval\s*\(|new Function\s*\(/);
  }
  for (const name of ['index', 'home', 'search', 'hotel', 'checkout', 'bookings', 'wishlist', 'profile',
      '404'
    ]) {
    const html = readFileSync(new URL(`../${name}.html`, import.meta.url), 'utf8');
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /script-src 'self'/);
    assert.doesNotMatch(html, /<script[^>]*src="https?:|\sonclick=/);
  }
});
console.log(
  `\n${passed} checks passed. These are logic/source checks, not a penetration test or browser UI audit.`);
