// eBay Finding API Integration
// Documentation: https://developer.ebay.com/devzone/finding/Concepts/FindingAPIGuide.html

// TODO: Get your App ID from https://developer.ebay.com/my/keys
// Replace 'YOUR_EBAY_APP_ID_HERE' with your actual App ID
const EBAY_APP_ID = 'YOUR_EBAY_APP_ID_HERE';

export interface EbayFigureResult {
  title: string;
  imageUrl: string;
  price?: number;
  condition?: string;
  year?: string;
  manufacturer?: string;
  description?: string;
  listingUrl: string;
  galleryImages?: string[];
}

export class EbaySearchService {
  /**
   * Search eBay for action figures
   * Uses the Finding API to search completed/sold listings
   */
  static async search(query: string): Promise<EbayFigureResult[]> {
    // Check if API key is configured
    if (EBAY_APP_ID === 'YOUR_EBAY_APP_ID_HERE') {
      console.warn('eBay API key not configured. Please add your App ID to ebayAPI.ts');
      return [];
    }

    // Build eBay Finding API URL
    // Using findCompletedItems to get real market data
    const url = `https://svcs.ebay.com/services/search/FindingService/v1?` +
      `OPERATION-NAME=findCompletedItems&` +
      `SERVICE-VERSION=1.0.0&` +
      `SECURITY-APPNAME=${EBAY_APP_ID}&` +
      `RESPONSE-DATA-FORMAT=JSON&` +
      `REST-PAYLOAD&` +
      `keywords=${encodeURIComponent(query + ' action figure')}&` +
      `categoryId=246&` + // Toys & Hobbies > Action Figures category
      `itemFilter(0).name=SoldItemsOnly&` +
      `itemFilter(0).value=true&` +
      `paginationInput.entriesPerPage=20&` +
      `sortOrder=EndTimeSoonest`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`eBay API error: ${response.status}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data.findCompletedItemsResponse?.[0]?.ack?.[0] === 'Failure') {
        const error = data.findCompletedItemsResponse[0].errorMessage?.[0]?.error?.[0];
        throw new Error(`eBay API Error: ${error?.message?.[0] || 'Unknown error'}`);
      }

      const items = data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

      // Parse and normalize results
      return items.map((item: any) => ({
        title: item.title?.[0] || 'Unknown Title',
        imageUrl: item.galleryURL?.[0] || item.pictureURLLarge?.[0] || '',
        price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
        condition: item.condition?.[0]?.conditionDisplayName?.[0],
        year: this.extractYear(item.title?.[0] || ''),
        manufacturer: this.extractManufacturer(item.title?.[0] || ''),
        description: item.subtitle?.[0],
        listingUrl: item.viewItemURL?.[0] || '',
        galleryImages: item.galleryURL ? [item.galleryURL[0]] : [],
      }));
    } catch (error) {
      console.error('eBay search failed:', error);
      throw error;
    }
  }

  /**
   * Extract year from listing title
   * Looks for 4-digit years between 1980-2029
   */
  private static extractYear(title: string): string | undefined {
    const yearMatch = title.match(/\b(19[89]\d|20[0-2]\d)\b/);
    return yearMatch ? yearMatch[0] : undefined;
  }

  /**
   * Extract manufacturer from listing title
   * Common action figure manufacturers
   */
  private static extractManufacturer(title: string): string | undefined {
    const manufacturers = [
      'Hasbro',
      'Mattel',
      'NECA',
      'Mezco',
      'Hot Toys',
      'Sideshow',
      'McFarlane',
      'Funko',
      'Super7',
      'Diamond Select',
      'Bandai',
      'Jakks Pacific',
      'Toy Biz',
      'Kenner',
    ];

    const titleLower = title.toLowerCase();

    for (const mfg of manufacturers) {
      if (titleLower.includes(mfg.toLowerCase())) {
        return mfg;
      }
    }

    return undefined;
  }

  /**
   * Extract product line from title
   * Common G.I. Joe and action figure lines
   */
  static extractProductLine(title: string): string | undefined {
    const productLines = [
      'G.I. Joe',
      'GI Joe',
      'Real American Hero',
      'Classified',
      'Sigma 6',
      'Marvel Legends',
      'Star Wars Black Series',
      'DC Multiverse',
      'Transformers',
      'Masters of the Universe',
      'MOTU',
      'WWE',
      'Power Rangers',
    ];

    const titleLower = title.toLowerCase();

    for (const line of productLines) {
      if (titleLower.includes(line.toLowerCase())) {
        return line;
      }
    }

    return undefined;
  }

  /**
   * Get detailed information for a specific listing
   * This would require the Shopping API (different endpoint)
   * Not implemented yet - would need additional API access
   */
  static async getDetailedImages(itemId: string): Promise<string[]> {
    // TODO: Implement Shopping API call for detailed images
    // For now, we get images from the Finding API results
    console.log('Detailed images not yet implemented for item:', itemId);
    return [];
  }

  /**
   * Search for similar items based on a figure
   * Useful for finding variations or related figures
   */
  static async searchSimilar(figureName: string): Promise<EbayFigureResult[]> {
    // Remove year and condition qualifiers for broader search
    const cleanQuery = figureName
      .replace(/\b(19|20)\d{2}\b/g, '') // Remove years
      .replace(/\b(MIB|MOC|Loose|Sealed)\b/gi, '') // Remove conditions
      .trim();

    return this.search(cleanQuery);
  }
}
