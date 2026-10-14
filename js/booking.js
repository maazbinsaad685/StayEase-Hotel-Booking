import {
  el,
  button,
  link,
  field,
  $,
  money,
  toast,
  empty,
  params,
  stayParams,
  quote,
  query,
  modal,
  today,
  busy,
  emailValue,
  textValue
} from './utils.js';
import {
  getHotel,
  addBooking,
  getBookingsByUser,
  cancelBooking,
  availability
} from './db.js';
import {
  pageHeading
} from './components.js';
export function validateCard(number, expiry, cvv) {
  const digits = String(number).replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(digits)) throw Error('Enter a valid card number. Use the test card shown below.');
  let sum = 0,
    alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (alternate) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alternate = !alternate;
  }
  if (sum % 10) throw Error('Card number checksum is invalid.');
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry);
  if (!match) throw Error('Use MM/YY for expiry.');
  const now = new Date();
  const year = 2000 + Number(match[2]),
    month = Number(match[1]);
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) throw Error(
    'This card has expired.');
  if (!/^\d{3,4}$/.test(cvv)) throw Error('CVV must be 3–4 digits.');
  return true;
}

function summary(h, r, stay, q) {
  return el('aside', {
    class: 'checkout-summary'
  }, el('img', {
    src: h.images[0],
    alt: h.name
  }), el('div', {
    class: 'summary-content'
  }, el('p', {
    class: 'eyebrow'
  }, 'YOUR LITTLE ESCAPE'), el('h2', {}, h.name), el('p', {
    class: 'muted'
  }, `${h.area}, ${h.city}`), el('hr'), el('strong', {}, r.name), el('p', {},
    `${stay.start} → ${stay.end}`), el('p', {
    class: 'muted'
  }, `${q.nights} nights · ${stay.guests} guests · ${stay.count} rooms`), el('div', {
    class: 'price-breakdown'
  }, el('div', {}, el('span', {}, 'Room subtotal'), el('span', {}, money(q.subtotal))), el('div', {},
    el('span', {}, 'Taxes (12%)'), el('span', {}, money(q.tax))), el('div', {
    class: 'total'
  }, el('strong', {}, 'Total (USD)'), el('strong', {}, money(q.total)))), el('p', {
    class: 'small muted'
  }, 'Demo reservation. Nothing will be charged.')));
}
export async function renderCheckout(root, user) {
  root.className = 'container section checkout-page';
  const p = params();
  if (p.get('confirmation')) {
    const bookings = await getBookingsByUser();
    const booking = bookings.find(b => b.id === p.get('confirmation'));
    if (!booking) {
      root.append(empty('Booking not found.', 'Open your bookings to view your reservations.',
        'bookings.html', 'My bookings'));
      return;
    }
    renderConfirmation(root, booking);
    return;
  }
  const hotel = await getHotel(p.get('id'));
  const room = hotel?.rooms.find(r => r.id === p.get('room'));
  if (!hotel || !room) {
    root.append(empty('Let’s choose a stay first.', 'Find your hotel and room before checking out.'));
    return;
  }
  const stay = stayParams();
  let q;
  try {
    q = quote(room, stay.start, stay.end, stay.count);
    if (!Number.isInteger(stay.count) || !Number.isInteger(stay.guests) || stay.guests > stay.count * room
      .capacity) throw Error('Choose enough rooms for all guests.');
    if ((await availability(hotel.id, room.id, stay.start, stay.end)).length < stay.count) throw Error(
      'This room is sold out for your dates.');
  } catch (e) {
    root.append(empty('Let’s adjust your stay.', e.message, `hotel.html?${query({id:hotel.id,...stay})}`,
      'Back to room selection'));
    return;
  }
  let step = 1;
  let guest;
  const requestId = crypto.randomUUID();
  const steps = el('ol', {
    class: 'steps',
    'aria-label': 'Checkout progress'
  });
  const content = el('section', {
    class: 'checkout-content'
  });
  root.append(link('← Back to your stay', `hotel.html?${query({id:hotel.id,...stay})}`, 'back-link'),
    pageHeading('MAKE IT A MEMORY', 'You’re almost there.',
      'A few details, then you can start looking forward to it.'), steps, el('div', {
      class: 'checkout-layout'
    }, content, summary(hotel, room, stay, q)));

  function render() {
    steps.replaceChildren(...['Your details', 'Demo payment', 'Confirmation'].map((s, i) => el('li', {
      class: step === i + 1 ? 'active' : step > i + 1 ? 'complete' : '',
      'aria-current': step === i + 1 ? 'step' : null
    }, el('span', {}, step > i + 1 ? '✓' : i + 1), s)));
    const form = el('form', {}, el('p', {
      class: 'eyebrow'
    }, `STEP ${step} OF 3`), el('h2', {}, step === 1 ? 'Who’s coming along?' : 'A little formality.'));
    if (step === 1) {
      form.append(el('p', {
          class: 'muted'
        }, 'The reservation will be made in the lead guest’s name.'), field('Guest name', 'guestName',
          'text', guest?.guestName || user.name, {
            required: true,
            minlength: 2,
            maxlength: 70,
            autocomplete: 'name'
          }), field('Email address', 'guestEmail', 'email', guest?.guestEmail || user.email, {
          required: true,
          maxlength: 254,
          autocomplete: 'email'
        }), el('div', {
          class: 'notice'
        }, 'Demo only: use fictional guest information. This browser stores your reservation locally.'),
        el('p', {
          class: 'form-error',
          role: 'alert'
        }), el('button', {
          type: 'submit',
          class: 'btn full'
        }, 'Continue to demo payment →'));
      form.addEventListener('submit', e => {
        e.preventDefault();
        const d = new FormData(form);
        try {
          guest = {
            guestName: textValue(d.get('guestName'), 'Guest name', 2, 70),
            guestEmail: emailValue(d.get('guestEmail'))
          };
          step = 2;
          render();
          content.scrollIntoView({
            block: 'start',
            behavior: 'smooth'
          });
        } catch (error) {
          toast(error.message, true);
        }
      });
    } else {
      form.append(el('div', {
        class: 'notice'
      }, el('strong', {}, 'Test payment only'), el('p', {},
        'Do not enter a real card. Use 4242 4242 4242 4242, any future expiry, and CVV 123. No payment is processed, transmitted, or saved.'
        )), field('Name on test card', 'cardName', 'text', guest.guestName, {
        required: true,
        minlength: 2,
        maxlength: 70,
        autocomplete: 'off'
      }), field('Test card number', 'cardNumber', 'text', '', {
        required: true,
        inputmode: 'numeric',
        maxlength: 23,
        placeholder: '4242 4242 4242 4242',
        autocomplete: 'off'
      }), el('div', {
        class: 'form-grid'
      }, field('Expiry', 'expiry', 'text', '', {
        required: true,
        inputmode: 'numeric',
        maxlength: 5,
        placeholder: 'MM/YY',
        autocomplete: 'off'
      }), field('CVV', 'cvv', 'password', '', {
        required: true,
        inputmode: 'numeric',
        minlength: 3,
        maxlength: 4,
        placeholder: '123',
        autocomplete: 'off'
      })), el('label', {
        class: 'check'
      }, el('input', {
        type: 'checkbox',
        required: true
      }), 'I understand this is a local demo reservation with no actual travel service.'), el('p', {
        class: 'form-error',
        role: 'alert'
      }), el('button', {
        type: 'submit',
        class: 'btn full'
      }, `Confirm demo booking · ${money(q.total)}`), button('← Back to details', () => {
        step = 1;
        render();
      }, 'text-btn'));
      $('#cardNumber', form).addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ')
      .trim();
      });
      $('#expiry', form).addEventListener('input', e => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 4);
        e.target.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v;
      });
      $('#cvv', form).addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
      form.addEventListener('submit', e => {
        e.preventDefault();
        busy(form, async () => {
          validateCard($('#cardNumber', form).value, $('#expiry', form).value, $('#cvv', form)
            .value);
          const booking = await addBooking({
            hotelId: hotel.id,
            roomId: room.id,
            ...stay,
            ...guest,
            requestId
          });
          form.reset();
          location.replace(`checkout.html?${query({confirmation:booking.id})}`);
        });
      });
    }
    content.replaceChildren(form);
  }
  render();
}

