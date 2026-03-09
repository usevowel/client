/**
 * Smart DOM Search with Levenshtein Distance
 * 
 * Searches elements by text, classes, aria-labels, values, etc.
 * Uses spoken-word IDs (e.g., "apple_banana") for easy interaction
 * IDs are deterministically generated from XPath for consistency
 */

import { snapshotForAI, generateAriaTree } from './snapshot';

/**
 * Word list for generating spoken IDs (500 common, simple words)
 */
const WORD_LIST = [
  'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon',
  'mango', 'nectar', 'orange', 'papaya', 'quince', 'raspberry', 'strawberry', 'tangerine', 'ugli', 'vanilla',
  'watermelon', 'apricot', 'berry', 'citrus', 'dragon', 'fruit', 'guava', 'huckleberry', 'iced', 'juice',
  'kumquat', 'lime', 'melon', 'nectarine', 'olive', 'peach', 'plum', 'pear', 'raisin', 'star',
  'tomato', 'avocado', 'beet', 'carrot', 'daikon', 'eggplant', 'fennel', 'garlic', 'herb', 'ice',
  'jalapeno', 'kale', 'leek', 'mushroom', 'nut', 'onion', 'pepper', 'quinoa', 'radish', 'spinach',
  'turnip', 'yam', 'zucchini', 'bread', 'cake', 'donut', 'egg', 'flour', 'grain', 'honey',
  'jam', 'kernel', 'loaf', 'muffin', 'noodle', 'oat', 'pasta', 'rice', 'salt', 'toast',
  'wheat', 'yeast', 'beef', 'chicken', 'duck', 'fish', 'goat', 'ham', 'jerky', 'lamb',
  'meat', 'pork', 'quail', 'salmon', 'tuna', 'veal', 'bacon', 'butter', 'cheese', 'cream',
  'dairy', 'gelato', 'ice', 'milk', 'yogurt', 'bean', 'celery', 'corn', 'lettuce', 'pea',
  'squash', 'broccoli', 'cabbage', 'cucumber', 'green', 'pickle', 'salad', 'blue', 'red', 'green',
  'yellow', 'purple', 'orange', 'pink', 'brown', 'black', 'white', 'gray', 'silver', 'gold',
  'bronze', 'copper', 'iron', 'steel', 'wood', 'stone', 'rock', 'sand', 'clay', 'dirt',
  'grass', 'leaf', 'tree', 'flower', 'rose', 'tulip', 'daisy', 'lily', 'orchid', 'violet',
  'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'storm', 'thunder', 'lightning',
  'river', 'lake', 'ocean', 'sea', 'pond', 'stream', 'wave', 'beach', 'shore', 'island',
  'mountain', 'hill', 'valley', 'canyon', 'cliff', 'cave', 'forest', 'jungle', 'desert', 'field',
  'north', 'south', 'east', 'west', 'up', 'down', 'left', 'right', 'front', 'back',
  'top', 'bottom', 'side', 'edge', 'corner', 'center', 'middle', 'inside', 'outside', 'above',
  'below', 'over', 'under', 'next', 'previous', 'first', 'last', 'start', 'end', 'begin',
  'cat', 'dog', 'bird', 'fish', 'rabbit', 'mouse', 'horse', 'cow', 'pig', 'sheep',
  'goose', 'duck', 'hen', 'rooster', 'turkey', 'deer', 'bear', 'wolf', 'fox', 'lion',
  'tiger', 'elephant', 'monkey', 'zebra', 'giraffe', 'hippo', 'rhino', 'kangaroo', 'koala', 'panda',
  'car', 'truck', 'bus', 'train', 'plane', 'boat', 'ship', 'bike', 'scooter', 'skateboard',
  'rocket', 'helicopter', 'submarine', 'van', 'taxi', 'ambulance', 'firetruck', 'police', 'tractor', 'motorcycle',
  'house', 'home', 'building', 'tower', 'castle', 'palace', 'temple', 'church', 'school', 'hospital',
  'store', 'shop', 'market', 'mall', 'office', 'factory', 'warehouse', 'garage', 'barn', 'shed',
  'book', 'pen', 'pencil', 'paper', 'desk', 'chair', 'table', 'lamp', 'clock', 'phone',
  'computer', 'keyboard', 'mouse', 'screen', 'monitor', 'printer', 'scanner', 'camera', 'speaker', 'microphone',
  'shirt', 'pants', 'dress', 'skirt', 'jacket', 'coat', 'hat', 'cap', 'glove', 'sock',
  'shoe', 'boot', 'sandal', 'slipper', 'tie', 'scarf', 'belt', 'watch', 'ring', 'necklace',
  'ball', 'bat', 'racket', 'club', 'stick', 'puck', 'net', 'goal', 'hoop', 'target',
  'game', 'toy', 'puzzle', 'doll', 'robot', 'lego', 'block', 'card', 'dice', 'chess',
  'music', 'song', 'tune', 'beat', 'rhythm', 'melody', 'harmony', 'note', 'chord', 'key',
  'guitar', 'piano', 'drum', 'flute', 'violin', 'trumpet', 'saxophone', 'harp', 'bell', 'whistle',
  'happy', 'sad', 'glad', 'mad', 'calm', 'wild', 'hot', 'cold', 'warm', 'cool',
  'big', 'small', 'large', 'tiny', 'huge', 'mini', 'giant', 'short', 'tall', 'long',
  'wide', 'narrow', 'thick', 'thin', 'heavy', 'light', 'soft', 'hard', 'smooth', 'rough',
  'clean', 'dirty', 'bright', 'dark', 'loud', 'quiet', 'fast', 'slow', 'quick', 'lazy',
  'strong', 'weak', 'brave', 'shy', 'kind', 'mean', 'smart', 'silly', 'funny', 'serious',
  'new', 'old', 'young', 'ancient', 'modern', 'classic', 'vintage', 'fresh', 'stale', 'ripe',
  'raw', 'cooked', 'baked', 'fried', 'boiled', 'grilled', 'roasted', 'steamed', 'frozen', 'melted',
  'open', 'closed', 'locked', 'unlocked', 'hidden', 'visible', 'clear', 'blurry', 'sharp', 'dull',
  'full', 'empty', 'half', 'whole', 'partial', 'complete', 'broken', 'fixed', 'damaged', 'perfect',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'hundred', 'thousand', 'million', 'billion', 'zero', 'single', 'double', 'triple', 'multiple', 'many',
  'few', 'some', 'all', 'none', 'every', 'each', 'any', 'other', 'another', 'same',
  'different', 'similar', 'equal', 'unique', 'common', 'rare', 'special', 'normal', 'strange', 'weird'
];

