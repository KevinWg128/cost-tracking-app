# Implement Google OAuth Sign-in
## Firebase makes it straightforward to integrate Google Sign-in. You'll typically use GoogleAuthProvider and signInWithPopup (or signInWithRedirect for mobile-friendlier flows)

```typescript
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase'; // Your initialized auth instance

const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    // This gives you a Google Access Token. You can use it to access the Google API.
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    // The signed-in user info.
    const user = result.user;
    console.log("Google user:", user, "Token:", token);
  } catch (error: any) {
    console.error("Error signing in with Google:", error.message);
    // Handle specific errors, e.g., 'auth/popup-closed-by-user'
  }
};

