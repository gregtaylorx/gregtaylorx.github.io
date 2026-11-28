    // ── Config (public values — safe to ship in a static page) ──────────────
    // ZoneLink_1 — its own Supabase project, separate from VisaStay's Nomad_1.
    var SUPABASE_URL  = 'https://ydjutilhajawhubewoqd.supabase.co';
    var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkanV0aWxoYWphd2h1YmV3b3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjA5MjUsImV4cCI6MjA5ODczNjkyNX0.POhhNXVXeAJxXpVnRR8p_9ZbhCyMVWZFsKTr7JOE8ig';

    // SCHEME must match the URL scheme registered in the app
    // (AndroidManifest <data android:scheme>) — the ZoneLink scheme, NOT
    // the Android applicationId. PACKAGE is the Android app id, used only
    // to target the intent on Android.
    var SCHEME  = 'com.digitalnomadessentials.zonelink';
    var PACKAGE = 'com.digitalnomadessentials.zonelink';

    function buildDeepLink(path, queryStr) {
      var isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        return 'intent://' + path + '?' + queryStr
             + '#Intent;scheme=' + SCHEME + ';package=' + PACKAGE + ';end';
      }
      return SCHEME + '://' + path + '?' + queryStr;
    }

    function render(icon, title, body, href, btnLabel, note) {
      document.getElementById('card').innerHTML =
        '<div class="icon">' + icon + '</div>' +
        '<h1>' + title + '</h1>' +
        '<p>' + body + '</p>' +
        (href ? '<a href="' + href + '" class="btn">' + btnLabel + '</a>' : '') +
        (note ? '<p class="note">' + note + '</p>' : '');
    }

    function showConfirmed() {
      var link = buildDeepLink('login-callback', 'type=confirmed');
      render('✅', 'Email Confirmed!',
        'Your email is confirmed. Open ZoneLink and sign in with your email and password.',
        link, 'Open ZoneLink',
        'ZoneLink must be installed on this device.');
    }

    // Used for already-consumed / expired links. Because an email security
    // scanner may have opened the link first (which already confirmed the
    // account), we guide the user to sign in rather than implying breakage.
    function showAlreadyDone() {
      var link = buildDeepLink('login-callback', 'type=confirmed');
      render('✅', 'Email Confirmed',
        'This link was already used — usually because your inbox opened it ' +
        'automatically, which confirms your account. Open ZoneLink and sign in.',
        link, 'Open ZoneLink', null);
    }

    function showRecovery(qs) {
      var link = buildDeepLink('login-callback', qs);
      render('🔑', 'Reset Your Password',
        'Tap below to open ZoneLink and set your new password.',
        link, 'Open ZoneLink',
        'ZoneLink must be installed on this device.');
    }

    // Genuinely expired / already-used recovery token.
    function showRecoveryExpired() {
      render('⚠️', 'Reset Link Expired',
        'This password reset link has expired or was already used. ' +
        'Open ZoneLink, tap “Forgot password?”, and request a new one.',
        null, null, null);
    }

    // Security review 2026-11-17 (item 2): this page NEVER forwards
    // access/refresh tokens to the app any more. Password reset forwards the
    // one-time token_hash + the account email; the app shows
    // "Continue as <email>?" and only then verifies it. PKCE `code` links are
    // forwarded as-is (they only work on the phone that requested them).
    // Signup confirmation is still verified right here and needs no app hand-off.
    async function init() {
      var query = new URLSearchParams(window.location.search);
      var hash  = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      var tokenHash = query.get('token_hash');
      var type      = query.get('type') || hash.get('type') || '';
      var code      = query.get('code');
      var email     = query.get('email') || '';

      // ── Password reset ──────────────────────────────────────────────────
      if (type === 'recovery') {
        if (tokenHash && email) {
          showRecovery('token_hash=' + encodeURIComponent(tokenHash) +
                       '&type=recovery&email=' + encodeURIComponent(email));
        } else if (code) {
          showRecovery('code=' + encodeURIComponent(code) + '&type=recovery');
        } else {
          // Implicit-token or email-less links are no longer accepted.
          showRecoveryExpired();
        }
        return;
      }

      // ── Signup confirmation: verify here (POST, so GET-only email scanners
      //    can't consume it). Nothing is handed to the app. ──
      if (tokenHash) {
        try {
          var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
            auth: { detectSessionInUrl: false, persistSession: false }
          });
          var result = await client.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || 'email'
          });
          if (result.error) showAlreadyDone();
          else showConfirmed();
        } catch (e) {
          showAlreadyDone();
        }
        return;
      }

      // ── Legacy confirmation links: the account is already confirmed by the
      //    time Supabase redirects here; just tell the user to sign in. ──
      if (code || hash.get('access_token')) {
        showConfirmed();
        return;
      }

      showAlreadyDone();
    }

    if (window.supabase) {
      init();
    } else {
      window.addEventListener('DOMContentLoaded', init);
    }
