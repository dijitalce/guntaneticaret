import { VEHICLE_BRANDS } from "@guntan/db/vehicle-catalog";

export type InferredFitment = { brand: string; model: string };

function fold(value: string) {
  return value
    .toLocaleUpperCase("tr-TR")
    .replaceAll("İ", "I")
    .replaceAll("I", "I")
    .replaceAll("Ş", "S")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C");
}

const EXTRA: Array<{ pattern: string; brand: string; model: string }> = [
  { pattern: "HILUX", brand: "Toyota", model: "Hilux" },
  { pattern: "RAV-4", brand: "Toyota", model: "RAV4" },
  { pattern: "RAV4", brand: "Toyota", model: "RAV4" },
  { pattern: "C-HR", brand: "Toyota", model: "C-HR" },
  { pattern: "CHR", brand: "Toyota", model: "C-HR" },
  { pattern: "AURIS", brand: "Toyota", model: "Auris" },
  { pattern: "AVENSIS", brand: "Toyota", model: "Avensis" },
  { pattern: "YARIS", brand: "Toyota", model: "Yaris" },
  { pattern: "COROLLA", brand: "Toyota", model: "Corolla" },
  { pattern: "CR-V", brand: "Honda", model: "CR-V" },
  { pattern: "CRV", brand: "Honda", model: "CR-V" },
  { pattern: "HR-V", brand: "Honda", model: "HR-V" },
  { pattern: "HRV", brand: "Honda", model: "HR-V" },
  { pattern: "CIVIC", brand: "Honda", model: "Civic" },
  { pattern: "ACCORD", brand: "Honda", model: "Accord" },
  { pattern: "JAZZ", brand: "Honda", model: "Jazz" },
  { pattern: "I-10", brand: "Hyundai", model: "i10" },
  { pattern: "I10", brand: "Hyundai", model: "i10" },
  { pattern: "I-20", brand: "Hyundai", model: "i20" },
  { pattern: "I20", brand: "Hyundai", model: "i20" },
  { pattern: "I-30", brand: "Hyundai", model: "i30" },
  { pattern: "I30", brand: "Hyundai", model: "i30" },
  { pattern: "IX35", brand: "Hyundai", model: "ix35" },
  { pattern: "IX55", brand: "Hyundai", model: "Santa Fe" },
  { pattern: "H-100", brand: "Hyundai", model: "H-100" },
  { pattern: "H100", brand: "Hyundai", model: "H-100" },
  { pattern: "STAREX", brand: "Hyundai", model: "Starex" },
  { pattern: "ACCENT", brand: "Hyundai", model: "Accent" },
  { pattern: "ELANTRA", brand: "Hyundai", model: "Elantra" },
  { pattern: "TUCSON", brand: "Hyundai", model: "Tucson" },
  { pattern: "SANTAFE", brand: "Hyundai", model: "Santa Fe" },
  { pattern: "SANTA FE", brand: "Hyundai", model: "Santa Fe" },
  { pattern: "L-300", brand: "Mitsubishi", model: "L300" },
  { pattern: "L300", brand: "Mitsubishi", model: "L300" },
  { pattern: "LANCER", brand: "Mitsubishi", model: "Lancer" },
  { pattern: "PAJERO", brand: "Mitsubishi", model: "Pajero" },
  { pattern: "OUTLANDER", brand: "Mitsubishi", model: "Outlander" },
  { pattern: "QASHQAI", brand: "Nissan", model: "Qashqai" },
  { pattern: "NAVARA", brand: "Nissan", model: "Navara" },
  { pattern: "MICRA", brand: "Nissan", model: "Micra" },
  { pattern: "X-TRAIL", brand: "Nissan", model: "X-Trail" },
  { pattern: "XTRAIL", brand: "Nissan", model: "X-Trail" },
  { pattern: "JUKE", brand: "Nissan", model: "Juke" },
  { pattern: "GOLF5", brand: "Volkswagen", model: "Golf" },
  { pattern: "GOLF 5", brand: "Volkswagen", model: "Golf" },
  { pattern: "GOLF", brand: "Volkswagen", model: "Golf" },
  { pattern: "PASSAT", brand: "Volkswagen", model: "Passat" },
  { pattern: "POLO", brand: "Volkswagen", model: "Polo" },
  { pattern: "JETTA", brand: "Volkswagen", model: "Jetta" },
  { pattern: "TIGUAN", brand: "Volkswagen", model: "Tiguan" },
  { pattern: "CADDY", brand: "Volkswagen", model: "Caddy" },
  { pattern: "TRANSPORTER", brand: "Volkswagen", model: "Transporter" },
  { pattern: "C-MAX", brand: "Ford", model: "C-Max" },
  { pattern: "CMAX", brand: "Ford", model: "C-Max" },
  { pattern: "FOCUS", brand: "Ford", model: "Focus" },
  { pattern: "FIESTA", brand: "Ford", model: "Fiesta" },
  { pattern: "MONDEO", brand: "Ford", model: "Mondeo" },
  { pattern: "CONNECT", brand: "Ford", model: "Connect" },
  { pattern: "TRANSIT", brand: "Ford", model: "Transit" },
  { pattern: "COURIER", brand: "Ford", model: "Courier" },
  { pattern: "MEGANE", brand: "Renault", model: "Megane" },
  { pattern: "CLIO", brand: "Renault", model: "Clio" },
  { pattern: "FLUENCE", brand: "Renault", model: "Fluence" },
  { pattern: "SYMBOL", brand: "Renault", model: "Symbol" },
  { pattern: "CAPTUR", brand: "Renault", model: "Captur" },
  { pattern: "KADJAR", brand: "Renault", model: "Kadjar" },
  { pattern: "PALIO", brand: "Fiat", model: "Palio" },
  { pattern: "ALBEA", brand: "Fiat", model: "Albea" },
  { pattern: "LINEA", brand: "Fiat", model: "Linea" },
  { pattern: "PUNTO", brand: "Fiat", model: "Punto" },
  { pattern: "DOBLO", brand: "Fiat", model: "Doblo" },
  { pattern: "EGEA", brand: "Fiat", model: "Egea" },
  { pattern: "ASTRA", brand: "Opel", model: "Astra" },
  { pattern: "CORSA", brand: "Opel", model: "Corsa" },
  { pattern: "VECTRA", brand: "Opel", model: "Vectra" },
  { pattern: "INSIGNIA", brand: "Opel", model: "Insignia" },
  { pattern: "MOKKA", brand: "Opel", model: "Mokka" },
  { pattern: "ZAFIRA", brand: "Opel", model: "Zafira" },
  { pattern: "IBIZA", brand: "Seat", model: "Ibiza" },
  { pattern: "LEON", brand: "Seat", model: "Leon" },
  { pattern: "OCTAVIA", brand: "Skoda", model: "Octavia" },
  { pattern: "FABIA", brand: "Skoda", model: "Fabia" },
  { pattern: "SUPERB", brand: "Skoda", model: "Superb" },
  { pattern: "VITARA", brand: "Suzuki", model: "Vitara" },
  { pattern: "SWIFT", brand: "Suzuki", model: "Swift" },
  { pattern: "JIMNY", brand: "Suzuki", model: "Jimny" },
  { pattern: "SX4", brand: "Suzuki", model: "SX4" },
  { pattern: "SORENTO", brand: "Kia", model: "Sorento" },
  { pattern: "SPORTAGE", brand: "Kia", model: "Sportage" },
  { pattern: "CEED", brand: "Kia", model: "Ceed" },
  { pattern: "PICANTO", brand: "Kia", model: "Picanto" },
  { pattern: "RIO", brand: "Kia", model: "Rio" },
  { pattern: "CERATO", brand: "Kia", model: "Cerato" },
  { pattern: "BONGO", brand: "Kia", model: "Bongo" },
  { pattern: "Q5", brand: "Audi", model: "Q5" },
  { pattern: "Q3", brand: "Audi", model: "Q3" },
  { pattern: "Q7", brand: "Audi", model: "Q7" },
  { pattern: "A1", brand: "Audi", model: "A1" },
  { pattern: "A3", brand: "Audi", model: "A3" },
  { pattern: "A4", brand: "Audi", model: "A4" },
  { pattern: "A5", brand: "Audi", model: "A5" },
  { pattern: "A6", brand: "Audi", model: "A6" },
  { pattern: "TT", brand: "Audi", model: "TT" },
  { pattern: "3 SERISI", brand: "BMW", model: "3 Serisi" },
  { pattern: "5 SERISI", brand: "BMW", model: "5 Serisi" },
  { pattern: "1 SERISI", brand: "BMW", model: "1 Serisi" },
  { pattern: "X1", brand: "BMW", model: "X1" },
  { pattern: "X3", brand: "BMW", model: "X3" },
  { pattern: "X5", brand: "BMW", model: "X5" },
  { pattern: "X6", brand: "BMW", model: "X6" },
  { pattern: "C SERISI", brand: "Mercedes", model: "C Serisi" },
  { pattern: "E SERISI", brand: "Mercedes", model: "E Serisi" },
  { pattern: "A SERISI", brand: "Mercedes", model: "A Serisi" },
  { pattern: "SPRINTER", brand: "Mercedes", model: "Sprinter" },
  { pattern: "VITO", brand: "Mercedes", model: "Vito" },
  { pattern: "GLC", brand: "Mercedes", model: "GLC" },
  { pattern: "GLA", brand: "Mercedes", model: "GLA" },
  { pattern: "206", brand: "Peugeot", model: "206" },
  { pattern: "207", brand: "Peugeot", model: "207" },
  { pattern: "208", brand: "Peugeot", model: "208" },
  { pattern: "301", brand: "Peugeot", model: "301" },
  { pattern: "307", brand: "Peugeot", model: "307" },
  { pattern: "308", brand: "Peugeot", model: "308" },
  { pattern: "3008", brand: "Peugeot", model: "3008" },
  { pattern: "508", brand: "Peugeot", model: "508" },
  { pattern: "1007", brand: "Peugeot", model: "1007" },
  { pattern: "PARTNER", brand: "Peugeot", model: "Partner" },
  { pattern: "C2", brand: "Citroen", model: "C2" },
  { pattern: "C3", brand: "Citroen", model: "C3" },
  { pattern: "C4", brand: "Citroen", model: "C4" },
  { pattern: "C5", brand: "Citroen", model: "C5" },
  { pattern: "BERLINGO", brand: "Citroen", model: "Berlingo" },
  { pattern: "XSARA", brand: "Citroen", model: "Xsara" },
  { pattern: "DUSTER", brand: "Dacia", model: "Duster" },
  { pattern: "SANDERO", brand: "Dacia", model: "Sandero" },
  { pattern: "LOGAN", brand: "Dacia", model: "Logan" },
  { pattern: "147", brand: "Alfa Romeo", model: "147" },
  { pattern: "156", brand: "Alfa Romeo", model: "156" },
  { pattern: "159", brand: "Alfa Romeo", model: "159" },
  { pattern: "GIULIA", brand: "Alfa Romeo", model: "Giulia" },
  { pattern: "GIULIETTA", brand: "Alfa Romeo", model: "Giulietta" },
  { pattern: "AVEO", brand: "Chevrolet", model: "Aveo" },
  { pattern: "CRUZE", brand: "Chevrolet", model: "Cruze" },
  { pattern: "CAPTIVA", brand: "Chevrolet", model: "Captiva" },
  { pattern: "LACETTI", brand: "Chevrolet", model: "Lacetti" },
  { pattern: "SPARK", brand: "Chevrolet", model: "Spark" },
  { pattern: "MAZDA 3", brand: "Mazda", model: "3" },
  { pattern: "MAZDA3", brand: "Mazda", model: "3" },
  { pattern: "CX-5", brand: "Mazda", model: "CX-5" },
  { pattern: "CX-3", brand: "Mazda", model: "CX-3" },
  { pattern: "FORESTER", brand: "Subaru", model: "Forester" },
  { pattern: "IMPREZA", brand: "Subaru", model: "Impreza" },
  { pattern: "LEGACY", brand: "Subaru", model: "Legacy" },
  { pattern: "OUTBACK", brand: "Subaru", model: "Outback" },
  { pattern: "XC60", brand: "Volvo", model: "XC60" },
  { pattern: "XC90", brand: "Volvo", model: "XC90" },
  { pattern: "S60", brand: "Volvo", model: "S60" },
  { pattern: "S40", brand: "Volvo", model: "S40" },
  { pattern: "XF", brand: "Jaguar", model: "XF" },
  { pattern: "XE", brand: "Jaguar", model: "XE" },
  { pattern: "RANGE ROVER", brand: "Land Rover", model: "Range Rover" },
  { pattern: "FREELANDER", brand: "Land Rover", model: "Freelander" },
  { pattern: "DISCOVERY", brand: "Land Rover", model: "Discovery" },
  { pattern: "DEFENDER", brand: "Land Rover", model: "Defender" },
  { pattern: "WRANGLER", brand: "Jeep", model: "Wrangler" },
  { pattern: "CHEROKEE", brand: "Jeep", model: "Cherokee" },
  { pattern: "COMPASS", brand: "Jeep", model: "Compass" },
  { pattern: "RENEGADE", brand: "Jeep", model: "Renegade" },
  { pattern: "COOPER", brand: "Mini", model: "Cooper" },
  { pattern: "COUNTRYMAN", brand: "Mini", model: "Countryman" },
  { pattern: "CAYENNE", brand: "Porsche", model: "Cayenne" },
  { pattern: "MACAN", brand: "Porsche", model: "Macan" },
  { pattern: "911", brand: "Porsche", model: "911" },
];