/**
 * Levenshtein search options
 */
export interface LevenshteinSearchOptions {
  /** Maximum Levenshtein distance (lower = stricter, default: 3) */
  maxDistance?: number;
  
  /** Minimum similarity score 0-1 (higher = stricter, default: 0.6) */
  minSimilarity?: number;
  
  /** Maximum results to return (default: 10) */
  maxResults?: number;
  
  /** Search in class names (default: true) */
  searchClasses?: boolean;
  
  /** Search in element IDs (default: true) */
  searchIds?: boolean;
  
  /** Search in text content (default: true) */
  searchText?: boolean;
  
  /** Search in placeholders (default: true) */
  searchPlaceholders?: boolean;
  
  /** Search in aria labels (default: true) */
  searchAriaLabels?: boolean;
  
  /** Search in element values - inputs, selects, radio buttons, etc. (default: true) */
  searchValues?: boolean;
  
  /** Only return interactive elements (default: false) */
  requireInteractive?: boolean;
  
  /** Only return visible elements (default: true) */
  requireVisible?: boolean;
  
  /** Filter by tag name (e.g., 'button', 'input') */
  tag?: string;
}

/**
 * Search result element
 */
export interface SearchResultElement {
  /** Spoken-word ID for interaction (e.g., "apple_banana") */
  id: string;
  
  /** HTML tag name */
  tag: string;
  
  /** Element type (for inputs) */
  type?: string;
  
  /** Visible text content (truncated) */
  text?: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** ARIA label */
  ariaLabel?: string;
  
  /** Role */
  role?: string;
  
  /** Match score (0-1, higher = better) */
  matchScore: number;
  
  /** Field that matched (e.g., 'text', 'aria-label', 'class') */
  matchedField?: string;
  
  /** Value that matched */
  matchedValue?: string;
  
  /** Whether element is visible */
  visible: boolean;
  
