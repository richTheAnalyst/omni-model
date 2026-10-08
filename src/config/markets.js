// Hard-coded target markets: country -> regions -> related cities, plus industries.
// Edit this file to add countries, regions, cities or industries.
//
// The API validates `region` and `sector` against the business profile the
// app sends, and that profile's geography and sectors are generated from the
// lists below (see src/config/profile.js) — so anything listed here is
// accepted by the API, and a value that isn't listed is rejected with a 422
// whose message names the valid values.

export const COUNTRIES = [
  {
    name: 'Ghana',
    regions: [
      { name: 'Greater Accra', cities: ['Accra', 'Tema', 'Madina', 'Spintex', 'East Legon', 'Dansoman', 'Adenta'] },
      { name: 'Western', cities: ['Sekondi-Takoradi', 'Tarkwa', 'Prestea', 'Axim', 'Half Assini', 'Bogoso'] },
      { name: 'Ashanti', cities: ['Kumasi', 'Obuasi', 'Ejisu', 'Konongo', 'Mampong', 'Bekwai'] },
      { name: 'Central', cities: ['Cape Coast', 'Kasoa', 'Winneba', 'Mankessim', 'Elmina', 'Swedru'] },
      { name: 'Eastern', cities: ['Koforidua', 'Nkawkaw', 'Akim Oda', 'Suhum', 'Nsawam', 'Akropong'] },
      { name: 'Volta', cities: ['Ho', 'Keta', 'Hohoe', 'Aflao', 'Sogakope', 'Kpando'] },
      { name: 'Northern', cities: ['Tamale', 'Yendi', 'Savelugu', 'Bimbilla'] },
      { name: 'Upper East', cities: ['Bolgatanga', 'Bawku', 'Navrongo'] },
      { name: 'Upper West', cities: ['Wa', 'Tumu', 'Lawra', 'Jirapa'] },
      { name: 'Bono', cities: ['Sunyani', 'Berekum', 'Dormaa Ahenkro', 'Wenchi'] },
      { name: 'Bono East', cities: ['Techiman', 'Kintampo', 'Atebubu'] },
      { name: 'Ahafo', cities: ['Goaso', 'Bechem', 'Kenyasi'] },
      { name: 'Oti', cities: ['Dambai', 'Nkwanta', 'Kadjebi'] },
      { name: 'Savannah', cities: ['Damongo', 'Bole', 'Salaga'] },
      { name: 'North East', cities: ['Nalerigu', 'Walewale', 'Gambaga'] },
      { name: 'Western North', cities: ['Sefwi Wiawso', 'Bibiani', 'Enchi'] },
    ],
  },
]

export const INDUSTRIES = [
  { value: 'mining', label: 'Mining' }, // verified
  { value: 'bank', label: 'Banks' }, // verified
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'retail', label: 'Retail' },
  { value: 'telecom', label: 'Telecoms' },
]

export const DEFAULT_COUNTRY = COUNTRIES[0].name

export const countryNames = () => COUNTRIES.map((c) => c.name)
export const regionsOf = (country) => COUNTRIES.find((c) => c.name === country)?.regions || []
export const citiesOf = (country, region) => regionsOf(country).find((r) => r.name === region)?.cities || []
export const industryLabel = (key, profile) =>
  INDUSTRIES.find((i) => i.value === key)?.label || profile?.sectors?.[key]?.label || key
