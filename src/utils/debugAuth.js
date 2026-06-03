// Debug script for testing user authentication and React event handlers
// Run this in browser console to debug authentication and event handler issues
// Copy and paste this entire function into your browser console, then call debugUserAuth()

window.debugUserAuth = function() {
  console.log('=== USER AUTHENTICATION DEBUG ===');

  try {
    // 1. Check Firebase Auth
    const firebaseUser = window.firebaseAuth?.currentUser;
    console.log('1. Firebase Auth User:', firebaseUser ? {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName
    } : 'Not authenticated');

    // 2. Check App's currentUser state
    console.log('2. App currentUser state:', window.currentUser || 'Not found in global scope');

    // 3. Check React component state (try to access it via React DevTools)
    const reactFiber = document.querySelector('#root')?._reactInternalFiber ||
                      document.querySelector('#root')?._reactInternalInstance ||
                      document.querySelector('#root')?.__reactInternalInstance;

    console.log('3. React Fiber available:', !!reactFiber);

    // 4. Check for React event listeners on buttons
    const reactionButtons = document.querySelectorAll('button:contains("Appreciate"), button:contains("Love"), button:contains("Fire")');
    console.log('4. Found reaction buttons:', reactionButtons.length);

    reactionButtons.forEach((button, index) => {
      const events = getEventListeners ? getEventListeners(button) : 'DevTools required';
      console.log(`   Button ${index + 1} (${button.textContent.trim()}):`, {
        hasOnClick: !!button.onclick,
        eventListeners: events,
        disabled: button.disabled,
        className: button.className
      });
    });

    // 5. Try to find buttons with text content instead
    const allButtons = Array.from(document.querySelectorAll('button'));
    const appreciateButtons = allButtons.filter(btn => btn.textContent.includes('Appreciate'));
    const loveButtons = allButtons.filter(btn => btn.textContent.includes('Love'));
    const fireButtons = allButtons.filter(btn => btn.textContent.includes('Fire'));

    console.log('5. Reaction buttons found:');
    console.log('   Appreciate buttons:', appreciateButtons.length);
    console.log('   Love buttons:', loveButtons.length);
    console.log('   Fire buttons:', fireButtons.length);

    // 6. Test clicking the first available reaction button
    const testButton = appreciateButtons[0] || loveButtons[0] || fireButtons[0];
    if (testButton) {
      console.log('6. Testing button click on:', testButton.textContent.trim());
      console.log('   Button properties:', {
        disabled: testButton.disabled,
        style: testButton.style.cssText,
        onclick: !!testButton.onclick
      });

      // Create a test click event
      console.log('   Simulating click...');
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });

      testButton.dispatchEvent(clickEvent);
      console.log('   Click event dispatched');
    } else {
      console.log('6. No reaction buttons found to test');
    }

    // 7. Check localStorage and sessionStorage for any user data
    console.log('7. Storage check:');
    console.log('   localStorage keys:', Object.keys(localStorage));
    console.log('   sessionStorage keys:', Object.keys(sessionStorage));

    const authKeys = Object.keys(localStorage).filter(key =>
      key.includes('firebase') || key.includes('user') || key.includes('auth')
    );
    console.log('   Auth-related keys:', authKeys);

    // 8. Try to access React component props/state if possible
    try {
      const rootElement = document.querySelector('#root');
      const reactInstance = rootElement?._reactInternalInstance ||
                           rootElement?.__reactInternalInstance ||
                           rootElement?.key;

      console.log('8. React root element found:', !!rootElement);
      console.log('   React instance available:', !!reactInstance);
    } catch (e) {
      console.log('8. Could not access React internals:', e.message);
    }

    console.log('=== DEBUG COMPLETE ===');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
};

console.log('📝 Auth debug function loaded. Run: debugUserAuth()');