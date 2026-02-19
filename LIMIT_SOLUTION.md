# Supabase Error: 429 Email Rate Limit Exceeded

The logs show you hit the hourly email limit for the free tier.

**Solution:**
1. Go to your **Supabase Dashboard**
2. **Authentication** > **Providers** > **Email**
3. Turn **OFF** "Confirm email"
4. Save

This allows unlimited signups for testing without sending emails.