  /** Whether element is interactive */
  interactive: boolean;
}

/**
 * Search results
 */
export interface DOMSearchResults {
  /** Search query that was used */
  query: string;
  
  /** Found elements */
  elements: SearchResultElement[];
  
  /** Total elements searched */
  totalSearched: number;
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Smart DOM Searcher with Levenshtein Distance
 * 
 * Features:
 * - Searches across all element properties (text, classes, aria-labels, values, etc.)
 * - Generates deterministic spoken-word IDs from XPath
 * - Maintains element store for reliable interaction
 */
export class FuzzyDOMSearcher {
  /** Element store: spoken ID -> actual element */
  private elementStore: Map<string, Element> = new Map();
  
  /**
   * Generate XPath for an element
   */
  private getElementXPath(element: Element): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    const parts: string[] = [];
    let current: Element | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const part = index > 1 ? `${tagName}[${index}]` : tagName;
      parts.unshift(part);
      
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }
  
  /**
   * Simple hash function for strings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Generate spoken-word ID from XPath
   * Format: "word1_word2" (e.g., "apple_banana")
   */
  private generateSpokenId(xpath: string): string {
    const hash = this.simpleHash(xpath);
    const word1Index = hash % WORD_LIST.length;
    const word2Index = Math.floor(hash / WORD_LIST.length) % WORD_LIST.length;
    return `${WORD_LIST[word1Index]}_${WORD_LIST[word2Index]}`;
  }
  
  /**
   * Get or create spoken ID for element
   */
  private getElementId(element: Element): string {
    // Check if element already has data-vowel-id attribute
    if (element instanceof HTMLElement) {
      const existingId = element.getAttribute('data-vowel-id');
      if (existingId && this.elementStore.get(existingId) === element) {
        return existingId;
      }
    }
    
    // Check if already in store
    for (const [id, el] of this.elementStore.entries()) {
      if (el === element) {
        return id;
      }
    }
    
    // Generate new ID
    const xpath = this.getElementXPath(element);
    const id = this.generateSpokenId(xpath);
    
    // Store element
    this.elementStore.set(id, element);
    
    // Set data-vowel-id attribute on the element for floating cursor to find it
    if (element instanceof HTMLElement) {
      element.setAttribute('data-vowel-id', id);
    }
    
    return id;
  }
  
  /**
   * Get element by spoken ID
   */
  getElementById(id: string): Element | null {
    return this.elementStore.get(id) || null;
  }
  
  /**
   * Clear element store (call on page navigation)
   */
  clearStore(): void {
    // Remove data-vowel-id attributes from all stored elements
    for (const [id, element] of this.elementStore.entries()) {
      if (element instanceof HTMLElement && element.getAttribute('data-vowel-id') === id) {
        element.removeAttribute('data-vowel-id');
      }
    }
    
    this.elementStore.clear();
    console.log('🗑️ [FuzzyDOMSearch] Element store cleared (removed data-vowel-id attributes)');
  }
  