function renderConfirmation(root, b) {
  root.append(el('ol', {
    class: 'steps',
    'aria-label': 'Checkout progress'
  }, ['Your details', 'Demo payment', 'Confirmation'].map((label, i) => el('li', {
    class: i === 2 ? 'active' : 'complete',
    'aria-current': i === 2 ? 'step' : null
  }, el('span', {}, i === 2 ? '3' : '✓'), label))));
  root.append(el('div', {
    class: 'confirmation'
  }, el('div', {
    class: 'confirmation-check'
  }, '✓'), el('p', {
    class: 'eyebrow'
  }, 'LET THE COUNTDOWN BEGIN'), el('h1', {}, 'You’re going somewhere good.'), el('p', {
    class: 'muted'
  }, 'Your demo reservation is saved. No payment was made or email sent.'), el('div', {
    class: 'confirmation-ticket'
  }, el('p', {
    class: 'eyebrow'
  }, 'BOOKING REFERENCE'), el('code', {}, b.id), el('hr'), el('h2', {}, b.hotelName), el('p', {}, b
    .roomName), el('p', {}, `${b.start} → ${b.end} · ${b.nights} nights`), el('strong', {}, money(b
    .total))), el('div', {
    class: 'button-row'
  }, link('View my bookings', 'bookings.html', 'btn'), button('Print demo invoice', () => invoice(b),
    'btn outline')), link('Keep discovering →', 'search.html', 'text-btn')));
}
export function invoice(b) {
  let area = $('#print-invoice');
  if (area) area.remove();
  area = el('section', {
    id: 'print-invoice'
  }, el('h1', {}, 'StayEase — Demo invoice'), el('p', {},
    'Not a payment receipt. No money has been charged.'), el('p', {}, `Reference: ${b.id}`), el('p', {},
    `Created: ${b.createdAt.slice(0,10)}`), el('p', {}, `Guest: ${b.guestName} · ${b.guestEmail}`), el(
    'h2', {}, b.hotelName), el('p', {}, `${b.roomName} · ${b.count} rooms · ${b.guests} guests`), el(
  'p', {}, `${b.start} to ${b.end}`), el('table', {}, el('tbody', {}, [
    ['Nightly room rate', money(b.price)],
    ['Nights', b.nights],
    ['Subtotal', money(b.subtotal)],
    ['Tax (12%)', money(b.tax)],
    ['Total (USD)', money(b.total)],
    ['Status', b.status]
  ].map(([k, v]) => el('tr', {}, el('th', {
    scope: 'row'
  }, k), el('td', {}, v))))));
  document.body.append(area);
  window.print();
}
export async function renderBookings(root) {
  root.className = 'container section';
  let tab = 'Upcoming';
  const tabs = el('div', {
    class: 'tabs',
    'aria-label': 'Filter bookings'
  });
  const list = el('div', {
    class: 'bookings-list',
    'aria-live': 'polite'
  });
  root.append(pageHeading('YOUR NEXT CHAPTER', 'Trips to look forward to.',
    'All your little escapes, in one place.'), tabs, list);
  async function render() {
    tabs.replaceChildren(...['Upcoming', 'Completed', 'Cancelled'].map(t => button(t, () => {
      tab = t;
      render();
    }, tab === t ? 'active' : '', {
      'aria-pressed': String(tab === t)
    })));
    const bookings = (await getBookingsByUser()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const selected = bookings.filter(b => tab === 'Cancelled' ? b.status === 'cancelled' : b.status !==
      'cancelled' && (tab === 'Completed' ? b.end <= today() : b.end > today()));
    list.replaceChildren(...(selected.length ? selected.map(b => el('article', {
      class: 'booking-item'
    }, el('img', {
      src: b.image,
      alt: b.hotelName,
      loading: 'lazy'
    }), el('div', {
      class: 'booking-item-main'
    }, el('div', {
      class: 'section-head'
    }, el('span', {
      class: `status ${tab.toLowerCase()}`
    }, tab === 'Upcoming' && b.start <= today() ? 'In progress' : tab), el('span', {
      class: 'small muted'
    }, b.id.slice(0, 15))), el('h2', {}, b.hotelName), el('p', {
      class: 'muted'
    }, `${b.city} · ${b.roomName}`), el('div', {
      class: 'booking-facts'
    }, el('span', {}, `${b.start} → ${b.end}`), el('span', {},
      `${b.nights} nights · ${b.guests} guests · ${b.count} rooms`)), el('div', {
      class: 'section-head'
    }, el('strong', {
      class: 'price'
    }, money(b.total)), el('div', {
        class: 'button-row'
      }, button('Print invoice', () => invoice(b), 'btn outline'), ...(tab === 'Completed' ?
        [link('Review stay', `hotel.html?${query({id:b.hotelId})}`, 'btn outline')] : []),
      ...(tab === 'Upcoming' && b.start > today() ? [button('Cancel booking', () => {
        const cancel = button('Yes, cancel booking', async () => {
          cancel.disabled = true;
          try {
            await cancelBooking(b.id);
            dialog.close();
            toast('Your booking has been cancelled.');
            await render();
          } catch (e) {
            toast(e.message, true);
            cancel.disabled = false;
          }
        }, 'btn danger');
        const dialog = modal('Cancel this stay?', el('div', {}, el('p', {},
          `Cancel your demo reservation at ${b.hotelName}? These rooms will become available again.`
          ), el('div', {
            class: 'button-row'
          }, button('Keep my stay', () => dialog.close(), 'btn outline'),
          cancel)));
      }, 'text-btn danger-text')] : [])))))) : [empty(`No ${tab.toLowerCase()} trips yet.`, tab ===
      'Upcoming' ? 'Your next great stay is out there. Let’s find it.' :
      'Your trips will appear here when their status changes.')]));
  }
  await render();
}
