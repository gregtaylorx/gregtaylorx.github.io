// Pass-through for Supabase email links (password reset now; email
// confirmation later). Forwards ONLY the one-time token_hash + type to the
// app, which verifies it itself. No network calls, no sessions, no tokens.
// Page: <body data-app="visastay|tripgear|zonelink">. Used by new app builds
// via resetPasswordForEmail(redirectTo: https://privacy.headfirstservices.com/<app>-handoff.html).
(function () {
  var APPS = {
    visastay: { name: 'VisaStay', scheme: 'com.digitalnomadessentials.visastay',
                pkg: 'com.digitalnomadessentials.digital_nomad_essentials' },
    tripgear: { name: 'TripGear', scheme: 'com.digitalnomadessentials.packlite',
                pkg: 'com.digitalnomadessentials.packlite' },
    zonelink: { name: 'ZoneLink', scheme: 'com.digitalnomadessentials.zonelink',
                pkg: 'com.digitalnomadessentials.zonelink' }
  };
  var TYPES = ['recovery', 'email', 'signup', 'email_change', 'magiclink', 'invite'];

  var app = APPS[document.body.getAttribute('data-app')];
  var q = new URLSearchParams(location.search);
  var th = q.get('token_hash') || '';
  var type = q.get('type') || '';

  var title = document.getElementById('title');
  var msg = document.getElementById('msg');
  var btn = document.getElementById('open');

  function fail(t, m) { title.textContent = t; msg.textContent = m; btn.style.display = 'none'; }

  if (!app) { fail('Link problem', 'This link is not valid.'); return; }
  document.title = app.name;
  if (!/^[A-Za-z0-9_-]{8,256}$/.test(th) || TYPES.indexOf(type) === -1) {
    fail('Link expired or incomplete',
      'Open ' + app.name + ' and request a new email.');
    return;
  }

  var qs = 'token_hash=' + encodeURIComponent(th) + '&type=' + encodeURIComponent(type) + '&flow=handoff';
  var link = /Android/i.test(navigator.userAgent)
    ? 'intent://login-callback?' + qs + '#Intent;scheme=' + app.scheme + ';package=' + app.pkg + ';end'
    : app.scheme + '://login-callback?' + qs;

  title.textContent = type === 'recovery' ? 'Reset your password' : 'Confirm your email';
  msg.textContent = 'Tap below to continue in ' + app.name + '. Use the same phone you requested this on.';
  btn.textContent = 'Open ' + app.name;
  btn.href = link;
  btn.style.display = '';
  document.getElementById('note').textContent =
    app.name + ' must be installed and up to date on this phone.';
})();
