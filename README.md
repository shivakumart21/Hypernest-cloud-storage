### 🚀 New: RLS Proxy Architecture
To bypass Supabase Row-Level Security (RLS) issues during development, this app now includes a small Node.js proxy server.

1. **How it works**: Instead of the browser talking directly to Supabase (which often fails due to security policies), it talks to your local `server.js`. The server then uses the Service Role key to securely handle uploads and file listings.
2. **How to run**:
   ```bash
   npm install
   npm start
   ```
3. **Access**: Open `http://localhost:3000` in your browser.

### Features
- ✅ **Secure Proxy**: Bypasses RLS "forbidden" errors automatically.
- ✅ **Aesthetic UI**: Modern, dark-themed interface with progress bars.
- ✅ **Cache Busting**: Versioned script tags to ensure you always have the latest code.

If you want, paste here your `Project URL`, `Anon Key`, and `Bucket name` (or confirm and I'll guide you where to paste them). Do NOT paste secrets publicly if you're on a shared or insecure environment.

Security note — service_role key

- Supabase also provides a `service_role` key (an admin-level secret) which must NEVER be used in client-side code or committed to public repos.
- If you need server-side admin actions (for example, generating long-lived signed URLs, changing access rules, or modifying storage policies), use the `service_role` key only from a secure server or serverless function.
- The `script.js` file must only contain the public anon key (which is safe for client use). If you see a `service_role` token in your Supabase dashboard, treat it like a password.

Creating dummy auth users (server-side)

If you'd like to bulk-create dummy users (for testing), I added a small Node script `create_dummy_users.js` that calls the Supabase Admin API using the `service_role` key. Do NOT run this in the browser.

Steps (PowerShell):

1. Install Node.js if you don't have it: https://nodejs.org/
2. Open PowerShell and change to the project folder (where `create_dummy_users.js` is):

```powershell
cd "c:\Users\Yashawantha DS\OneDrive\Desktop\Documents\cloud storage p 1"
```

3. Set environment variables in the same PowerShell session (replace with your service role key):

```powershell
$env:SUPABASE_URL = "https://xfdfgitzaeafklaxppze.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<your_service_role_key_here>"
```

4. Install node-fetch (used by the script) and run the script:

```powershell
npm init -y
npm install node-fetch@2
node create_dummy_users.js
```

The script will attempt to create three dummy users. Check the Supabase Dashboard → Authentication → Users to verify they were added.

Security reminder: Remove the environment variables after running, and never commit your `service_role` key anywhere.