const BRAND_ONLY = VEHICLE_BRANDS.map((b) => ({
  pattern: fold(b.name),
  brand: b.name,
}));

type Rule = { needle: string; brand: string; model: string; len: number };

function buildRules(): Rule[] {
  const rules: Rule[] = [];
  for (const extra of EXTRA) {
    rules.push({ needle: fold(extra.pattern), brand: extra.brand, model: extra.model, len: fold(extra.pattern).length });
  }
  for (const brand of VEHICLE_BRANDS) {
    for (const model of brand.models) {
      const needle = fold(model);
      if (needle.length < 2) continue;
      rules.push({ needle, brand: brand.name, model, len: needle.length });
    }
  }
  rules.sort((a, b) => b.len - a.len);
  return rules;
}

const RULES = buildRules();

function hasToken(haystack: string, needle: string) {
  const idx = haystack.indexOf(needle);
  if (idx < 0) return false;
  const before = idx === 0 ? " " : haystack[idx - 1]!;
  const after = idx + needle.length >= haystack.length ? " " : haystack[idx + needle.length]!;
  const ok = (ch: string) => /[^A-Z0-9]/.test(ch);
  return ok(before) && ok(after);
}

export function inferFitments(name: string, limit = 8): InferredFitment[] {
  const hay = ` ${fold(name)} `;
  const found: InferredFitment[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    if (!hasToken(hay, rule.needle)) continue;
    const key = `${rule.brand}::${rule.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ brand: rule.brand, model: rule.model });
    if (found.length >= limit) return found;
  }
  if (found.length === 0) {
    for (const brand of BRAND_ONLY) {
      if (hasToken(hay, brand.pattern)) {
        found.push({ brand: brand.brand, model: "Diger" });
        break;
      }
    }
  }
  return found;
}
