export type VehicleBrandDef = {
  name: string;
  slug: string;
  group: "japan" | "germany" | "italy" | "france" | "korea" | "usa" | "uk" | "sweden" | "other";
  models: string[];
};

export const VEHICLE_BRANDS: VehicleBrandDef[] = [
  { name: "Alfa Romeo", slug: "alfa-romeo", group: "italy", models: ["145", "146", "147", "156", "159", "Giulia", "Giulietta", "Mito", "Stelvio"] },
  { name: "Audi", slug: "audi", group: "germany", models: ["A1", "A3", "A4", "A5", "A6", "Q3", "Q5", "Q7", "TT"] },
  { name: "BMW", slug: "bmw", group: "germany", models: ["1 Serisi", "3 Serisi", "5 Serisi", "X1", "X3", "X5", "X6"] },
  { name: "Cadillac", slug: "cadillac", group: "usa", models: ["BLS", "CTS", "Escalade", "SRX"] },
  { name: "Chevrolet", slug: "chevrolet", group: "usa", models: ["Aveo", "Captiva", "Cruze", "Epica", "Evanda", "Kalos", "Lacetti", "Lanos", "Nubira", "Orlando", "Rezzo", "Spark", "Trax"] },
  { name: "Chrysler", slug: "chrysler", group: "usa", models: ["300C", "Grand Voyager", "PT Cruiser", "Sebring"] },
  { name: "Citroen", slug: "citroen", group: "france", models: ["Berlingo", "C3", "C4", "C5", "C-Elysee", "Picasso", "Xsara"] },
  { name: "Cupra", slug: "cupra", group: "other", models: ["Formentor", "Leon", "Ateca"] },
  { name: "Dacia", slug: "dacia", group: "france", models: ["Duster", "Lodgy", "Logan", "Sandero", "Spring"] },
  { name: "Daewoo", slug: "daewoo", group: "korea", models: ["Lanos", "Matiz", "Nubira", "Tico"] },
  { name: "Daihatsu", slug: "daihatsu", group: "japan", models: ["Sirion", "Terios", "YRV"] },
  { name: "Dodge", slug: "dodge", group: "usa", models: ["Avenger", "Caliber", "Journey", "Ram"] },
  { name: "Fiat", slug: "fiat", group: "italy", models: ["500", "Albea", "Doblo", "Egea", "Linea", "Palio", "Punto", "Uno"] },
  { name: "Ford", slug: "ford", group: "usa", models: ["Focus", "Fiesta", "Mondeo", "Kuga", "Transit", "Courier", "Connect"] },
  { name: "Honda", slug: "honda", group: "japan", models: ["Civic", "Accord", "City", "CR-V", "HR-V", "Jazz", "Civic Type R"] },
  { name: "Hyundai", slug: "hyundai", group: "korea", models: ["Accent", "Elantra", "i10", "i20", "i30", "ix35", "Tucson", "Santa Fe"] },
  { name: "Infiniti", slug: "infiniti", group: "japan", models: ["FX", "G", "Q50", "QX70"] },
  { name: "Jaguar", slug: "jaguar", group: "uk", models: ["XE", "XF", "XJ", "F-Pace", "E-Pace"] },
  { name: "Jeep", slug: "jeep", group: "usa", models: ["Cherokee", "Compass", "Grand Cherokee", "Renegade", "Wrangler"] },
  { name: "Kia", slug: "kia", group: "korea", models: ["Ceed", "Cerato", "Picanto", "Rio", "Sorento", "Sportage"] },
  { name: "Lancia", slug: "lancia", group: "italy", models: ["Delta", "Ypsilon", "Thema"] },
  { name: "Land Rover", slug: "land-rover", group: "uk", models: ["Defender", "Discovery", "Freelander", "Range Rover", "Range Rover Evoque"] },
  { name: "Lincoln", slug: "lincoln", group: "usa", models: ["MKX", "Navigator", "Town Car"] },
  { name: "Mazda", slug: "mazda", group: "japan", models: ["2", "3", "6", "CX-3", "CX-5", "MX-5"] },
  { name: "Mercedes", slug: "mercedes", group: "germany", models: ["A Serisi", "C Serisi", "E Serisi", "GLA", "GLC", "Sprinter", "Vito"] },
  { name: "Mini", slug: "mini", group: "uk", models: ["Cooper", "Countryman", "Clubman", "Paceman"] },
  { name: "Mitsubishi", slug: "mitsubishi", group: "japan", models: ["ASX", "Colt", "Lancer", "Outlander", "Pajero"] },
  { name: "Nissan", slug: "nissan", group: "japan", models: ["Juke", "Micra", "Note", "Qashqai", "X-Trail", "Navara"] },
  { name: "Opel", slug: "opel", group: "germany", models: ["Astra", "Corsa", "Insignia", "Mokka", "Vectra", "Zafira"] },
  { name: "Peugeot", slug: "peugeot", group: "france", models: ["206", "207", "208", "301", "307", "308", "3008", "Partner"] },
  { name: "Porsche", slug: "porsche", group: "germany", models: ["911", "Cayenne", "Macan", "Panamera"] },
  { name: "Proton", slug: "proton", group: "other", models: ["Gen-2", "Persona", "Saga"] },
  { name: "Renault", slug: "renault", group: "france", models: ["Clio", "Fluence", "Megane", "Symbol", "Talisman", "Captur", "Kadjar"] },
  { name: "Rover", slug: "rover", group: "uk", models: ["25", "45", "75", "Streetwise"] },
  { name: "Saab", slug: "saab", group: "sweden", models: ["9-3", "9-5"] },
  { name: "Seat", slug: "seat", group: "other", models: ["Ibiza", "Leon", "Toledo", "Ateca", "Arona"] },
  { name: "Skoda", slug: "skoda", group: "other", models: ["Fabia", "Octavia", "Rapid", "Superb", "Yeti", "Kodiaq"] },
  { name: "Smart", slug: "smart", group: "germany", models: ["ForTwo", "ForFour"] },
  { name: "Ssangyong", slug: "ssangyong", group: "korea", models: ["Actyon", "Korando", "Rexton", "Tivoli"] },
  { name: "Subaru", slug: "subaru", group: "japan", models: ["Forester", "Impreza", "Legacy", "Outback", "XV"] },
  { name: "Suzuki", slug: "suzuki", group: "japan", models: ["Alto", "Grand Vitara", "Swift", "SX4", "Vitara", "Jimny"] },
  { name: "Toyota", slug: "toyota", group: "japan", models: ["Auris", "Avensis", "Corolla", "Yaris", "RAV4", "C-HR", "Hilux"] },
  { name: "Volkswagen", slug: "volkswagen", group: "germany", models: ["Golf", "Passat", "Polo", "Jetta", "Tiguan", "Caddy", "Transporter"] },
  { name: "Volvo", slug: "volvo", group: "sweden", models: ["S40", "S60", "S80", "V40", "XC60", "XC90"] },
];

export function brandLogoUrl(slug: string) {
  return `/brands/${slug}.png`;
}
