import {
  el,
  $,
  button,
  link,
  toast,
  empty,
  query
} from './utils.js';
import {
  initDB,
  getHotels,
  getWishlist,
  currentUser
} from './db.js';
import {
  renderAuth,
  requireAuth,
  logout
} from './auth.js';
import {
  hotelCard,
  searchForm,
  pageHeading
} from './components.js';
import {
  cities,
  photo,
  images
} from './data.js';
// Broken remote photographs get a local, accessible fallback.
document.addEventListener('error', event => {
  const image = event.target;
  if (image instanceof HTMLImageElement && !image.src.endsWith('/assets/images/fallback.svg')) image.src =
    'assets/images/fallback.svg';
}, true);

function theme() {
  let t;
  try {
    t = localStorage.getItem('se-theme');
  } catch {}
  document.documentElement.dataset.theme = t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' :
    'light');
}
theme();
document.addEventListener('theme-toggle', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('se-theme', t);
  } catch {}
});

function shell(user) {
  const current = location.pathname.split('/').pop();
  const nav = el('nav', {
    id: 'main-nav',
    class: 'nav-links',
    'aria-label': 'Main navigation'
  }, [
    ['Discover', 'home.html'],
    ['Find a stay', 'search.html'],
    ['My bookings', 'bookings.html']
  ].map(([label, href]) => link(label, href, current === href ? 'active' : '')));
  const account = el('details', {
    class: 'account-menu'
  }, el('summary', {
    'aria-label': 'Account menu'
  }, el('span', {
    class: 'avatar'
  }, user.name.slice(0, 1).toUpperCase()), el('span', {
    class: 'account-name'
  }, user.name.split(' ')[0]), '⌄'), el('div', {
    class: 'account-popover'
  }, link('My profile', 'profile.html'), link('My bookings', 'bookings.html'), link('Wishlist',
    'wishlist.html'), button('Sign out', logout, 'text-btn')));
  const header = el('header', {
    class: 'site-header'
  }, el('div', {
    class: 'nav-wrap container'
  }, el('a', {
    class: 'brand',
    href: 'home.html'
  }, el('span', {
    class: 'brand-mark'
  }, 's'), 'StayEase', el('span', {
    class: 'brand-dot'
  }, '.')), nav, el('div', {
    class: 'nav-actions'
  }, button('◐', () => document.dispatchEvent(new Event('theme-toggle')), 'icon-btn', {
    'aria-label': 'Toggle light and dark theme'
  }), link(el('i', {
    class: 'fa-regular fa-heart',
    'aria-hidden': 'true'
  }), 'wishlist.html', 'icon-btn'), account, button('☰', e => {
    const expanded = nav.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(expanded));
  }, 'icon-btn menu-toggle', {
    'aria-label': 'Toggle navigation',
    'aria-controls': 'main-nav',
    'aria-expanded': 'false'
  }))));
  const wish = header.querySelector('a[href="wishlist.html"]');
  wish.setAttribute('aria-label', 'Your wishlist');
  document.body.prepend(link('Skip to content', '#main', 'skip-link'), header);
  document.body.append(el('footer', {
    class: 'site-footer'
  }, el('div', {
    class: 'container footer-grid'
  }, el('div', {}, el('a', {
    class: 'brand inverse',
    href: 'home.html'
  }, el('span', {
    class: 'brand-mark'
  }, 's'), 'StayEase.'), el('p', {}, 'Find your place.', el('br'),
    'Make yourself a little more at home.')), el('div', {}, el('h3', {}, 'Explore'), link(
    'All destinations', 'search.html'), link('Bali escapes', 'search.html?city=Bali'), link(
    'Discover Pakistan', 'search.html?city=Karachi')), el('div', {}, el('h3', {}, 'Your StayEase'),
    link('My bookings', 'bookings.html'), link('Saved stays', 'wishlist.html'), link('My profile',
      'profile.html')), el('div', {}, el('h3', {}, 'Thoughtfully made'), el('p', {},
    '24 curated stays across 8 cities.', el('br'), 'Prices shown in USD.'))), el('div', {
    class: 'container footer-bottom'
  }, el('span', {}, '© 2026 StayEase. A travel booking portfolio.'), el('span', {},
    'Demo only · No real payments or reservations'))));
}
async function home(root) {
  const [hotels, wish] = await Promise.all([getHotels(), getWishlist()]);
  root.append(el('section', {
    class: 'hero'
  }, el('div', {
    class: 'hero-overlay'
  }), el('div', {
    class: 'container hero-content'
  }, el('span', {
    class: 'glass-tag'
  }, 'LESS ORDINARY. MORE YOU.'), el('h1', {}, 'Find your next', el('br'), el('em', {},
    'somewhere.')), el('p', {}, 'Beautiful places. Memorable stays. All in one place.'), el('div', {
    class: 'hero-social'
  }, '★★★★★', el('span', {}, 'A thoughtfully curated collection of stays')))), el('div', {
    class: 'container hero-search'
  }, searchForm()), el('div', {
    class: 'container trust-row'
  }, el('span', {}, '✓  Transparent prices'), el('span', {}, '✓  Flexible stays'), el('span', {},
    '✓  Places worth discovering')));
  root.append(el('section', {
    class: 'container section'
  }, el('div', {
    class: 'section-head'
  }, el('div', {}, el('p', {
    class: 'eyebrow'
  }, 'A LITTLE INSPIRATION'), el('h2', {}, 'Where will you go next?'), el('p', {
    class: 'muted'
  }, 'Familiar favorites. Wonderful new discoveries.')), link('Explore all destinations ↗',
    'search.html', 'text-btn')), el('div', {
    class: 'destination-grid'
  }, cities.slice(0, 4).map((c, i) => el('a', {
    class: `destination destination-${i}`,
    href: `search.html?${query({city:c.name})}`
  }, el('img', {
    src: photo(c.image, 800),
    alt: `Featured accommodation in ${c.name}`,
    loading: 'lazy'
  }), el('div', {}, el('span', {}, c.country), el('h3', {}, c.name), el('p', {}, c.tag)), el(
    'span', {
      class: 'destination-arrow',
      'aria-hidden': 'true'
    }, '↗'))))));
  root.append(el('section', {
    class: 'section soft-section'
  }, el('div', {
    class: 'container'
  }, el('div', {
    class: 'section-head'
  }, el('div', {}, el('p', {
    class: 'eyebrow'
  }, 'THE STAYEASE EDIT'), el('h2', {}, 'Worth staying for.'), el('p', {
    class: 'muted'
  }, 'Distinctive places, chosen with you in mind.')), link('View all stays ↗', 'search.html',
    'text-btn')), el('div', {
    class: 'hotel-grid'
  }, [hotels[0], hotels[4], hotels[8]].map(h => hotelCard(h, wish))))));
  root.append(el('section', {
      class: 'container section why-section'
    }, el('div', {}, el('p', {
      class: 'eyebrow'
    }, 'TRAVEL, A LITTLE LIGHTER'), el('h2', {}, 'Good stays.', el('br'), 'No second guesses.'), el(
      'p', {
        class: 'muted'
      }, 'Less time planning means more time being there. We make finding your next stay feel easy.')),
    el('div', {
      class: 'why-grid'
    }, [
      ['⌕', 'Find your kind of place', 'Use thoughtful filters to find a stay that fits your trip.'],
      ['◇', 'See the full picture', 'Clear room details and transparent totals before you book.'],
      ['♡', 'Keep your favorites close', 'Save the places you love and pick up where you left off.']
    ].map(([icon, title, copy]) => el('div', {}, el('span', {
      class: 'feature-icon',
      'aria-hidden': 'true'
    }, icon), el('h3', {}, title), el('p', {
      class: 'muted'
    }, copy))))));
  let slide = 0;
  const quotes = [
    ['“The kind of place you wish you could keep a secret. Every little detail felt considered.”',
      'Sara K.', 'A weekend in Bali'
    ],
    ['“From finding our hotel to planning the stay, everything was refreshingly simple.”', 'James W.',
      'A city break in Istanbul'
    ],
    ['“A comfortable room, a beautiful view, and a trip we’ll remember for a long time.”', 'Ayesha R.',
      'An escape to Islamabad'
    ]
  ];
  const quote = el('div', {
    'aria-live': 'polite'
  });
  const dots = el('div', {
    class: 'slider-dots'
  });

  function show() {
    quote.replaceChildren(el('div', {
      class: 'stars'
    }, '★★★★★'), el('blockquote', {}, quotes[slide][0]), el('strong', {}, quotes[slide][1]), el('p', {
      class: 'muted'
    }, quotes[slide][2]));
    dots.replaceChildren(...quotes.map((_, i) => button('●', () => {
      slide = i;
      show();
    }, i === slide ? 'active' : '', {
      'aria-label': `Show testimonial ${i+1}`,
      'aria-pressed': String(i === slide)
    })));
  }
  show();
  root.append(el('section', {
    class: 'testimonial section container'
  }, el('p', {
    class: 'eyebrow'
  }, 'STORIES FROM OUR DEMO COLLECTION'), quote, dots));
  const newsletter = el('form', {
    class: 'newsletter-form'
  }, el('label', {
    class: 'sr-only',
    for: 'newsletter'
  }, 'Email address'), el('input', {
    id: 'newsletter',
    name: 'email',
    type: 'email',
    required: true,
    maxlength: 254,
    placeholder: 'Your email address'
  }), el('button', {
    type: 'submit',
    class: 'btn'
  }, 'Keep me inspired ↗'));
  newsletter.addEventListener('submit', e => {
    e.preventDefault();
    localStorage.setItem('se-newsletter-demo', 'subscribed');
    toast('Demo preference saved. No emails will be sent.');
    newsletter.reset();
  });
  root.append(el('section', {
    class: 'container newsletter'
  }, el('div', {}, el('p', {
    class: 'eyebrow'
  }, 'A LITTLE WANDERLUST, DELIVERED'), el('h2', {}, 'Your next trip starts here.'), el('p', {},
    'Travel inspiration for the curious at heart. Demo signup.')), newsletter));
}
async function main() {
  const root = $('#main');
  try {
    await initDB();
    root.replaceChildren();
    const page = document.body.dataset.page;
    if (page === 'auth') {
      await renderAuth(root);
      return;
    }
    if (page === '404') {
      root.className = 'container section';
      root.append(empty('A little off the beaten path.',
        'This page seems to have wandered off. Let’s get you somewhere good.', 'home.html',
        'Back to discovering'));
      return;
    }
    const user = await requireAuth();
    if (!user) return;
    // Recheck protected screens restored from the back-forward cache or changed by another tab.
    const recheck = async () => {
      const active = await currentUser();
      if (!active || active.id !== user.id) location.replace('index.html');
    };
    window.addEventListener('pageshow', e => {
      if (e.persisted) recheck();
    });
    window.addEventListener('storage', e => {
      if (e.key === 'se-session') recheck();
    });
    shell(user);
    if (page === 'home') await home(root);
    else if (page === 'search') {
      await (await import('./search.js')).renderSearch(root);
    } else if (page === 'hotel') {
      await (await import('./hotel.js')).renderHotel(root);
    } else if (page === 'checkout' || page === 'bookings') {
      const b = await import('./booking.js');
      await (page === 'checkout' ? b.renderCheckout(root, user) : b.renderBookings(root));
    } else if (page === 'wishlist') {
      const [hotels, wish] = await Promise.all([getHotels(), getWishlist()]);
      root.className = 'container section';
      root.addEventListener('wishlist-change', e => {
        if (!e.detail.saved) {
          e.target.closest('.hotel-card')?.remove();
          if (!root.querySelector('.hotel-card')) root.querySelector('.hotel-grid')?.replaceWith(empty(
            'A world of possibilities.', 'Tap a heart on any stay to save it here.'));
        }
      });
      root.append(pageHeading('KEEP THE GOOD ONES', 'Your saved stays.',
        'A little collection of places you’d love to be.'), wish.length ? el('div', {
        class: 'hotel-grid'
      }, hotels.filter(h => wish.includes(h.id)).map(h => hotelCard(h, wish))) : empty(
        'A world of possibilities.', 'Tap a heart on any stay to save it here.'));
    } else if (page === 'profile') await (await import('./profile.js')).renderProfile(root, user);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }), {
        threshold: .08
      });
      document.querySelectorAll('.reveal').forEach(n => observer.observe(n));
    }
  } catch (error) {
    root.replaceChildren(empty('Something interrupted your trip.', error.message, 'index.html',
      'Try again'));
  }
}
export const ready = main();
