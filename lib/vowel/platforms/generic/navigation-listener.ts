/**
 * Vowel Navigation Tab Listener
 * This script should be included in Shopify theme to handle cross-tab messages
 * Listens for messages from the main tab (with voice agent) and performs actions
 * 
 * Includes DOM snapshot and manipulation capabilities for AI-driven interactions
 * 
 * Usage in Shopify theme.liquid:
 * ```html
 * <script src="https://assets.codetek.us/apps/vowel/vowel-navigation-listener.js"></script>
 * ```
 */

import { DOMManipulator } from './dom-tools';
import { FuzzyDOMSearcher } from './dom-search';
import { registerControlledBannerWebComponent } from '../../components/web-components/ControlledBannerWebComponent';
import { registerFloatingMicButtonWebComponent } from '../../components/web-components/FloatingMicButtonWebComponent';


/**
 * Current voice session state (updated via messages from main tab)
 */
let currentVoiceState = {
  isConnected: false,
  isConnecting: false,
  isUserSpeaking: false,
  isAISpeaking: false,
  isAIThinking: false,
  isResuming: false
};

/**
 * Create and show the "Controlled by Vowel" banner
 * Called when ping is received (confirms this tab is controlled)
 */
function showControlledBanner(): void {
  console.log('🎨 [NavigationListener] Showing controlled banner...');
  
  // Check if banner already exists
  if (document.getElementById('vowel-control-banner')) {
    console.log('   ℹ️  Banner already exists, skipping');
    return;
  }

  // Ensure web component is registered
  registerControlledBannerWebComponent();

  // Create the banner web component
  const banner = document.createElement('vowel-controlled-banner') as HTMLElement;
  banner.id = 'vowel-control-banner';
  
  // Set initial state - use kebab-case for HTML attributes
  banner.setAttribute('is-connected', String(currentVoiceState.isConnected));
  banner.setAttribute('is-connecting', String(currentVoiceState.isConnecting));
  banner.setAttribute('is-user-speaking', String(currentVoiceState.isUserSpeaking));
  banner.setAttribute('is-ai-speaking', String(currentVoiceState.isAISpeaking));
  banner.setAttribute('is-ai-thinking', String(currentVoiceState.isAIThinking));
  banner.setAttribute('is-resuming', String(currentVoiceState.isResuming));

  // Insert banner at top of body
  if (document.body) {
    document.body.insertBefore(banner, document.body.firstChild);
    console.log('✅ [NavigationListener] Vowel control banner displayed (web component)');
  } else {
    console.warn('⚠️ [NavigationListener] document.body not ready, deferring banner');
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body && !document.getElementById('vowel-control-banner')) {
        document.body.insertBefore(banner, document.body.firstChild);
        console.log('✅ [NavigationListener] Vowel control banner displayed (deferred, web component)');
      }
    });
  }
}

/**
 * Create and show the floating microphone button (mimics main tab's floating button)
 */
function showFloatingMicButton(): void {
  console.log('🎤 [NavigationListener] Creating floating microphone button...');
  
  // Check if button already exists
  if (document.getElementById('vowel-floating-mic')) {
    console.log('   ℹ️  Floating mic button already exists, skipping');
    return;
  }

  // Ensure web component is registered
  registerFloatingMicButtonWebComponent();

  // Create the floating mic button web component
  const floatingButton = document.createElement('vowel-floating-mic-button') as HTMLElement;
  floatingButton.id = 'vowel-floating-mic';
  
  // Set initial state - use kebab-case for HTML attributes
  floatingButton.setAttribute('is-connected', String(currentVoiceState.isConnected));
  floatingButton.setAttribute('is-connecting', String(currentVoiceState.isConnecting));
  floatingButton.setAttribute('is-user-speaking', String(currentVoiceState.isUserSpeaking));
  floatingButton.setAttribute('is-ai-speaking', String(currentVoiceState.isAISpeaking));
  floatingButton.setAttribute('is-ai-thinking', String(currentVoiceState.isAIThinking));
  floatingButton.setAttribute('is-resuming', String(currentVoiceState.isResuming));

  // Insert floating button
  if (document.body) {
    document.body.appendChild(floatingButton);
    console.log('✅ [NavigationListener] Floating microphone button displayed (web component)');
    
    // Setup button click handler
    setupMicrophoneButton();
  } else {
    console.warn('⚠️ [NavigationListener] document.body not ready, deferring floating button');
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body && !document.getElementById('vowel-floating-mic')) {
        document.body.appendChild(floatingButton);
        console.log('✅ [NavigationListener] Floating microphone button displayed (deferred, web component)');
        setupMicrophoneButton();
      }
    });
  }
}

