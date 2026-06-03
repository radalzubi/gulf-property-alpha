/** Per-area building pools — shared by listings and transactions so the comp
 * engine can find genuine same-building comparables in the SAMPLE dataset. */
export const BUILDINGS_BY_AREA: Record<string, string[]> = {
  "dxb-dubai-marina": ["Marina Vista", "Marina Gate 1", "Marina Gate 2", "Stella Maris", "Sparkle Towers"],
  "dxb-jvc": ["Bloom Towers", "Belgravia Heights", "Oxford Residence", "Tower 108", "Binghatti Crest"],
  "dxb-business-bay": ["Azizi Riviera 1", "Azizi Riviera 12", "Merano Tower", "DAMAC Bay T1", "Peninsula One"],
  "dxb-downtown": ["Burj Vista 1", "Act One Act Two", "Forte 1", "BLVD Heights", "The Address Residences"],
  "dxb-dubai-hills": ["Park Heights 1", "Park Point", "Collective Tower A", "Hartland Greens", "Acacia"],
  "dxb-jlt": ["Cluster D Lake Terrace", "Goldcrest Views 1", "MAG 214", "Saba Tower 3", "Bonnington Tower"],
  "dxb-palm-jumeirah": ["Palm Beach Towers 1", "Shoreline Al Haseer", "Marina Residences 6", "Azure Residences"],
  "dxb-arjan": ["Vincitore Boulevard", "Samana Greens", "Miraclz Tower", "Azizi Venice 1"],
  "auh-al-reem-island": ["Reflection T1", "Sun Tower", "Sky Tower", "Marina Bay by DAMAC", "Tala Tower"],
  "auh-yas-island": ["Gardenia Bay B1", "Mayan T2", "Water's Edge B5", "Ansam 1", "The Bridges B3"],
  "auh-saadiyat-island": ["Bloom Living S1", "Mamsha Al Saadiyat", "Soho Square", "Park View"],
  "auh-al-raha-beach": ["Al Zeina A1", "Al Bandar Al Naseem", "Al Muneera Island", "The Gate Towers"],
  "auh-masdar-city": ["Oasis Residences 1", "Leonardo Residences", "The Gate District 2"],
};
