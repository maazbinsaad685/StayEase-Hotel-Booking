import {
  seedHotels
} from './data.js';
import {
  hashPassword,
  emailValue,
  textValue,
  passwordValid,
  validateDates,
  quote,
  overlaps,
  today
} from './utils.js';
const DB_NAME = 'stayease-v1';
let connection;
// Never await non-IDB work inside a live transaction. Password work happens first.
const req = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const done = tx => new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onabort = () => reject(tx.error || Error('Database operation failed.'));
  tx.onerror = () => {};
});
export async function initDB() {
  if (connection) return connection;
  connection = (async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('meta', {
          keyPath: 'id'
        });
        const u = d.createObjectStore('users', {
          keyPath: 'id'
        });
        u.createIndex('email', 'email', {
          unique: true
        });
        d.createObjectStore('hotels', {
          keyPath: 'id'
        });
        const b = d.createObjectStore('bookings', {
          keyPath: 'id'
        });
        b.createIndex('userId', 'userId');
        const v = d.createObjectStore('reviews', {
          keyPath: 'id'
        });
        v.createIndex('hotelId', 'hotelId');
        d.createObjectStore('wishlists', {
          keyPath: 'id'
        });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(Error('Close other StayEase tabs and reload.'));
    });
    db.onversionchange = () => db.close();
    const credentials = await hashPassword('StayEaseDemo2026!');
    const tx = db.transaction(['meta', 'users', 'hotels', 'reviews'], 'readwrite');
    const finish = done(tx);
    const marker = await req(tx.objectStore('meta').get('seed'));
    if (!marker) {
      tx.objectStore('users').add({
        id: 'demo-user',
        name: 'Alex Morgan',
        email: 'demo@stayease.com',
        credentials,
        createdAt: new Date().toISOString()
      });
      for (const hotel of seedHotels) {
        tx.objectStore('hotels').put(hotel);
        ['A beautifully calm base for exploring. The team made us feel welcome from the moment we arrived.',
          'Loved the comfortable bed and generous breakfast. Would happily return.',
          'Thoughtful interiors and a great location. Check-in was quick and easy.'
        ].forEach((body, i) => tx.objectStore('reviews').put({
          id: `${hotel.id}-review-${i}`,
          hotelId: hotel.id,
          userId: `sample-${i}`,
          name: ['Sara K.', 'James W.', 'Ayesha R.'][i],
          rating: [5, 5, 4][i],
          body,
          date: '2026-09-12',
          sample: true
        }));
      }
      tx.objectStore('meta').put({
        id: 'seed',
        version: 1
      });
    }
    await finish;
    return db;
  })();
  return connection;
}
async function read(store, key) {
  const db = await initDB();
  return req(db.transaction(store).objectStore(store).get(key));
}
async function all(store) {
  const db = await initDB();
  return req(db.transaction(store).objectStore(store).getAll());
}
export const getHotels = () => all('hotels');
export const getHotel = id => read('hotels', id);
export const getUser = id => read('users', id);
export async function getUserByEmail(email) {
  const db = await initDB();
  return req(db.transaction('users').objectStore('users').index('email').get(emailValue(email)));
}
export async function addUser({
  name,
  email,
  password
}) {
  const user = {
    id: crypto.randomUUID(),
    name: textValue(name, 'Name', 2, 70),
    email: emailValue(email),
    credentials: await hashPassword(password),
    createdAt: new Date().toISOString()
  };
  const db = await initDB();
  const tx = db.transaction('users', 'readwrite');
  const finish = done(tx);
  tx.objectStore('users').add(user);
  try {
    await finish;
  } catch {
    throw Error('An account with this email already exists.');
  }
  return user;
}
// These checks prevent accidental cross-account access through the UI; client-side checks are not a security boundary.
export async function currentUser() {
  let s;
  try {
    s = JSON.parse(sessionStorage.getItem('se-session') || localStorage.getItem('se-session') || 'null');
  } catch {
    return null;
  }
  if (!s || s.expires < Date.now()) return null;
  const user = await getUser(s.userId);
  return user && user.sessionVersion === s.version ? user : null;
}
async function actor() {
  const user = await currentUser();
  if (!user) throw Error('Please sign in again.');
  return user;
}
export async function startSession(user, remember = false) {
  const version = user.sessionVersion || crypto.randomUUID();
  const db = await initDB();
  const tx = db.transaction('users', 'readwrite');
  const end = done(tx);
  const fresh = await req(tx.objectStore('users').get(user.id));
  fresh.sessionVersion = version;
  tx.objectStore('users').put(fresh);
  await end;
  sessionStorage.removeItem('se-session');
  localStorage.removeItem('se-session');
  (remember ? localStorage : sessionStorage).setItem('se-session', JSON.stringify({
    userId: user.id,
    version,
    expires: Date.now() + (remember ? 7 : 1) * 86400000
  }));
}
export async function updateUser({
  name,
  email,
  currentPassword,
  newPassword
}) {
  const user = await actor();
  if ((await hashPassword(currentPassword, user.credentials.salt)).hash !== user.credentials.hash)
  throw Error('Current password is incorrect.');
  const credentials = newPassword ? await hashPassword(passwordValid(newPassword)) : user.credentials;
  const db = await initDB();
  const tx = db.transaction('users', 'readwrite');
  const end = done(tx);
  const fresh = await req(tx.objectStore('users').get(user.id));
  tx.objectStore('users').put({
    ...fresh,
    name: textValue(name, 'Name', 2, 70),
    email: emailValue(email),
    credentials,
    sessionVersion: crypto.randomUUID()
  });
  try {
    await end;
  } catch {
    throw Error('This email is already used by another account.');
  }
  sessionStorage.removeItem('se-session');
  localStorage.removeItem('se-session');
}
export async function getBookingsByUser() {
  const user = await actor();
  const db = await initDB();
  return req(db.transaction('bookings').objectStore('bookings').index('userId').getAll(user.id));
}
export async function availability(hotelId, roomId, start, end) {
  validateDates(start, end);
  const h = await getHotel(hotelId);
  const room = h?.rooms.find(r => r.id === roomId);
  if (!room) throw Error('Room not found.');
  const bookings = await all('bookings');
  return room.units.filter(unit => !bookings.some(b => b.hotelId === hotelId && b.status !== 'cancelled' &&
    b.units.includes(unit) && overlaps(start, end, b.start, b.end)));
}
export async function addBooking({
  hotelId,
  roomId,
  start,
  end,
  count,
  guests,
  guestName,
  guestEmail,
  requestId
}) {
  const user = await actor();
  validateDates(start, end);
  if (!Number.isInteger(count) || count < 1 || count > 3) throw Error('Choose 1–3 rooms.');
  guestName = textValue(guestName, 'Guest name', 2, 70);
  guestEmail = emailValue(guestEmail);
  if (!/^[a-f0-9-]{36}$/.test(requestId)) throw Error('Invalid checkout. Please restart.');
  const db = await initDB();
  const tx = db.transaction(['hotels', 'bookings'], 'readwrite');
  const finished = done(tx);
  const store = tx.objectStore('bookings');
  const [hotel, bookings] = await Promise.all([req(tx.objectStore('hotels').get(hotelId)), req(store
  .getAll())]);
  const existing = bookings.find(b => b.userId === user.id && b.requestId === requestId);
  if (existing) {
    await finished;
    return existing;
  }
  const room = hotel?.rooms.find(r => r.id === roomId);
  let error;
  if (!room) error = 'Room not found.';
  else if (!Number.isInteger(guests) || guests < 1 || guests > room.capacity * count) error =
    'This room selection cannot accommodate your guests.';
  const units = room?.units.filter(unit => !bookings.some(b => b.hotelId === hotelId && b.status !==
    'cancelled' && b.units.includes(unit) && overlaps(start, end, b.start, b.end))) || [];
  if (units.length < count) error =
    'These rooms are no longer available. Please choose another room or dates.';
  if (error) {
    await finished;
    throw Error(error);
  }
  const booking = {
    id: `SE-${crypto.randomUUID().toUpperCase()}`,
    requestId,
    userId: user.id,
    hotelId,
    hotelName: hotel.name,
    city: hotel.city,
    image: hotel.images[0],
    roomId,
    roomName: room.name,
    units: units.slice(0, count),
    start,
    end,
    count,
    guests,
    guestName,
    guestEmail,
    price: room.price,
    ...quote(room, start, end, count),
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  store.add(booking);
  await finished;
  return booking;
}
export async function cancelBooking(id) {
  const user = await actor();
  const db = await initDB();
  const tx = db.transaction('bookings', 'readwrite');
  const end = done(tx);
  const s = tx.objectStore('bookings');
  const booking = await req(s.get(id));
  if (!booking || booking.userId !== user.id) {
    await end;
    throw Error('Booking not found.');
  }
  if (booking.start <= today() || booking.status === 'cancelled') {
    await end;
    throw Error('Only future bookings can be cancelled.');
  }
  s.put({
    ...booking,
    status: 'cancelled',
    cancelledAt: new Date().toISOString()
  });
  await end;
}
export async function getReviews(id) {
  const db = await initDB();
  return req(db.transaction('reviews').objectStore('reviews').index('hotelId').getAll(id));
}
export async function addReview(hotelId, rating, body) {
  const user = await actor();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw Error('Choose a rating from 1–5.');
  body = textValue(body, 'Review', 15, 1000);
  if (!await getHotel(hotelId)) throw Error('Hotel not found.');
  const bookings = await getBookingsByUser();
  if (!bookings.some(b => b.hotelId === hotelId && b.status !== 'cancelled' && b.end <= today()))
  throw Error('You can review this property after completing a stay.');
  const db = await initDB();
  const tx = db.transaction('reviews', 'readwrite');
  const end = done(tx);
  tx.objectStore('reviews').put({
    id: `${user.id}-${hotelId}`,
    hotelId,
    userId: user.id,
    name: user.name,
    rating,
    body,
    date: today()
  });
  await end;
}
export async function getWishlist() {
  const user = await actor();
  return (await read('wishlists', user.id))?.hotels || [];
}
export async function toggleWishlist(hotelId) {
  const user = await actor();
  if (!await getHotel(hotelId)) throw Error('Hotel not found.');
  const db = await initDB();
  const tx = db.transaction('wishlists', 'readwrite');
  const end = done(tx);
  const s = tx.objectStore('wishlists');
  const item = await req(s.get(user.id)) || {
    id: user.id,
    hotels: []
  };
  const saved = !item.hotels.includes(hotelId);
  item.hotels = saved ? [...item.hotels, hotelId] : item.hotels.filter(id => id !== hotelId);
  s.put(item);
  await end;
  return saved;
}
