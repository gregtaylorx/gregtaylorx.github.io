    // ── Per-app config (public values — anon keys are safe to ship here) ────
    var APP_CONFIGS = {
      visastay: {
        name:         'VisaStay',
        icon:         '✈️',
        supabaseUrl:  'https://aubnhaktbxapnhtwmcyj.supabase.co',
        supabaseAnon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Ym5oYWt0YnhhcG5odHdtY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Njg4NDksImV4cCI6MjA5MzQ0NDg0OX0.Kg5v1Fm712sFxiSsNMPMnXrxGAFcCBwL2K8IKIwiSWU',
        // SCHEME must match AndroidManifest <data android:scheme> + iOS CFBundleURLSchemes
        scheme:       'com.digitalnomadessentials.visastay',
        // PACKAGE is the Android applicationId (may differ from scheme)
        package:      'com.digitalnomadessentials.digital_nomad_essentials',
      },
      tripgear: {
        name:         'TripGear',
        icon:         '🧳',
        supabaseUrl:  'https://jfdndbrufotkzsvbcqxa.supabase.co',
        supabaseAnon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZG5kYnJ1Zm90a3pzdmJjcXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3ODI4NjYsImV4cCI6MjA5ODM1ODg2Nn0.wwFvq0akadhFkarO14BWl9vxT-Xl9NdoLqCsXBYXiLg',
        scheme:       'com.digitalnomadessentials.packlite',
        package:      'com.digitalnomadessentials.packlite',
      },
    };

    var cfg; // set in init() once app param is known

    function buildDeepLink(path, queryStr) {
      var isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        return 'intent://' + path + '?' + queryStr
             + '#Intent;scheme=' + cfg.scheme + ';package=' + cfg.package + ';end';
      }
      return cfg.scheme + '://' + path + '?' + queryStr;
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
      render(cfg.icon, 'Email Confirmed!',
        'Your email is confirmed. Open ' + cfg.name + ' and sign in with your email and password.',
        link, 'Open ' + cfg.name,
        cfg.name + ' must be installed on this device.');
    }

    function showAlreadyDone() {
      var link = buildDeepLink('login-callback', 'type=confirmed');
      render(cfg.icon, 'Email Confirmed',
        'This link was already used — usually because your inbox opened it ' +
        'automatically, which confirms your account. Open ' + cfg.name + ' and sign in. ' +
        'If sign-in says your email isn\'t verified, tap "Resend Email" in the app.',
        link, 'Open ' + cfg.name, null);
    }

    function showRecovery(qs) {
      var link = buildDeepLink('login-callback', qs);
      render('🔑', 'Reset Your Password',
        'Tap below to open ' + cfg.name + ' and set your new password.',
        link, 'Open ' + cfg.name,
        cfg.name + ' must be installed on this device.');
    }

    function showRecoveryExpired() {
      render('⚠️', 'Reset Link Expired',
        'This password reset link has expired or was already used. ' +
        'Open ' + cfg.name + ', tap "Forgot Password", and request a new one.',
        null, null, null);
    }

    async function init() {
      var query = new URLSearchParams(window.location.search);
      var hash  = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      // Select app config — defaults to visastay so existing VisaStay email
      // links (which have no ?app= param) continue to work unchanged.
      var appParam = query.get('app') || 'visastay';
      cfg = APP_CONFIGS[appParam] || APP_CONFIGS['visastay'];
      document.title = cfg.name;

      var tokenHash   = query.get('token_hash');
      var type        = query.get('type') || hash.get('type') || '';
      var code        = query.get('code');
      var errorDesc   = query.get('error_description') || hash.get('error_description');
      var errorCode   = query.get('error_code') || hash.get('error_code');

      // ── Recovery (password reset) — legacy code/token path ──────────────
      if (type === 'recovery' && code) {
        showRecovery('code=' + encodeURIComponent(code) + '&type=recovery');
        return;
      }

      // ── token_hash flow — POST verifyOtp, scanner-safe ──────────────────
      if (tokenHash) {
        var isRecovery = (type === 'recovery');
        try {
          var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnon, {
            auth: { detectSessionInUrl: false, persistSession: false }
          });
          var result = await client.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || 'email'
          });
          if (result.error) {
            if (isRecovery) showRecoveryExpired();
            else showAlreadyDone();
          } else if (isRecovery) {
            var s = (result.data && result.data.session) || {};
            showRecovery(
              'access_token=' + encodeURIComponent(s.access_token || '') +
              '&refresh_token=' + encodeURIComponent(s.refresh_token || '') +
              '&type=recovery');
          } else {
            showConfirmed();
          }
        } catch (e) {
          if (isRecovery) showRecoveryExpired();
          else showAlreadyDone();
        }
        return;
      }

      // ── Legacy/fallback: code or implicit token ──────────────────────────
      if (code) {
        var link = buildDeepLink('login-callback',
          'code=' + encodeURIComponent(code) + '&type=' + encodeURIComponent(type || 'signup'));
        render(cfg.icon, 'Email Confirmed!',
          'Your email is confirmed. Tap below to open ' + cfg.name + '.',
          link, 'Open ' + cfg.name, cfg.name + ' must be installed on this device.');
        return;
      }

      showAlreadyDone();
    }

    if (window.supabase) {
      init();
    } else {
      window.addEventListener('DOMContentLoaded', init);
    }