/**
 * Setup microphone button click handler and request initial state
 */
function setupMicrophoneButton(): void {
  const floatingButton = document.getElementById('vowel-floating-mic');
  if (!floatingButton) return;
  
  floatingButton.addEventListener('click', () => {
    console.log('🎤 [NavigationListener] Microphone button clicked - stopping voice session and closing tab');
    
    // Send message to main tab to stop voice session
    const channel = new BroadcastChannel('vowel-navigation');
    channel.postMessage({
      type: 'stopVoiceSession',
      timestamp: Date.now()
    });
    
    console.log('✅ [NavigationListener] Stop voice session message sent to main tab');
    console.log('🚪 [NavigationListener] Closing controlled tab...');
    
    // Close this tab after a short delay to ensure message is sent
    setTimeout(() => {
      window.close();
    }, 100);
  });
  
  // Request current voice state from main tab
  console.log('🎤 [NavigationListener] Requesting current voice state from main tab...');
  const channel = new BroadcastChannel('vowel-navigation');
  channel.postMessage({
    type: 'requestVoiceState',
    timestamp: Date.now()
  });
  
  console.log('✅ [NavigationListener] Microphone button setup complete');
}

/**
 * Update microphone button and banner visual state
 */
function updateMicrophoneButtonState(state: typeof currentVoiceState): void {
  const floatingButton = document.getElementById('vowel-floating-mic');
  const banner = document.getElementById('vowel-control-banner');
  
  if (!floatingButton) {
    console.warn('⚠️ [NavigationListener] Button element not found - cannot update state');
    return;
  }
  
  // Update global state
  currentVoiceState = { ...state };
  
  // Update floating button web component attributes
  // IMPORTANT: Use kebab-case for HTML attributes - r2wc converts them to camelCase props
  floatingButton.setAttribute('is-connected', String(state.isConnected));
  floatingButton.setAttribute('is-connecting', String(state.isConnecting));
  floatingButton.setAttribute('is-user-speaking', String(state.isUserSpeaking));
  floatingButton.setAttribute('is-ai-speaking', String(state.isAISpeaking));
  floatingButton.setAttribute('is-ai-thinking', String(state.isAIThinking));
  floatingButton.setAttribute('is-resuming', String(state.isResuming));
  
  // Update banner web component attributes (if it exists)
  if (banner) {
    banner.setAttribute('is-connected', String(state.isConnected));
    banner.setAttribute('is-connecting', String(state.isConnecting));
    banner.setAttribute('is-user-speaking', String(state.isUserSpeaking));
    banner.setAttribute('is-ai-speaking', String(state.isAISpeaking));
    banner.setAttribute('is-ai-thinking', String(state.isAIThinking));
    banner.setAttribute('is-resuming', String(state.isResuming));
  }
  
  // Log the actual attribute values set on the elements
  console.log('🎨 [NavigationListener] Microphone button and banner state updated:', {
    state: {
      isConnected: state.isConnected,
      isConnecting: state.isConnecting,
      isUserSpeaking: state.isUserSpeaking,
      isAISpeaking: state.isAISpeaking,
      isAIThinking: state.isAIThinking,
      isResuming: state.isResuming
    },
    actualAttributes: {
      'is-connected': floatingButton.getAttribute('is-connected'),
      'is-connecting': floatingButton.getAttribute('is-connecting'),
      'is-user-speaking': floatingButton.getAttribute('is-user-speaking'),
      'is-ai-speaking': floatingButton.getAttribute('is-ai-speaking'),
      'is-ai-thinking': floatingButton.getAttribute('is-ai-thinking'),
      'is-resuming': floatingButton.getAttribute('is-resuming')
    }
  });
  
  // Highlight when AI starts speaking
  if (state.isAISpeaking) {
    console.log('🔊 [NavigationListener] AI IS SPEAKING - button should show purple!');
  }
}

