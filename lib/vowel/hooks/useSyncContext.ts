/**
 * @fileoverview Sync Context Hook - Automatically sync context with Vowel client
 * 
 * This hook automatically updates the Vowel client's context whenever the provided
 * context value changes. It's useful for keeping the AI aware of dynamic app state
 * without manually calling updateContext.
 * 
 * @example
 * ```tsx
 * function ProductPage({ productId }: { productId: string }) {
 *   const product = useProduct(productId);
 *   
 *   // Automatically sync product context to Vowel
 *   useSyncContext({
 *     page: 'product',
 *     productId: product.id,
 *     productName: product.name,
 *     price: product.price,
 *   });
 *   
 *   return <div>{product.name}</div>;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * function CheckoutPage() {
 *   const cart = useCart();
 *   
 *   // Sync cart context, clear on unmount
 *   useSyncContext({
 *     page: 'checkout',
 *     cartTotal: cart.total,
 *     itemCount: cart.items.length,
 *   });
 *   
 *   return <div>Checkout</div>;
 * }
 * ```
 * 
 * @module @vowel.to/client/hooks
 * @author vowel.to
 * @license MIT
 */

import { useEffect, useRef } from 'react';
import { useVowel } from '../components/VowelProviderSimple';

/**
 * Hook that automatically syncs context to the Vowel client
 * 
 * Updates the Vowel client's context whenever the provided context value changes.
 * The context is automatically sent to the AI via session.update if a session is active.
 * 
 * @param context - Context object to sync with Vowel client. Use null to clear context.
 *                  Changes are detected via deep comparison of JSON.stringify result.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [user, setUser] = useState(null);
 *   
 *   // Automatically sync user context
 *   useSyncContext(user ? { userId: user.id, userName: user.name } : null);
 *   
 *   return <div>Hello {user?.name}</div>;
 * }
 * ```
 */
export function useSyncContext(context: Record<string, unknown> | null): void {
  const { updateContext } = useVowel();
  const previousContextRef = useRef<string | null>(null);
  const updateContextRef = useRef(updateContext);

  // Keep updateContext ref current
  useEffect(() => {
    updateContextRef.current = updateContext;
  }, [updateContext]);

  useEffect(() => {
    // Serialize current context for comparison
    const currentContextStr = context ? JSON.stringify(context) : null;

    console.log("[useSyncContext] 📝 Updating context:", context);

    // Only update if context actually changed
    if (currentContextStr !== previousContextRef.current) {
      previousContextRef.current = currentContextStr;
      updateContext(context);
    }
  }, [context, updateContext]);

  // WE NEVER NEED TO CLEANUP THIS HOOK - WE ALWAYS WANT THE LAST GOOD CONTEXT
}