  /**
   * Search for elements by term using Levenshtein distance
   * 
   * @param query - Search term (e.g., "cart button", "search", "add to cart")
   * @param options - Search options
   * @returns Search results with spoken IDs
   */
  search(query: string, options: LevenshteinSearchOptions = {}): DOMSearchResults {
    const {
      maxDistance = 3,
      minSimilarity = 0.3, // Lowered for better fuzzy matching (substring matches still score 0.9+)
      maxResults = 10,
      searchClasses = true,
      searchIds = true,
      searchText = true,
      searchPlaceholders = true,
      searchAriaLabels = true,
      searchValues = true,
      requireInteractive = false,
      requireVisible = true,
      tag = undefined
    } = options;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    console.log('🔍 [FuzzyDOMSearch] Searching for:', query);
    console.log('   Options:', { maxDistance, minSimilarity, maxResults });
    
    const allElements = Array.from(document.querySelectorAll('*')).slice(0, 2000);
    const results: Array<{ element: Element; score: number; matchedField: string; matchedValue: string }> = [];
    
    console.log('   Searching', allElements.length, 'elements');
    
    for (const element of allElements) {
      if (requireVisible && !this.isElementVisible(element)) continue;
      if (requireInteractive && !this.isElementInteractive(element)) continue;
      if (tag && element.tagName.toLowerCase() !== tag) continue;
      if (this.shouldSkipElement(element)) continue;
      
      let bestScore = 0;
      let bestField = '';
      let bestValue = '';
      
      // Search in class names
      if (searchClasses) {
        const classes = Array.from(element.classList);
        for (const className of classes) {
          const similarity = this.calculateSimilarity(normalizedQuery, className.toLowerCase(), maxDistance);
          if (similarity > bestScore) {
            bestScore = similarity;
            bestField = 'class';
            bestValue = className;
          }
        }
      }
      
      // Search in ID
      if (searchIds && element.id && typeof element.id === 'string') {
        const id = element.id.toLowerCase();
        const similarity = this.calculateSimilarity(normalizedQuery, id, maxDistance);
        if (similarity > bestScore) {
          bestScore = similarity;
          bestField = 'id';
          bestValue = id;
        }
      }
      
      // Search in text content
      if (searchText) {
        const rawText = (element as HTMLElement).innerText;
        if (rawText && typeof rawText === 'string') {
          const text = rawText.toLowerCase().trim();
          if (text && text.length < 200) {
            const similarity = this.calculateSimilarity(normalizedQuery, text, maxDistance);
            if (similarity > bestScore) {
              bestScore = similarity;
              bestField = 'text';
              bestValue = text;
            }
          }
        }
      }
      
      // Search in placeholder
      if (searchPlaceholders) {
        const rawPlaceholder = element.getAttribute('placeholder');
        if (rawPlaceholder && typeof rawPlaceholder === 'string') {
          const placeholder = rawPlaceholder.toLowerCase();
          const similarity = this.calculateSimilarity(normalizedQuery, placeholder, maxDistance);
          if (similarity > bestScore) {
            bestScore = similarity;
            bestField = 'placeholder';
            bestValue = placeholder;
          }
        }
      }
      
      // Search in aria-label
      if (searchAriaLabels) {
        const rawAriaLabel = element.getAttribute('aria-label');
        if (rawAriaLabel && typeof rawAriaLabel === 'string') {
          const ariaLabel = rawAriaLabel.toLowerCase();
          const similarity = this.calculateSimilarity(normalizedQuery, ariaLabel, maxDistance);
          if (similarity > bestScore) {
            bestScore = similarity;
            bestField = 'aria-label';
            bestValue = ariaLabel;
          }
        }
      }
      
      // Search in element values (inputs, selects, radio buttons, etc.)
      if (searchValues) {
        const rawValue = (element as HTMLInputElement).value;
        if (rawValue && typeof rawValue === 'string') {
          const value = rawValue.toLowerCase();
          const similarity = this.calculateSimilarity(normalizedQuery, value, maxDistance);
          if (similarity > bestScore) {
            bestScore = similarity;
            bestField = 'value';
            bestValue = value;
          }
        }
      }
      
      // Add to results if meets threshold
      if (bestScore >= minSimilarity) {
        // Apply small boost for preferred interactive elements
        let finalScore = bestScore;
        const tag = element.tagName.toLowerCase();
        
        // Boost labels (for form controls), buttons, and links slightly
        if (['label', 'button', 'a'].includes(tag)) {
          finalScore = Math.min(1.0, bestScore * 1.05);
        }
        
        results.push({
          element,
          score: finalScore,
          matchedField: bestField,
          matchedValue: bestValue
        });
      }
    }
    
    // Sort by score (highest first) and limit results
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, maxResults);
    
    console.log(`   ✅ Found ${topResults.length} matches (from ${results.length} candidates)`);
    
    // Debug: Show why we have so few results
    if (results.length === 0) {
      console.log('   ℹ️  No candidates found - check if minSimilarity is too strict');
    } else if (results.length < 5) {
      console.log(`   ℹ️  Only ${results.length} candidate(s) - possible issues:`);
      console.log('      - Query too specific?');
      console.log('      - minSimilarity too high? (current default: 0.4)');
      console.log('      - Try searching for more specific text (e.g., "ice" instead of "color")');
    }
    
