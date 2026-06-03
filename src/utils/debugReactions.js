// Debug script for testing Firebase reactions
// Run this in browser console to test Firebase reactions
// Copy and paste this entire function into your browser console, then call testFirebaseReactions()

window.testFirebaseReactions = async function() {
  console.log('=== FIREBASE REACTIONS DEBUG TEST ===');

  try {
    // Check if Firebase auth is working
    const currentUser = window.firebaseAuth?.currentUser;
    console.log('1. Current user:', currentUser ? { uid: currentUser.uid, email: currentUser.email } : 'Not logged in');

    if (!currentUser) {
      console.error('❌ User not logged in - reactions require authentication');
      return;
    }

    // Test reading reactions
    console.log('2. Testing reaction reads...');
    const { collection, getDocs, query, where } = window.firebaseFirestore;

    // Try to read any existing reactions
    const reactionsQuery = query(collection(window.firebaseDB, 'reactions'));
    const snapshot = await getDocs(reactionsQuery);
    console.log('3. Existing reactions count:', snapshot.docs.length);

    if (snapshot.docs.length > 0) {
      console.log('4. Sample reactions:');
      snapshot.docs.slice(0, 3).forEach(doc => {
        console.log('   -', doc.id, doc.data());
      });
    }

    // Test writing a reaction
    console.log('5. Testing reaction write...');
    const { addDoc } = window.firebaseFirestore;

    const testReaction = {
      figureId: 'test-figure-id',
      ownerId: 'test-owner-id',
      userId: currentUser.uid,
      displayName: currentUser.displayName || 'Test User',
      reactionType: 'appreciate',
      timestamp: Date.now()
    };

    const docRef = await addDoc(collection(window.firebaseDB, 'reactions'), testReaction);
    console.log('✅ Test reaction created successfully:', docRef.id);

    // Read back the test reaction
    const { doc, getDoc } = window.firebaseFirestore;
    const testDoc = await getDoc(doc(window.firebaseDB, 'reactions', docRef.id));
    console.log('6. Test reaction data:', testDoc.data());

    // Clean up - delete the test reaction
    const { deleteDoc } = window.firebaseFirestore;
    await deleteDoc(doc(window.firebaseDB, 'reactions', docRef.id));
    console.log('✅ Test reaction cleaned up');

    console.log('=== FIREBASE REACTIONS TEST COMPLETED ===');
    console.log('✅ Firebase reactions are working correctly!');

  } catch (error) {
    console.error('❌ Firebase reactions test failed:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
  }
};

console.log('📝 Debug function loaded. Run: testFirebaseReactions()');