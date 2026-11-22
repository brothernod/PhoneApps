// Starting list, from the Notes list. Prices checked Nov 22, 2026.
// "low"/"high" are per-unit ballparks; quantity multiplies them.
window.BF_SEED = [
  {
    id: "blinds", title: "Smart blinds", qty: 1, low: 180, high: 300,
    priceNote: "Per window, so set the quantity to the number of windows. SmartWings Matter-over-Thread roller shades start at $179.99; bigger or custom sizes cost more.",
    cands: [
      { id: "blinds-sw", label: "SmartWings 70% blackout roller (Matter/Thread)", url: "https://www.smartwingshome.com/products/smartwings-motorized-light-filtering-roller-shades-70-blackout-safari", price: 179.99 },
    ],
  },
  {
    id: "mocca", title: "Moccamaster coffee maker", qty: 1, low: 247.95, high: 260.95, regular: 369.95,
    priceNote: "Williams Sonoma has the KBGV Select at $247.95–$260.95 (suggested $369.95–$389.95). Price varies a little by color.",
    cands: ["Eucalyptus", "Silver", "Juniper", "Ocean"].map((c) => ({
      id: "mocca-" + c.toLowerCase(), label: c,
      url: "https://www.williams-sonoma.com/products/technivorm-moccamaster-kgb-select/",
      img: "https://assets.wsimgs.com/wsimgs/rk/images/dp/wcm/202641/0008/moccamaster-by-technivorm-kbgv-select-coffee-maker-10-cup-c.jpg",
      price: null,
    })),
  },
  {
    id: "printer", title: "3D printer", qty: 1, low: 800, high: 900, regular: 899,
    priceNote: "The X2D Combo (with AMS 2 Pro) lists at $899.99 at Best Buy, so $800 would be a sale price.",
    cands: [
      { id: "printer-x2d", label: "Bambu Lab X2D Combo (AMS 2 Pro)", url: "https://www.bestbuy.com/site/6675713.p", price: 899.99 },
    ],
  },
  {
    id: "ipot", title: "Instant Pot", qty: 1, low: 60, high: 100,
    priceNote: "The Duo 6-quart has dropped to about $60–80 around past Black Fridays.",
    cands: [],
  },
  {
    id: "airpods", title: "AirPods Pro 3", qty: 2, low: 179, high: 249, regular: 249,
    priceNote: "Amazon has them at $179 each for early Black Friday (list $249).",
    cands: [{ id: "airpods-3", label: "AirPods Pro 3", url: "", price: 179 }],
  },
  {
    id: "airtags", title: "More AirTags", qty: 1, low: 70, high: 99, regular: 99,
    priceNote: "The AirTag 2 four-pack hit a record low of $69.99 (list $99).",
    cands: [{ id: "airtags-2", label: "AirTag 2 (4-pack)", url: "", price: 69.99 }],
  },
  {
    id: "ev", title: "EV charger", qty: 1, low: 429, high: 699,
    priceNote: "Charger only. Installation is extra.",
    cands: [
      { id: "ev-wallbox", label: "Wallbox Pulsar Plus 48A", url: "https://www.bestbuy.com/site/wallbox-cable-pulsar-plus-j1772-level-2-hardwired-electric-vehicle-ev-charger-up-to-48a-25-black/6520408.p", price: 614.99 },
      { id: "ev-emporia", label: "Emporia Classic 48A", url: "https://shop.emporiaenergy.com/products/emporia-ev-charger", price: 429 },
    ],
  },
  {
    id: "heater", title: "Heater + air purifier for Holden's room", qty: 1, low: 400, high: 660,
    priceNote: "Best Buy had the Dyson HP1 at $499.99 ($659.99 list). The Gen1 HP10 hit $399.99 on Prime Day.",
    cands: [
      { id: "heater-hp1", label: "Dyson Purifier Hot+Cool HP1", url: "https://www.amazon.com/dp/B0F468V6BW", price: 499.99 },
      { id: "heater-hp10", label: "Dyson Purifier Hot+Cool Gen1 HP10", url: "https://www.amazon.com/dp/B0CDQW6Q7W", price: 399.99 },
    ],
  },
  {
    id: "mattress", title: "King mattress", qty: 1, low: 900, high: 2000,
    priceNote: "Black Friday king prices start around $899–999 (DreamCloud). Premium brands run $2,000 and up.",
    cands: [],
  },
  {
    id: "bed", title: "King bed frame", qty: 1, low: 400, high: 2000,
    priceNote: "To match the Nara set. Generic bamboo king frames are $300–400. Solid-bamboo makers are closer to $2,000.",
    cands: [],
  },
  {
    id: "ups", title: "UPS for the network rack", qty: 1, low: 360, high: 400, regular: 399.95,
    priceNote: "The CyberPower CP1500PFCRM2U is $359.95 at CDW, Staples and Newegg (MSRP $399.95).",
    cands: [
      { id: "ups-cp1500", label: "CyberPower CP1500PFCRM2U (2U, pure sine)", url: "https://www.cdw.com/product/cyberpower-cp1500pfcrm2u-pfc-sinewave-ups-systems/7130945", price: 359.95 },
    ],
  },
  {
    id: "doorsensor", title: "Garage-to-house door sensor", qty: 1, low: 25, high: 35,
    priceNote: "Matter over Thread. It pairs to Apple Home through an Apple TV or HomePod.",
    cands: [
      { id: "door-p2", label: "Aqara Door & Window Sensor P2", url: "https://ameridroid.com/products/aqara-door-and-window-sensor-p2", price: 29.95 },
    ],
  },
  {
    id: "shelly", title: "Shelly relay", qty: 1, low: 18, high: 28,
    priceNote: "The Shelly 1 Gen4 (Wi-Fi, Zigbee and Matter) is $27.99 from Shelly US and was $17.59 in an Amazon sale.",
    cands: [
      { id: "shelly-1g4", label: "Shelly 1 Gen4 (UL)", url: "https://us.shelly.com/products/shelly-1-gen4-ul-certified-1", price: 27.99 },
    ],
  },
  {
    id: "lock", title: "Garage door lock", qty: 1, low: 190, high: 270,
    priceNote: "The Aqara U200 (Matter/Thread, Apple Home Key) is about $270. The Yale Assure Lock 2 with keypad is about $189.",
    cands: [
      { id: "lock-u200", label: "Aqara Smart Lock U200", url: "", price: 269.99 },
      { id: "lock-yale", label: "Yale Assure Lock 2 (Wi-Fi + keypad)", url: "", price: 189 },
    ],
  },
  {
    id: "water", title: "Water shutoff + monitor", qty: 1, low: 400, high: 625,
    priceNote: "The Moen Flo 3/4\" runs $549–624. In July, Costco sold it with 2 leak sensors for $399.97. A plumber to install it is extra.",
    cands: [
      { id: "water-flo", label: "Moen Flo Smart Water Monitor & Shutoff (3/4\")", url: "https://www.abt.com/Moen-0.75-Inch-Flo-Smart-Water-Monitor-Shutoff-900001/p/196201.html", price: 559 },
    ],
  },
  {
    id: "leaks", title: "Leak detectors", qty: 4, low: 20, high: 35,
    priceNote: "Price is per sensor. The Aqara T1 is Zigbee, so it needs an Aqara hub or a Zigbee coordinator in Home Assistant.",
    cands: [
      { id: "leak-t1", label: "Aqara Water Leak Sensor T1", url: "https://www.target.com/p/aqara-smart-water-leak-sensor-t1-white/-/A-92777096", price: null },
    ],
  },
].map((it) => ({
  why: "", regular: null, status: "considering", chosen: null,
  heartJ: null, heartR: null, noteJ: "", noteR: "", purchase: null,
  ...it,
  cands: it.cands.map((c) => ({ img: null, price: null, url: "", ...c })),
}));