    // Convert to SearchResultElement with spoken IDs
    const elements = topResults.map(result => {
      const element = result.element;
      const spokenId = this.getElementId(element);
      
      const text = (element as HTMLElement).innerText?.trim().substring(0, 50);
      const type = element.getAttribute('type') || undefined;
      const placeholder = element.getAttribute('placeholder') || undefined;
      const ariaLabel = element.getAttribute('aria-label') || undefined;
      const role = element.getAttribute('role') || undefined;
      
      return {
        id: spokenId,
        tag: element.tagName.toLowerCase(),
        type,
        text: text || undefined,
        placeholder,
        ariaLabel,
        role,
        matchScore: result.score,
        matchedField: result.matchedField,
        matchedValue: result.matchedValue,
        visible: this.isElementVisible(element),
        interactive: this.isElementInteractive(element)
      };
    });
    
    // Log top matches
    console.log('   Top 5 matches:');
    elements.slice(0, 5).forEach((el, i) => {
      console.log(`     ${i + 1}. [${el.id}] <${el.tag}> similarity=${el.matchScore.toFixed(2)} ${el.matchedField}="${el.matchedValue?.substring(0, 30)}"`);
      if (el.text) console.log(`        Text: "${el.text}"`);
    });
    
    // Build result
    const result: DOMSearchResults = {
      query,
      elements,
      totalSearched: allElements.length,
      timestamp: Date.now()
    };
    
    // Note: Snapshot is no longer auto-included
    // AI should explicitly call getPageSnapshot tool if needed
    
