// Mirrors NICHE_OPTIONS / NICHE_OPTIONS_MORE in the web app's Profile.jsx.
// Hosts filter creators on these strings, so the two lists have to agree
// exactly — a niche spelled differently here is invisible to host search.
export const NICHE_OPTIONS = [
  "Travel", "Cabins & Stays", "Mountain", "Beach", "Coastal", "Outdoors",
  "Adventure", "Lifestyle", "Food & Dining", "Fashion", "Fitness", "Wellness",
  "Photography", "Tech", "City Life", "Eco & Sustainable", "Luxury", "Design",
];

// Searchable, not shown by default.
export const NICHE_OPTIONS_MORE = [
  "Family Travel", "Solo Travel", "Couples Travel", "Budget Travel", "Backpacking",
  "Road Trips", "Van Life", "Digital Nomad", "Glamping", "Camping",
  "Tiny Homes", "Treehouses", "Villas & Resorts", "Boutique Hotels", "Bed & Breakfast",
  "Lakefront", "Desert", "Countryside", "National Parks", "Island Life",
  "Ski & Snowboard", "Surfing", "Hiking", "Climbing", "Water Sports",
  "Boating & Sailing", "Fishing", "Golf", "Yoga & Meditation", "Spa & Retreats",
  "Honeymoon & Romance", "Weddings & Events", "Pet-Friendly", "Family & Parenting", "Beauty",
  "Home & Interior", "Art & Culture", "History & Heritage", "Architecture", "Music & Festivals",
  "Nightlife", "Coffee & Cafés", "Wine & Vineyards", "Craft Beer & Spirits", "Vegan & Plant-Based",
  "Street Food", "Fine Dining", "Wildlife & Safari",
];

export const ALL_NICHES = [...NICHE_OPTIONS, ...NICHE_OPTIONS_MORE];