// Guard against double initialization
let isInitialized = false;

// DOM tools instances (created once per page load)
let fuzzySearcher: FuzzyDOMSearcher | null = null;
let domManipulator: DOMManipulator | null = null;

/**
 * Initialize navigation tab listener
 * Sets up BroadcastChannel to receive messages from main tab
 * Banner is shown when ping/ack handshake occurs
 * 
 * NOTE: This listener is initialized on EVERY page load, even after navigation
 * because location.href causes a full page reload
 */
export function initializeNavigationListener(): void {
  // Prevent double initialization
  if (isInitialized) {
    console.log('⚠️ [NavigationListener] Already initialized, skipping...');
    return;
  }
  
  console.log('🚀 [NavigationListener] Initializing...');
  
  if (typeof window === 'undefined' || !window.BroadcastChannel) {
    console.error('❌ [NavigationListener] BroadcastChannel not supported - cross-tab features unavailable');
    return;
  }

  isInitialized = true;
  const channel = new BroadcastChannel('vowel-navigation');
  
  // Initialize DOM tools with new spoken ID system
  fuzzySearcher = new FuzzyDOMSearcher();
  domManipulator = new DOMManipulator({
    getElementById: (id: string) => fuzzySearcher?.getElementById(id) || null
  });
  
  console.log('✅ [NavigationListener] BroadcastChannel connected on channel "vowel-navigation"');
  console.log('   👂 Listening for messages from main tab...');
  console.log('   🔄 Listener will reinitialize on each page navigation');
  console.log('   🔍 Smart DOM search initialized with spoken-word IDs (e.g., "apple_banana")');

  // Check if this is a controlled tab (opened by Vowel)
  // Controlled tabs have the query parameter 'vowel_controlled=true'
  const urlParams = new URLSearchParams(window.location.search);
  const hasControlledParam = urlParams.get('vowel_controlled') === 'true';
  const hasControlledWindowName = typeof window !== 'undefined' && 
                       window.name && 
                       window.name.startsWith('vowel-content-');
  
  console.log('🔍 [NavigationListener] Checking if tab is controlled...');
  console.log('   🔖 Query param vowel_controlled:', hasControlledParam ? '✅ true' : '❌ not set');
  console.log('   📛 Window name:', window.name || '(not set)');
  console.log('   🎯 Window name matches:', hasControlledWindowName ? '✅ yes' : '❌ no');
  
  // Consider it controlled if either the query param is set OR the window name matches
  const isControlled = hasControlledParam || hasControlledWindowName;
  
  if (isControlled) {
    console.log('✅ [NavigationListener] This IS a Vowel-controlled tab');
    console.log('   🔑 Detected via:', hasControlledParam ? 'query parameter' : 'window name');
    console.log('   📍 Current URL:', window.location.href);
    
    // Mark as controlled in sessionStorage for other scripts
    sessionStorage.setItem('vowel-controlled', 'true');
    console.log('   💾 Saved to sessionStorage: vowel-controlled=true');
    
    // Send init message to main tab to announce ourselves
    console.log('   📤 Preparing to send init message to main tab...');
    const initTimestamp = Date.now();
    const initMessage = {
      type: 'init',
      windowName: window.name || 'unknown',
      url: window.location.href,
      timestamp: initTimestamp,
      requestTimestamp: initTimestamp,
      detectedVia: hasControlledParam ? 'query_param' : 'window_name'
    };
    
    console.log('   📦 Init message payload:', JSON.stringify(initMessage, null, 2));
    channel.postMessage(initMessage);
    console.log('   ✅ Init message sent successfully');
    console.log('   ⏳ Waiting for config response from main tab...');
  } else {
    console.log('ℹ️ [NavigationListener] NOT a controlled tab (normal browsing)');
    console.log('   💡 To make this a controlled tab, add query param: ?vowel_controlled=true');
  }

  // Check if a voice agent tab is active
  let hasVoiceAgent = false;
  
  window.addEventListener('load', () => {
    // Broadcast to check if voice agent exists
    channel.postMessage({ 
      type: 'check-agent',
      timestamp: Date.now()
    });
    
    // Wait for response
    const checkHandler = (event: MessageEvent) => {
      if (event.data.type === 'agent-exists') {
        hasVoiceAgent = true;
        console.log('✅ Voice agent tab is active');
      }
    };
    
    channel.addEventListener('message', checkHandler);
    
    // After timeout, check results
    setTimeout(() => {
      channel.removeEventListener('message', checkHandler);
      if (!hasVoiceAgent && !isControlled) {
        console.log('ℹ️ No voice agent detected - normal browsing mode');
      }
    }, 1000);
  });

  channel.onmessage = async (event: MessageEvent<any>) => {
    const message = event.data;
    console.log('📨 [NavigationListener] Received message from main tab:', message.type);

    try {
      // Handle config message from main tab
      if (message.type === 'config') {
        console.log('📦 [NavigationListener] Config message received from main tab');
        console.log('   ⏱️  Request timestamp:', message.requestTimestamp);
        console.log('   ⏱️  Response timestamp:', message.timestamp);
        console.log('   ⚙️  Config version:', message.config?.version);
        console.log('   ⚙️  Config features:', message.config?.features?.join(', '));
        console.log('   📊 Full config:', JSON.stringify(message.config, null, 2));
        
        // Show "Controlled by Vowel" banner when we receive config
        console.log('   🎨 Showing controlled banner...');
        showControlledBanner();
        
        // Show floating microphone button
        console.log('   🎤 Showing floating microphone button...');
        showFloatingMicButton();
        
        // Send ack back to confirm we received the config
        const ackMessage = {
          type: 'ack',
          originalType: 'config',
          timestamp: Date.now(),
          requestTimestamp: message.requestTimestamp || message.timestamp
        };
        
        console.log('   📤 Preparing ack response...');
        console.log('   📦 Ack payload:', JSON.stringify(ackMessage, null, 2));
        channel.postMessage(ackMessage);
        
        console.log('✅ [NavigationListener] Ack sent successfully');
        console.log('   🎨 Controlled banner should now be visible');
        console.log('   🎤 Floating microphone button should now be visible');
        console.log('   ✅ Handshake complete from controlled tab side');
        console.log('   🎯 Tab is now fully configured and listening for commands');
        return;
      }
      
      // Handle voice state update from main tab
      if (message.type === 'voiceStateUpdate') {
        console.log('🎤 [NavigationListener] Voice state update received from main tab');
        console.log('   📊 State:', JSON.stringify(message.state, null, 2));
        
        // Update the microphone button to mirror main tab state
        updateMicrophoneButtonState(message.state);
        return;
      }

      // Handle navigate messages with simplified format (from router.navigate())
      if (message.type === 'navigate' && message.url) {
        console.log('🧭 [NavigationListener] Navigation command received');
        console.log('   📍 Target URL:', message.url);
        console.log('   📍 Path:', message.path);
        console.log('   ⏱️  Timestamp:', new Date(message.timestamp).toISOString());
        
        // Add vowel_controlled=true query param to preserve controlled status
        const targetUrl = new URL(message.url);
        if (!targetUrl.searchParams.has('vowel_controlled')) {
          console.log('   🔖 Adding vowel_controlled=true query param to preserve controlled status');
          targetUrl.searchParams.set('vowel_controlled', 'true');
        } else {
          console.log('   🔖 Query param vowel_controlled already present');
        }
        
        const finalUrl = targetUrl.toString();
        console.log('   🔗 Final URL with query param:', finalUrl);
        console.log('   🔄 Executing navigation via location.href (page will reload)...');
        
        // Use location.href to navigate - this will cause a full page reload
        // The navigation-listener will be re-initialized on the new page
        window.location.href = finalUrl;
        
        console.log('✅ [NavigationListener] Navigation initiated');
        return;
      }

      // Handle DOM search tool
      if (message.type === 'searchElements') {
        await handleSearchElements(message.payload, channel);
        return;
      }
      
      if (message.type === 'getPageSnapshot') {
        await handleGetPageSnapshot(message.payload, channel);
        return;
      }
      
      if (message.type === 'clickElement') {
        await handleClickElement(message.payload, channel);
        return;
      }
      
      if (message.type === 'typeIntoElement') {
        await handleTypeIntoElement(message.payload, channel);
        return;
      }
      
      if (message.type === 'pressKey') {
        await handlePressKey(message.payload, channel);
        return;
      }
      
      if (message.type === 'focusElement') {
        await handleFocusElement(message.payload, channel);
        return;
      }
      
      if (message.type === 'scrollToElement') {
        await handleScrollToElement(message.payload, channel);
        return;
      }

      // Handle CrossTabMessage format (from CrossTabManager)
      const payload = message.payload;
      switch (message.type) {
        case 'addToCart':
          await handleAddToCart(payload);
          break;
        
        case 'removeFromCart':
          await handleRemoveFromCart(payload);
          break;
        
        case 'updateQuantity':
          await handleUpdateQuantity(payload);
          break;
        
        case 'getContext':
          await handleGetContext(payload, channel);
          break;
        
        default:
          console.log('ℹ️ Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  };
}

/**
 * Handle add to cart message
 */
async function handleAddToCart(payload: { productId: string; quantity: number }): Promise<void> {
  const { productId, quantity } = payload;
  console.log('🛒 Adding to cart:', productId, 'x', quantity);

  try {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: productId,
        quantity: quantity,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add to cart: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Added to cart successfully:', result);

    // Update cart UI if available
    updateCartIndicator();
  } catch (error) {
    console.error('❌ Failed to add to cart:', error);
  }
}

/**
 * Handle remove from cart message
 */
async function handleRemoveFromCart(payload: { lineItemKey: string }): Promise<void> {
  const { lineItemKey } = payload;
  console.log('🗑️ Removing from cart:', lineItemKey);

  try {
    const response = await fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: lineItemKey,
        quantity: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to remove from cart: ${response.statusText}`);
    }

    console.log('✅ Removed from cart successfully');
    updateCartIndicator();
  } catch (error) {
    console.error('❌ Failed to remove from cart:', error);
  }
}

/**
 * Handle update quantity message
 */
async function handleUpdateQuantity(payload: { lineItemKey: string; quantity: number }): Promise<void> {
  const { lineItemKey, quantity } = payload;
  console.log('🔢 Updating quantity:', lineItemKey, 'to', quantity);

  try {
    const response = await fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: lineItemKey,
        quantity: quantity,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update quantity: ${response.statusText}`);
    }

    console.log('✅ Updated quantity successfully');
    updateCartIndicator();
  } catch (error) {
    console.error('❌ Failed to update quantity:', error);
  }
}


/**
 * Handle get context message (send back page context to main tab)
 */
async function handleGetContext(payload: any, channel: BroadcastChannel): Promise<void> {
  console.log('📄 [NavigationListener] Getting page context');
  console.log('   📦 Request payload:', payload);

  try {
    const pageType = getPageType();
    console.log('   📄 Page type:', pageType);
    
    // Extract page context
    const products = extractProducts();
    const collections = extractCollections();
    
    const context = {
      url: window.location.href,
      pathname: window.location.pathname,
      title: document.title,
      type: pageType,
      products: products,
      collections: collections,
    };

    console.log('   📊 Context extracted:');
    console.log('      - URL:', context.url);
    console.log('      - Page type:', context.type);
    console.log('      - Products found:', context.products.length);
    console.log('      - Collections found:', context.collections.length);

    // Send response back
    const response = {
      type: 'contextResponse',
      payload: context,
      timestamp: Date.now(),
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    channel.postMessage(response);

    console.log('✅ [NavigationListener] Sent context response with', products.length, 'products');
  } catch (error) {
    console.error('❌ [NavigationListener] Failed to get context:', error);
  }
}

/**
 * Determine page type based on URL and content
 */
function getPageType(): string {
  const pathname = window.location.pathname;
  
  if (pathname === '/' || pathname === '/index') {
    return 'home';
  } else if (pathname.startsWith('/products/')) {
    return 'product';
  } else if (pathname.startsWith('/collections/')) {
    return 'collection';
  } else if (pathname.startsWith('/cart')) {
    return 'cart';
  } else if (pathname.startsWith('/pages/')) {
    return 'page';
  } else {
    return 'other';
  }
}

/**
 * Extract product information from page
 * Enhanced to extract product handles and URLs for navigation
 */
function extractProducts(): Array<{ id: string; title: string; price?: string; handle?: string; url?: string; image?: string }> {
  const products: Array<{ id: string; title: string; price?: string; handle?: string; url?: string; image?: string }> = [];
  console.log('🔍 [NavigationListener] Extracting products from page...');
  
  // Try various selectors for product cards/links
  const selectors = [
    'a[href*="/products/"]', // Links to product pages
    '[data-product-id]',
    '.product-card',
    '.product-item',
    '.product',
    '[data-product]'
  ];
  
  const processedUrls = new Set<string>();
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`   🔎 Trying selector "${selector}": found ${elements.length} elements`);
    
    elements.forEach(element => {
      try {
        // Extract product URL and handle
        let url = '';
        let handle = '';
        
        if (element.tagName === 'A') {
          url = element.getAttribute('href') || '';
        } else {
          const link = element.querySelector('a[href*="/products/"]');
          url = link?.getAttribute('href') || '';
        }
        
        // Skip if we already processed this URL
        if (url && processedUrls.has(url)) {
          return;
        }
        
        // Extract handle from URL
        const handleMatch = url.match(/\/products\/([^?#]+)/);
        if (handleMatch) {
          handle = handleMatch[1];
        }
        
        // Extract other product info
      const id = element.getAttribute('data-product-id') || 
                  element.querySelector('[data-product-id]')?.getAttribute('data-product-id') ||
                  handle;
        
        const title = element.querySelector('h1, h2, h3, h4, .product-title, [data-product-title], .title')?.textContent?.trim() ||
                     element.querySelector('[class*="title"]')?.textContent?.trim() ||
                     element.textContent?.trim().split('\n')[0]?.trim();
        
        const price = element.querySelector('.price, [data-price], [class*="price"]')?.textContent?.trim();
        
        const img = element.querySelector('img');
        const image = img?.src || img?.getAttribute('data-src') || undefined;
        
        if (id && title && handle) {
          products.push({ 
            id, 
            title, 
            price,
            handle,
            url: url.startsWith('http') ? url : window.location.origin + url,
            image
          });
          if (url) processedUrls.add(url);
        }
      } catch (error) {
        console.warn('Failed to extract product from element:', error);
      }
    });
    
    if (products.length > 0) {
      console.log(`   ✅ Extracted ${products.length} products`);
      break;
    }
  }
  
  if (products.length === 0) {
    console.warn('   ⚠️ No products found on page');
  }
  
  return products;
}

/**
 * Extract collection information from page
 */
function extractCollections(): Array<{ handle: string; title: string }> {
  const collections: Array<{ handle: string; title: string }> = [];
  
  // Try to extract from collection links
  const links = document.querySelectorAll('a[href*="/collections/"]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      const match = href.match(/\/collections\/([^/?#]+)/);
      if (match) {
        const handle = match[1];
        const title = link.textContent?.trim() || handle;
        if (!collections.find(c => c.handle === handle)) {
          collections.push({ handle, title });
        }
      }
    }
  });
  
  return collections;
}

/**
 * Update cart indicator (count bubble, etc.)
 */
function updateCartIndicator(): void {
  // Fetch current cart state
  fetch('/cart.js')
    .then(response => response.json())
    .then(cart => {
      const count = cart.item_count;
      console.log('🛒 Cart count:', count);
      
      // Update cart count indicators (common selectors)
      const indicators = document.querySelectorAll(
        '.cart-count, [data-cart-count], #cart-count, .cart-item-count'
      );
      
      indicators.forEach(indicator => {
        indicator.textContent = String(count);
        
        // Show/hide based on count
        if (count === 0) {
          indicator.classList.add('hidden');
        } else {
          indicator.classList.remove('hidden');
        }
      });
    })
    .catch(error => {
      console.error('❌ Failed to update cart indicator:', error);
    });
}

/**
 * DOM Search Tool Handler - Smart Levenshtein search with spoken IDs
 */

/**
 * Handle search elements by term
 * Uses Levenshtein distance to search across all element properties
 * Returns results with spoken-word IDs (e.g., "apple_banana")
 */
async function handleSearchElements(payload: any, channel: BroadcastChannel): Promise<void> {
  console.log('🔍 [NavigationListener] Searching for elements');
  console.log('   📦 Query:', payload.query);
  console.log('   📦 Options:', payload.options);

  try {
    if (!fuzzySearcher) {
      throw new Error('Fuzzy DOM searcher not initialized');
    }

    const results = fuzzySearcher.search(payload.query, payload.options || {});

    // Log what we're sending back (first result)
    if (results.elements.length > 0) {
      console.log('   📤 Sending back first result:');
      console.log('      ID:', results.elements[0].id);
      console.log('      Tag:', results.elements[0].tag);
      console.log('      Similarity:', results.elements[0].matchScore.toFixed(2));
      console.log('      Matched:', `${results.elements[0].matchedField}="${results.elements[0].matchedValue}"`);
    }

    // Send response back
    channel.postMessage({
      type: 'searchElementsResponse',
      payload: results,
      timestamp: Date.now(),
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    console.log(`✅ [NavigationListener] Found ${results.elements.length} elements matching "${payload.query}"`);
  } catch (error) {
    console.error('❌ [NavigationListener] Failed to search elements:', error);
    channel.postMessage({
      type: 'searchElementsResponse',
      payload: { error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle get page snapshot request
 * Returns compressed view of all interactive/visible elements
 */
async function handleGetPageSnapshot(_payload: any, channel: BroadcastChannel): Promise<void> {
  console.log('📸 [NavigationListener] Get page snapshot request');

  try {
    if (!fuzzySearcher) {
      throw new Error('Fuzzy DOM searcher not initialized');
    }

    const snapshot = fuzzySearcher.getCompressedPageSnapshot();
    
    // Count elements in snapshot (lines - header)
    const lines = snapshot.split('\n');
    const elementCount = Math.max(0, lines.length - 1);

    console.log(`✅ [NavigationListener] Generated snapshot with ${elementCount} elements`);

    // Send response back
    channel.postMessage({
      type: 'pageSnapshotResponse',
      payload: {
        snapshot,
        elementCount,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    console.log('   📤 Snapshot sent to main tab');
  } catch (error) {
    console.error('❌ [NavigationListener] Failed to get page snapshot:', error);
    channel.postMessage({
      type: 'pageSnapshotResponse',
      payload: { error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle click element request (by spoken ID)
 */
async function handleClickElement(payload: any, channel: BroadcastChannel): Promise<void> {
  console.log('🖱️ [NavigationListener] Click element request:', payload.id);

  try {
    if (!domManipulator) {
      throw new Error('DOM manipulator not initialized');
    }

    const result = await domManipulator.clickElement(payload);

    channel.postMessage({
      type: 'domActionResponse',
      payload: result,
      timestamp: Date.now(),
    });

    console.log('✅ [NavigationListener] Click result:', result.success);
  } catch (error) {
    console.error('❌ [NavigationListener] Click failed:', error);
    channel.postMessage({
      type: 'domActionResponse',
      payload: { success: false, error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle type into element request (by spoken ID)
 */
async function handleTypeIntoElement(payload: any, channel: BroadcastChannel): Promise<void> {
  console.log('⌨️ [NavigationListener] Type into element request:', payload.id);

  try {
    if (!domManipulator) {
      throw new Error('DOM manipulator not initialized');
    }

    const result = await domManipulator.typeIntoElement(payload);

    channel.postMessage({
      type: 'domActionResponse',
      payload: result,
      timestamp: Date.now(),
    });

    console.log('✅ [NavigationListener] Type result:', result.success);
  } catch (error) {
    console.error('❌ [NavigationListener] Type failed:', error);
    channel.postMessage({
      type: 'domActionResponse',
      payload: { success: false, error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle press key request
 */
async function handlePressKey(payload: any, channel: BroadcastChannel): Promise<void> {
  console.log('⌨️ [NavigationListener] Press key request:', payload.key);

  try {
    if (!domManipulator) {
      throw new Error('DOM manipulator not initialized');
    }

    const result = await domManipulator.pressKey(payload);

    channel.postMessage({
      type: 'domActionResponse',
      payload: result,
      timestamp: Date.now(),
    });

    console.log('✅ [NavigationListener] Press key result:', result.success);
  } catch (error) {
    console.error('❌ [NavigationListener] Press key failed:', error);
    channel.postMessage({
      type: 'domActionResponse',
      payload: { success: false, error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle focus element request (by spoken ID)
 */
async function handleFocusElement(payload: any, channel: BroadcastChannel): Promise<void> {
  console.log('🎯 [NavigationListener] Focus element request:', payload.id);

  try {
    if (!domManipulator) {
      throw new Error('DOM manipulator not initialized');
    }

    const result = await domManipulator.focusElement(payload);

    channel.postMessage({
      type: 'domActionResponse',
      payload: result,
      timestamp: Date.now(),
    });

    console.log('✅ [NavigationListener] Focus result:', result.success);
  } catch (error) {
    console.error('❌ [NavigationListener] Focus failed:', error);
    channel.postMessage({
      type: 'domActionResponse',
      payload: { success: false, error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle scroll to element request (by spoken ID)
 */
async function handleScrollToElement(payload: any, channel: BroadcastChannel): Promise<void> {
  console.log('📜 [NavigationListener] Scroll to element request:', payload.id);

  try {
    if (!domManipulator) {
      throw new Error('DOM manipulator not initialized');
    }

    const result = await domManipulator.scrollToElement(payload);

    channel.postMessage({
      type: 'domActionResponse',
      payload: result,
      timestamp: Date.now(),
    });

    console.log('✅ [NavigationListener] Scroll result:', result.success);
  } catch (error) {
    console.error('❌ [NavigationListener] Scroll failed:', error);
    channel.postMessage({
      type: 'domActionResponse',
      payload: { success: false, error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
    });
  }
}

// Note: Auto-initialization removed. 
// The navigation listener is now explicitly initialized by VowelWebComponentWrapper
// when it detects the tab is controlled (has ?vowel_controlled=true query param).
// 
// For standalone usage (e.g., in Shopify themes without web component),
// you must manually call initializeNavigationListener() in your theme code.