    return result;
  }
  
  /**
   * Get compressed page snapshot using Playwright's AI snapshot algorithm
   * Returns a hierarchical ARIA tree view optimized for AI comprehension
   * 
   * This uses the same algorithm as Playwright's built-in AI snapshot feature,
   * which provides semantic structure and interactive element references.
   * 
   * Performance optimizations:
   * - Uses efficient ARIA tree generation (O(n) where n = DOM nodes)
   * - Caches element mappings to avoid redundant lookups
   * - Uses regex replacement with pre-compiled patterns
   * - Detailed timing metrics for performance monitoring
   * - No size limits (LLM supports very long context)
   */
  getCompressedPageSnapshot(): string {
    const startTime = performance.now();
    console.log('📸 [FuzzyDOMSearch] Generating AI snapshot using Playwright algorithm...');
    
    try {
      // Generate ARIA snapshot using Playwright's algorithm
      // This creates a hierarchical tree with interactive element refs
      const treeStartTime = performance.now();
      const ariaSnapshot = generateAriaTree(document.body, { 
        mode: 'ai',
        refPrefix: '' // Use default 'e' prefix (e1, e2, etc.)
      });
      const treeEndTime = performance.now();
      console.log(`   ⏱️  Tree generation: ${(treeEndTime - treeStartTime).toFixed(2)}ms`);
      
      // Map Playwright refs (e1, e2, etc.) to our spoken IDs (apple_banana, etc.)
      // Performance: Pre-allocate map size based on elements count
      const refMapping: { [playwrightRef: string]: string } = {};
      
      const mappingStartTime = performance.now();
      ariaSnapshot.elements.forEach((element, playwrightRef) => {
        const spokenId = this.getElementId(element);
        refMapping[playwrightRef] = spokenId;
        
        // Store element in our store using spoken ID
        this.elementStore.set(spokenId, element);
      });
      const mappingEndTime = performance.now();
      console.log(`   ⏱️  Element mapping: ${(mappingEndTime - mappingStartTime).toFixed(2)}ms (${ariaSnapshot.elements.size} elements)`);
      
      // Render the tree to YAML format
      const renderStartTime = performance.now();
      let snapshotText = snapshotForAI(document.body, { mode: 'full' });
      const renderEndTime = performance.now();
      console.log(`   ⏱️  YAML rendering: ${(renderEndTime - renderStartTime).toFixed(2)}ms`);
      
      // Replace Playwright refs with spoken IDs for consistency with our tools
      // Performance: Use batch replacement with pre-built regex patterns
      const replaceStartTime = performance.now();
      
      // Build all replacement patterns at once (more efficient than creating regex in loop)
      const replacements = Object.entries(refMapping).map(([playwrightRef, spokenId]) => ({
        // Escape special regex characters in the ref
        pattern: new RegExp(`\\[ref=${playwrightRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'),
        replacement: `[ref=${spokenId}]`
      }));
      
      // Apply all replacements
      for (const { pattern, replacement } of replacements) {
        snapshotText = snapshotText.replace(pattern, replacement);
      }
      
      const replaceEndTime = performance.now();
      console.log(`   ⏱️  Ref replacement: ${(replaceEndTime - replaceStartTime).toFixed(2)}ms (${replacements.length} refs)`);
      
      // Count interactive elements
      const elementCount = ariaSnapshot.elements.size;
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`   ✅ Generated AI snapshot with ${elementCount} interactive elements`);
      console.log(`   📊 Snapshot size: ${(snapshotText.length / 1024).toFixed(1)}KB`);
      console.log(`   🎯 Total time: ${totalTime.toFixed(2)}ms`);
      
      // Performance warning for slow generation only (not size)
      // Size warnings removed - LLM supports very long context
      if (totalTime > 100) {
        console.warn(`⚠️  [Performance] Snapshot generation took ${totalTime.toFixed(0)}ms (threshold: 100ms)`);
        console.warn(`   Consider optimizing page structure if this impacts user experience`);
      }
      
      // Add header explaining the format
      const header = `PAGE SNAPSHOT (Playwright AI Format)
Interactive elements have [ref=spoken_id] tags for use with DOM tools.
Use these spoken IDs with clickElement, typeIntoElement, etc.

`;
      
      return header + snapshotText;
    } catch (error) {
      console.error('   ❌ Failed to generate AI snapshot:', error);
      return `Error generating snapshot: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   * Optimized with early exit for performance
   */
  private levenshteinDistance(a: string, b: string, maxDistance: number): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    // Early exit if length difference exceeds max distance
    if (Math.abs(a.length - b.length) > maxDistance) {
      return maxDistance + 1;
    }
    
    const matrix: number[][] = [];
    
    // Initialize first row and column
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      let minInRow = Infinity;
      
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
        minInRow = Math.min(minInRow, matrix[i][j]);
      }
      
      // Early exit if this row exceeds max distance
      if (minInRow > maxDistance) {
        return maxDistance + 1;
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  /**
   * Calculate similarity score from Levenshtein distance
   * Returns 0-1 (higher = more similar)
   * 
   * Enhanced with substring matching for better partial matches
   */
  private calculateSimilarity(query: string, target: string, maxDistance: number): number {
    // BOOST: If query is contained in target as a substring, give high score
    if (target.includes(query)) {
      // Perfect substring match - return high score based on how much of target it covers
      return 0.9 + (query.length / target.length) * 0.1; // 0.9 to 1.0
    }
    
    // BOOST: Check if query matches a whole word in target
    const words = target.split(/\s+/);
    for (const word of words) {
      if (word === query) {
        return 0.95; // Exact word match
      }
      if (word.includes(query)) {
        return 0.85 + (query.length / word.length) * 0.1; // 0.85 to 0.95
      }
    }
    
    // Fall back to Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(query, target, maxDistance);
    
    if (distance > maxDistance) {
      return 0;
    }
    
    // Normalize to 0-1 score
    const maxLen = Math.max(query.length, target.length);
    const similarity = 1 - (distance / maxLen);
    
    return Math.max(0, similarity);
  }
  
  /**
   * Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    const htmlElement = element as HTMLElement;
    const style = window.getComputedStyle(htmlElement);
    
    return !!(
      htmlElement.offsetWidth ||
      htmlElement.offsetHeight ||
      htmlElement.getClientRects().length
    ) && style.visibility !== 'hidden' && style.display !== 'none';
  }
  
  /**
   * Check if element is interactive
   */
  private isElementInteractive(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary', 'label'];
    
    if (interactiveTags.includes(tag)) {
      return true;
    }
    
    // Check for click handlers or tabindex
    const hasClickHandler = element.hasAttribute('onclick') || element.hasAttribute('on:click');
    const hasTabIndex = element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
    const hasRole = element.getAttribute('role') === 'button' || element.getAttribute('role') === 'link';
    const hasCursor = window.getComputedStyle(element as HTMLElement).cursor === 'pointer';
    
    return hasClickHandler || hasTabIndex || hasRole || hasCursor;
  }
  
  /**
   * Check if element should be skipped
   */
  private shouldSkipElement(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    const skipTags = ['script', 'style', 'noscript', 'meta', 'link', 'br', 'hr', 'svg', 'path'];
    
    return skipTags.includes(tag);
  }
}
